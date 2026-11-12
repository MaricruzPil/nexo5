import * as THREE from 'three';
import { APP_CONFIG } from '../core/config.js';
import { LABORATORY_DEFINITIONS } from '../laboratory/laboratory-data.js';
import { createLabelSprite } from './canvas-texture.js';

const SURFACE_Y = 1.08;

export function createLaboratory() {
  const group = new THREE.Group();
  group.name = 'nexo-laboratory';

  const pieces = new Map();
  const targets = new Map();
  let wasPresenting = false;

  group.add(createWorkbench());

  LABORATORY_DEFINITIONS.forEach((definition) => {
    const target = createTarget(definition);
    const piece = createPiece(definition);
    targets.set(definition.targetId, target);
    pieces.set(definition.id, piece);
    group.add(target, piece);
  });

  function update(elapsedSeconds, isPresenting) {
    if (isPresenting) {
      if (!wasPresenting) {
        pieces.forEach((piece) => piece.rotation.set(...piece.userData.initialRotation));
      }
      wasPresenting = true;
      return;
    }

    wasPresenting = false;

    pieces.forEach((piece, index) => {
      piece.rotation.y = piece.userData.initialRotation[1] + Math.sin(elapsedSeconds * 0.5 + index) * 0.04;
    });
  }

  function setTargetIndicator(targetId, color, opacity = 0.9) {
    const target = targets.get(targetId);
    if (!target) return;

    target.userData.indicatorColor = color;
    target.traverse((child) => {
      if (!child.userData?.targetVisual || !child.material?.color) return;
      child.material.color.setHex(color);
      child.material.opacity = opacity;
    });
  }

  function resetTargetVisual(targetId) {
    const target = targets.get(targetId);
    if (!target) return;

    const color = target.userData.state === 'placed'
      ? target.userData.successColor
      : target.userData.baseColor;
    target.userData.indicatorColor = color;
    target.traverse((child) => {
      if (!child.userData?.targetVisual || !child.material?.color) return;
      child.material.color.setHex(child.userData.baseColor ?? color);
      child.material.opacity = child.userData.baseOpacity ?? child.material.opacity;
    });

    if (target.userData.state === 'placed') {
      setTargetIndicator(targetId, target.userData.successColor);
    }
  }

  function resetTargetVisuals() {
    targets.forEach((_target, targetId) => resetTargetVisual(targetId));
  }

  function resetVisualState() {
    pieces.forEach((piece) => {
      piece.position.copy(piece.userData.initialPosition);
      piece.rotation.set(...piece.userData.initialRotation);
      piece.userData.state = 'available';
      piece.userData.highlighted = false;
      delete piece.userData.placedAt;

      if (piece.material?.emissiveIntensity !== undefined) {
        piece.material.emissiveIntensity = 0.05;
      }
    });

    targets.forEach((target) => {
      target.userData.state = 'available';
      resetTargetVisual(target.userData.targetId);
    });
  }

  return Object.freeze({
    group,
    pieces,
    targets,
    definitions: LABORATORY_DEFINITIONS,
    update,
    setTargetIndicator,
    resetTargetVisual,
    resetTargetVisuals,
    resetVisualState
  });
}

function createWorkbench() {
  const workbench = new THREE.Group();
  workbench.name = 'workbench';

  const topMaterial = new THREE.MeshStandardMaterial({
    color: APP_CONFIG.colors.table,
    roughness: 0.76,
    metalness: 0.14
  });
  const edgeMaterial = new THREE.MeshBasicMaterial({ color: APP_CONFIG.colors.tableEdge });
  const legMaterial = new THREE.MeshStandardMaterial({
    color: 0x172932,
    roughness: 0.9,
    metalness: 0.1
  });

  const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.25), topMaterial);
  top.position.set(0, 1, -1.45);
  top.userData.sceneRole = 'workbench';
  workbench.add(top);

  const frontEdge = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.025, 0.055), edgeMaterial);
  frontEdge.position.set(0, SURFACE_Y + 0.01, -0.8);
  workbench.add(frontEdge);

  const backRail = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.055, 0.055), edgeMaterial);
  backRail.position.set(0, SURFACE_Y + 0.02, -2.1);
  backRail.material = edgeMaterial.clone();
  backRail.material.color.setHex(0x31505a);
  workbench.add(backRail);

  [-1.3, 1.3].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.92, 0.16), legMaterial);
    leg.position.set(x, 0.5, -1.45);
    workbench.add(leg);
  });

  const measurementLine = new THREE.Mesh(
    new THREE.BoxGeometry(2.45, 0.008, 0.018),
    new THREE.MeshBasicMaterial({ color: 0x49616a })
  );
  measurementLine.position.set(0, SURFACE_Y + 0.014, -1.45);
  workbench.add(measurementLine);

  return workbench;
}

function createPiece(definition) {
  const geometry = createShapeGeometry(definition.kind, 1);
  const material = new THREE.MeshStandardMaterial({
    color: definition.color,
    roughness: 0.32,
    metalness: 0.18,
    emissive: definition.color,
    emissiveIntensity: 0.05
  });
  const piece = new THREE.Mesh(geometry, material);
  piece.name = definition.id;
  piece.position.set(...definition.sourcePosition);
  piece.rotation.set(...definition.sourceRotation);
  piece.userData = {
    ...piece.userData,
    entityType: 'piece',
    interactionCategory: 'piece',
    pieceId: definition.id,
    targetId: definition.targetId,
    kind: definition.kind,
    label: definition.label,
    color: definition.color,
    initialPosition: new THREE.Vector3(...definition.sourcePosition),
    initialRotation: [...definition.sourceRotation],
    state: 'available'
  };

  const label = createLabelSprite(definition.label, `#${new THREE.Color(definition.color).getHexString()}`, {
    width: 0.34,
    height: 0.085,
    fontSize: 27,
    background: 'rgba(16, 27, 36, 0.72)'
  });
  label.position.set(0, getShapeHeight(definition.kind) * 0.64, 0);
  label.visible = false;
  piece.add(label);

  return piece;
}

function createTarget(definition) {
  const target = new THREE.Group();
  target.name = definition.targetId;
  target.position.set(...definition.targetPosition);
  target.rotation.set(...definition.targetRotation);
  target.userData = {
    entityType: 'target',
    interactionCategory: 'target',
    targetId: definition.targetId,
    pieceId: definition.id,
    kind: definition.kind,
    label: definition.label,
    color: definition.color,
    baseColor: definition.color,
    successColor: 0x74e0d1,
    indicatorColor: definition.color,
    state: 'available'
  };

  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(getTargetRadius(definition.kind), 24),
    new THREE.MeshBasicMaterial({ color: 0x182b34, transparent: true, opacity: 0.9 })
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = SURFACE_Y - definition.targetPosition[1] + 0.015;
  target.add(plate);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(getTargetRadius(definition.kind) * 0.78, getTargetRadius(definition.kind) * 0.84, 28),
    new THREE.MeshBasicMaterial({ color: definition.color, transparent: true, opacity: 0.86, side: THREE.DoubleSide })
  );
  ring.userData.baseColor = definition.color;
  ring.userData.baseOpacity = ring.material.opacity;
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = SURFACE_Y - definition.targetPosition[1] + 0.02;
  ring.userData.targetVisual = true;
  target.add(ring);

  const outlineSourceGeometry = createShapeGeometry(definition.kind, 1.14);
  const outlineGeometry = new THREE.EdgesGeometry(outlineSourceGeometry);
  outlineSourceGeometry.dispose();
  const outline = new THREE.LineSegments(
    outlineGeometry,
    new THREE.LineBasicMaterial({ color: definition.color, transparent: true, opacity: 0.78 })
  );
  outline.userData.baseColor = definition.color;
  outline.userData.baseOpacity = outline.material.opacity;
  outline.userData.targetVisual = true;
  target.add(outline);

  const label = createLabelSprite(definition.label, `#${new THREE.Color(definition.color).getHexString()}`, {
    width: 0.46,
    height: 0.115,
    fontSize: 31
  });
  label.position.set(0, getShapeHeight(definition.kind) * 0.7 + 0.13, 0);
  target.add(label);

  return target;
}

function createShapeGeometry(kind, scale = 1) {
  switch (kind) {
    case 'cube':
      return new THREE.BoxGeometry(0.29 * scale, 0.29 * scale, 0.29 * scale);
    case 'orb':
      return new THREE.SphereGeometry(0.17 * scale, 20, 14);
    case 'cone':
      return new THREE.ConeGeometry(0.19 * scale, 0.37 * scale, 20);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.17 * scale, 0.17 * scale, 0.37 * scale, 20);
    case 'prism':
      return new THREE.CylinderGeometry(0.2 * scale, 0.2 * scale, 0.34 * scale, 6);
    default:
      throw new Error(`Forma de laboratorio no soportada: ${kind}`);
  }
}

function getShapeHeight(kind) {
  switch (kind) {
    case 'cube': return 0.29;
    case 'orb': return 0.34;
    case 'cone': return 0.37;
    case 'cylinder': return 0.37;
    case 'prism': return 0.34;
    default: return 0.3;
  }
}

function getTargetRadius(kind) {
  switch (kind) {
    case 'cube': return 0.23;
    case 'orb': return 0.22;
    case 'cone': return 0.23;
    case 'cylinder': return 0.22;
    case 'prism': return 0.24;
    default: return 0.22;
  }
}
