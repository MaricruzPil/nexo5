import * as THREE from 'three';
import { APP_CONFIG } from '../core/config.js';
import { createLaboratory } from './laboratory-factory.js';
import { createImmersiveHud } from './immersive-hud.js';

export function createSceneSystem(canvas) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new TypeError('No se encontró el canvas de previsualización 3D.');
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(APP_CONFIG.colors.background);
  scene.fog = new THREE.Fog(APP_CONFIG.colors.background, 4.5, 9);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 20);
  camera.position.set(0, 2.35, 3.45);
  camera.lookAt(0, 1.08, -1.35);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');

  const ambientLight = new THREE.HemisphereLight(0xb9ffff, 0x14232d, 2.2);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
  keyLight.position.set(-2.5, 4.5, 3);
  scene.add(keyLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 6),
    new THREE.MeshStandardMaterial({ color: 0x152630, roughness: 0.92, metalness: 0.05 })
  );
  floor.name = 'virtual-floor';
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const floorGrid = new THREE.GridHelper(6, 12, APP_CONFIG.colors.grid, 0x1c3039);
  floorGrid.name = 'virtual-floor-grid';
  floorGrid.position.y = 0.012;
  scene.add(floorGrid);

  const laboratory = createLaboratory();
  const hud = createImmersiveHud();
  scene.add(laboratory.group, hud.group);

  const resizeTarget = canvas.parentElement || canvas;
  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => resizeRenderer())
    : null;
  resizeObserver?.observe(resizeTarget);
  window.addEventListener('resize', resizeRenderer);
  resizeRenderer();

  function resizeRenderer() {
    const container = canvas.parentElement || canvas;
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const pixelRatio = renderer.getPixelRatio();
    const drawingWidth = Math.floor(width * pixelRatio);
    const drawingHeight = Math.floor(height * pixelRatio);

    if (canvas.width !== drawingWidth || canvas.height !== drawingHeight) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }

  function update(elapsedSeconds) {
    laboratory.update(elapsedSeconds, renderer.xr.isPresenting);
  }

  function render(elapsedMilliseconds) {
    update(elapsedMilliseconds * 0.001);
    renderer.render(scene, camera);
  }

  function dispose() {
    resizeObserver?.disconnect();
    window.removeEventListener('resize', resizeRenderer);
    const disposedTextures = new Set();

    scene.traverse((object) => {
      const canvasTexture = object.userData?.canvasTexture;
      if (canvasTexture && !disposedTextures.has(canvasTexture.texture)) {
        canvasTexture.dispose();
        disposedTextures.add(canvasTexture.texture);
      }

      if (!object.isMesh && !object.isLineSegments && !object.isSprite) return;
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach((material) => {
        if (material.map && !disposedTextures.has(material.map)) {
          material.map.dispose();
          disposedTextures.add(material.map);
        }
        material.dispose();
      });
    });

    renderer.setAnimationLoop(null);
    renderer.dispose();
  }

  return Object.freeze({
    scene,
    camera,
    renderer,
    laboratory,
    hud,
    render,
    dispose
  });
}
