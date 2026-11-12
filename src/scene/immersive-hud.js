import * as THREE from 'three';
import { createCanvasTexture, createLabelSprite } from './canvas-texture.js';

const DEFAULT_CHALLENGE = Object.freeze({
  assembled: 0,
  total: 5,
  elapsedMs: 0,
  status: 'pending',
  message: 'Apunta a una pieza para comenzar.'
});

export function createImmersiveHud() {
  const group = new THREE.Group();
  group.name = 'immersive-hud';
  group.position.set(0, 2.14, -1.82);

  const panelTexture = createCanvasTexture(1024, 256, drawPanel);
  panelTexture.redraw({ challenge: DEFAULT_CHALLENGE });

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.55, 0.64),
    new THREE.MeshBasicMaterial({ map: panelTexture.texture, transparent: true, depthWrite: false })
  );
  panel.name = 'hud-status-panel';
  group.add(panel);

  const resetButton = createHudButton('REINICIAR', 0xf2b84b, 'reset');
  resetButton.position.set(-0.57, -0.48, 0.03);
  group.add(resetButton);

  const exitButton = createHudButton('SALIR DE VR', 0x3db7aa, 'exit');
  exitButton.position.set(0.57, -0.48, 0.03);
  group.add(exitButton);

  let lastSignature = '';

  function update(state = {}) {
    const challenge = { ...DEFAULT_CHALLENGE, ...(state.challenge || {}) };
    const signature = [challenge.assembled, challenge.total, challenge.elapsedMs, challenge.status, challenge.message].join('|');
    if (signature === lastSignature) return;
    panelTexture.redraw({ challenge });
    lastSignature = signature;
  }

  function getInteractiveObjects() {
    return [resetButton, exitButton];
  }

  return Object.freeze({ group, panel, update, getInteractiveObjects });
}

function createHudButton(label, color, action) {
  const button = new THREE.Group();
  button.name = `hud-button-${action}`;
  button.userData = {
    entityType: 'hud-button',
    interactionCategory: 'button',
    action
  };

  const material = new THREE.MeshStandardMaterial({
    color: 0x20343d,
    roughness: 0.54,
    metalness: 0.16,
    emissive: color,
    emissiveIntensity: 0.08
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.08), material);
  body.userData = button.userData;
  button.add(body);

  const text = createLabelSprite(label, `#${new THREE.Color(color).getHexString()}`, {
    width: 0.82,
    height: 0.16,
    fontSize: 29,
    background: 'rgba(32, 52, 61, 0.96)'
  });
  text.position.z = 0.055;
  text.userData = button.userData;
  button.add(text);

  return button;
}

function drawPanel(context, width, height, data) {
  const challenge = { ...DEFAULT_CHALLENGE, ...(data?.challenge || {}) };
  const statusColors = {
    pending: '#f2b84b',
    active: '#74e0d1',
    error: '#e26d6d',
    complete: '#74e0d1'
  };
  const statusLabels = {
    pending: 'LISTO',
    active: 'EN CURSO',
    error: 'REVISA LA DISTANCIA',
    complete: 'LABORATORIO COMPLETO'
  };
  const statusColor = statusColors[challenge.status] || statusColors.pending;
  const statusLabel = statusLabels[challenge.status] || statusLabels.pending;

  context.clearRect(0, 0, width, height);
  context.fillStyle = '#101b24';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#3db7aa';
  context.fillRect(0, 0, 14, height);
  context.strokeStyle = 'rgba(220, 233, 234, 0.36)';
  context.lineWidth = 3;
  context.strokeRect(8, 8, width - 16, height - 16);

  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.font = '700 28px "Cascadia Mono", Consolas, monospace';
  context.fillStyle = '#dce9ea';
  context.fillText('NEXO-5', 42, 48);
  context.font = '500 18px "Cascadia Mono", Consolas, monospace';
  context.fillStyle = '#9eb2b7';
  context.fillText('MANIPULACIÓN Y ENSAMBLAJE', 42, 77);

  context.font = '700 24px "Cascadia Mono", Consolas, monospace';
  context.fillStyle = '#dce9ea';
  context.fillText(`ENSAMBLADAS  ${String(challenge.assembled).padStart(2, '0')}/${String(challenge.total).padStart(2, '0')}`, 42, 139);

  context.font = '500 18px "Cascadia Mono", Consolas, monospace';
  context.fillStyle = '#9eb2b7';
  context.fillText('TIEMPO', 42, 180);
  context.font = '700 24px "Cascadia Mono", Consolas, monospace';
  context.fillStyle = '#dce9ea';
  context.fillText(formatTime(challenge.elapsedMs), 153, 180);

  context.textAlign = 'right';
  context.font = '700 20px "Cascadia Mono", Consolas, monospace';
  context.fillStyle = statusColor;
  context.fillText(statusLabel, width - 38, 51);
  context.font = '500 17px "Aptos", "Segoe UI", sans-serif';
  context.fillStyle = '#dce9ea';
  context.fillText(trimMessage(challenge.message), width - 38, 87);
  context.fillStyle = 'rgba(116, 224, 209, 0.7)';
  context.font = '500 15px "Cascadia Mono", Consolas, monospace';
  context.fillText('PINZA PARA TOMAR · SUELTA PARA ENCAJAR', width - 38, 180);
}

function formatTime(elapsedMs = 0) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function trimMessage(message) {
  const normalized = String(message || '').trim();
  return normalized.length > 42 ? `${normalized.slice(0, 39)}…` : normalized;
}
