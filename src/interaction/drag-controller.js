import * as THREE from 'three';

const DRAG_LIMITS = Object.freeze({
  minX: -1.38,
  maxX: 1.38,
  minY: 1.12,
  maxY: 1.92,
  minZ: -2.02,
  maxZ: -0.72
});

export function createDragController({ laboratory, hud, handTracker, onInteraction }) {
  const raycaster = new THREE.Raycaster();
  const selectableRoots = [
    ...laboratory.pieces.values(),
    ...hud.getInteractiveObjects()
  ];
  let activeDrag = null;

  function update() {
    handTracker.getStates().forEach((hand) => {
      if (!hand.tracking) {
        hand.currentHit = null;
        hand.currentHitPoint = null;
        hand.pointer.update({ visible: false });
        if (activeDrag?.handId === hand.id) cancelActiveDrag('Se perdió el seguimiento de la mano.');
        return;
      }

      if (activeDrag?.handId === hand.id) {
        updateDrag(hand);
        hand.currentHit = activeDrag.piece;
        hand.currentHitPoint = null;
        hand.pointer.update({
          origin: hand.pointerOrigin,
          direction: hand.pointerDirection,
          visible: true,
          hit: true
        });
        return;
      }

      const intersection = findIntersection(hand);
      const entity = intersection ? resolveSelectable(intersection.object) : null;
      updateHover(hand, entity, intersection?.point || null);
    });
  }

  function beginSelection(hand) {
    if (activeDrag || !hand.currentHit) return;

    const entity = getInteractionRoot(hand.currentHit);
    if (!entity) return;

    if (entity.userData.interactionCategory === 'button') {
      onInteraction?.({ type: 'button-press', hand, action: entity.userData.action });
      return;
    }

    if (entity.userData.entityType !== 'piece' || entity.userData.state !== 'available') return;

    const offset = new THREE.Vector3().subVectors(entity.position, hand.pinchPoint);
    activeDrag = {
      handId: hand.id,
      piece: entity,
      offset,
      originPosition: entity.position.clone(),
      originRotation: entity.rotation.clone(),
      nextPosition: new THREE.Vector3()
    };
    entity.userData.state = 'selected';
    setEntityHighlight(entity, true);
    onInteraction?.({ type: 'selected', hand, piece: entity });
  }

  function endSelection(hand) {
    if (!activeDrag || activeDrag.handId !== hand.id) return;

    const piece = activeDrag.piece;
    piece.userData.state = 'available';
    setEntityHighlight(piece, false);
    activeDrag = null;
    onInteraction?.({ type: 'released', hand, piece });
  }

  function updateDrag(hand) {
    if (!activeDrag || !hand.pinchPoint) return;
    const nextPosition = activeDrag.nextPosition.copy(hand.pinchPoint).add(activeDrag.offset);
    activeDrag.piece.position.set(
      THREE.MathUtils.clamp(nextPosition.x, DRAG_LIMITS.minX, DRAG_LIMITS.maxX),
      THREE.MathUtils.clamp(nextPosition.y, DRAG_LIMITS.minY, DRAG_LIMITS.maxY),
      THREE.MathUtils.clamp(nextPosition.z, DRAG_LIMITS.minZ, DRAG_LIMITS.maxZ)
    );
  }

  function updateHover(hand, entity, point) {
    if (hand.currentHit && hand.currentHit !== entity) setEntityHighlight(hand.currentHit, false);
    if (entity) setEntityHighlight(entity, true);
    hand.currentHit = entity;
    hand.currentHitPoint = point;
    hand.pointer.update({
      origin: hand.pointerOrigin,
      direction: hand.pointerDirection,
      visible: true,
      hitPoint: point,
      hit: Boolean(entity)
    });
  }

  function findIntersection(hand) {
    raycaster.set(hand.pointerOrigin, hand.pointerDirection);
    return raycaster.intersectObjects(selectableRoots, true).find((intersection) => intersection.object.visible !== false) || null;
  }

  function resolveSelectable(object) {
    let current = object;
    while (current && current !== laboratory.group.parent) {
      if (current.userData?.interactionCategory) return current;
      current = current.parent;
    }
    return null;
  }

  function getInteractionRoot(entity) {
    if (!entity) return null;
    if (entity.userData.interactionCategory === 'button') {
      return entity.parent?.userData?.interactionCategory === 'button' ? entity.parent : entity;
    }
    return entity;
  }

  function setEntityHighlight(entity, highlighted) {
    const root = getInteractionRoot(entity);
    if (!root || root.userData.highlighted === highlighted) return;
    root.userData.highlighted = highlighted;
    root.traverse((child) => {
      const material = child.material;
      if (!material) return;
      if (material.emissive) {
        if (material.userData.baseEmissiveIntensity === undefined) {
          material.userData.baseEmissiveIntensity = material.emissiveIntensity;
        }
        material.emissiveIntensity = highlighted
          ? Math.max(material.userData.baseEmissiveIntensity + 0.25, 0.35)
          : material.userData.baseEmissiveIntensity;
      }
      if (material.color && child.isSprite) {
        material.opacity = highlighted ? 1 : 0.92;
      }
    });
  }

  function cancelActiveDrag(message = 'Arrastre cancelado.') {
    if (!activeDrag) return;
    const { piece, originPosition, originRotation } = activeDrag;
    piece.position.copy(originPosition);
    piece.rotation.copy(originRotation);
    piece.userData.state = 'available';
    setEntityHighlight(piece, false);
    activeDrag = null;
    onInteraction?.({ type: 'cancelled', message, piece });
  }

  function dispose() {
    cancelActiveDrag('La interacción se cerró de forma segura.');
  }

  return Object.freeze({ update, beginSelection, endSelection, cancelActiveDrag, dispose });
}
