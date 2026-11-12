import * as THREE from 'three';

const DEFAULT_LENGTH = 2.4;
const RAY_FORWARD = new THREE.Vector3(0, 0, -1);

export function createPointerRay() {
  const group = new THREE.Group();
  group.name = 'hand-pointer-ray';
  group.visible = false;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0,
    0, 0, -DEFAULT_LENGTH
  ], 3));

  const material = new THREE.LineBasicMaterial({
    color: 0x74e0d1,
    transparent: true,
    opacity: 0.86,
    depthWrite: false
  });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 4;
  group.add(line);

  const cursor = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x74e0d1, transparent: true, opacity: 0.95, depthWrite: false })
  );
  cursor.renderOrder = 5;
  cursor.visible = false;
  group.add(cursor);

  function update({ origin, direction, visible, hitPoint = null, hit = false }) {
    group.visible = Boolean(visible);
    if (!visible) return;

    group.position.copy(origin);
    group.quaternion.setFromUnitVectors(RAY_FORWARD, direction);
    material.color.setHex(hit ? 0xf2b84b : 0x74e0d1);
    cursor.material.color.setHex(hit ? 0xf2b84b : 0x74e0d1);
    cursor.visible = Boolean(hitPoint);

    if (hitPoint) {
      const distance = Math.min(DEFAULT_LENGTH, origin.distanceTo(hitPoint));
      cursor.position.set(0, 0, -distance);
      line.scale.z = distance / DEFAULT_LENGTH;
    } else {
      line.scale.z = 1;
    }
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    cursor.geometry.dispose();
    cursor.material.dispose();
  }

  return Object.freeze({ group, update, dispose });
}
