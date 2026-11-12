import { VRButton } from 'three/addons/webxr/VRButton.js';
import { APP_CONFIG } from './core/config.js';
import { createAppState } from './core/app-state.js';
import { createSceneSystem } from './scene/scene-factory.js';
import { createLandingPage } from './ui/landing-page.js';
import { createHandTracker } from './xr/hand-tracker.js';
import { createDragController } from './interaction/drag-controller.js';
import { createChallengeController } from './laboratory/challenge-controller.js';

const appState = createAppState();
const landingPage = createLandingPage();
const previewCanvas = document.querySelector('#preview-canvas');

let sceneSystem;
let handTracker;
let dragController;
let challengeController;
let previousFrameTime = 0;

try {
  sceneSystem = createSceneSystem(previewCanvas);
  appState.subscribe((state) => sceneSystem?.hud.update(state));
  handTracker = createHandTracker({
    renderer: sceneSystem.renderer,
    scene: sceneSystem.scene,
    onSignal: handleHandSignal,
    onConnectionChange: handleHandConnection
  });
  dragController = createDragController({
    laboratory: sceneSystem.laboratory,
    hud: sceneSystem.hud,
    handTracker,
    onInteraction: handleInteraction
  });
  challengeController = createChallengeController({
    appState,
    laboratory: sceneSystem.laboratory
  });
  sceneSystem.renderer.setAnimationLoop((time, frame) => {
    const delta = previousFrameTime === 0 ? 16 : Math.min(time - previousFrameTime, 100);
    previousFrameTime = time;
    handTracker?.update(delta);
    dragController?.update();
    challengeController?.update(time);
    sceneSystem.render(time, frame);
  });
  appState.updateState({ phase: 'ready', message: 'Previsualización 3D lista.' });
  void initializeWebXR();
} catch (error) {
  handleInitializationError(error);
}

async function initializeWebXR() {
  if (!('xr' in navigator) || !navigator.xr) {
    reportUnsupported('Este navegador no expone WebXR. Usa Meta Quest Browser para la prueba inmersiva.');
    return;
  }

  try {
    const supported = await navigator.xr.isSessionSupported('immersive-vr');
    if (!supported) {
      reportUnsupported('immersive-vr no está disponible aquí. La previsualización 3D funciona, pero la experiencia debe probarse en Meta Quest Browser.');
      return;
    }

    const button = VRButton.createButton(sceneSystem.renderer, APP_CONFIG.xrSessionInit);
    landingPage.mountVrButton(button);
    landingPage.setCapabilityState('ready', 'El navegador puede solicitar una sesión immersive-vr. El seguimiento de manos se comprobará dentro del visor.');
    landingPage.setCompatibilityMessage('Listo para solicitar una sesión VR. La validación real de manos requiere Meta Quest 3.', 'ready');
    appState.updateState({ xrSupport: 'available', message: 'WebXR immersive-vr disponible.' });
  } catch (error) {
    console.error('No se pudo comprobar immersive-vr:', error);
    reportError('No se pudo comprobar la compatibilidad WebXR. Revisa Console y Network.');
  }
}

function reportUnsupported(message) {
  landingPage.setVrButtonText('VR no disponible');
  landingPage.setCapabilityState('unsupported', message);
  landingPage.setCompatibilityMessage(message, 'error');
  appState.updateState({ xrSupport: 'unsupported', message });
}

function reportError(message) {
  landingPage.setVrButtonText('VR no disponible');
  landingPage.setCapabilityState('error', message);
  landingPage.setCompatibilityMessage(message, 'error');
  appState.updateState({ xrSupport: 'error', message });
}

function handleInitializationError(error) {
  landingPage.setVrButtonText('VR no disponible');
  console.error('Error de inicialización de NEXO-5:', error);
  landingPage.setCapabilityState('error', 'La previsualización no pudo iniciarse. Revisa la consola del navegador.');
  landingPage.setCompatibilityMessage('La aplicación encontró un error de inicialización.', 'error');
  appState.updateState({ phase: 'error', message: error instanceof Error ? error.message : 'Error desconocido.' });
}

window.addEventListener('beforeunload', () => {
  dragController?.dispose();
  handTracker?.dispose();
  challengeController?.dispose();
  renderer?.domElement.removeEventListener('webglcontextlost', handleWebglContextLost);
  renderer?.domElement.removeEventListener('webglcontextrestored', handleWebglContextRestored);
  sceneSystem?.dispose();
});

const renderer = sceneSystem?.renderer;
renderer?.domElement.addEventListener('webglcontextlost', handleWebglContextLost, false);
renderer?.domElement.addEventListener('webglcontextrestored', handleWebglContextRestored, false);

function handleWebglContextLost(event) {
  event.preventDefault();
  const message = 'Se perdiÃ³ el contexto WebGL. Esperando a que el navegador lo restaure.';
  landingPage.setCapabilityState('error', message);
  landingPage.setCompatibilityMessage(message, 'error');
  appState.updateState({ message });
}

function handleWebglContextRestored() {
  const message = 'El contexto WebGL se restaurÃ³. Puedes continuar la comprobaciÃ³n.';
  landingPage.setCompatibilityMessage(message);
  appState.updateState({ message });
}

renderer?.xr.addEventListener('sessionstart', () => {
  landingPage.setVrButtonText('Salir de VR');
  challengeController?.startOrResume();
  const state = appState.getState();
  appState.updateState({
    xrSession: 'active',
    challenge: { ...state.challenge, status: 'active', message: 'Buscando seguimiento de manos…' },
    message: 'Sesión VR activa.'
  });
  if (state.challenge.status === 'complete') {
    appState.updateState({ challenge: state.challenge });
  }
});

renderer?.xr.addEventListener('sessionend', () => {
  challengeController?.pause();
  dragController?.cancelActiveDrag('Sesión VR finalizada.');
  landingPage.setVrButtonText('Entrar en VR');
  const state = appState.getState();
  appState.updateState({
    xrSession: 'inactive',
    challenge: { ...state.challenge, message: 'Sesión VR finalizada. Puedes volver a entrar cuando quieras.' },
    message: 'Sesión VR finalizada.'
  });
  if (state.challenge.status === 'complete') {
    appState.updateState({ challenge: state.challenge });
  }
});

function handleHandSignal(signal) {
  if (signal.type === 'start') {
    dragController?.beginSelection(signal.hand);
    return;
  }

  if (signal.type === 'end') {
    dragController?.endSelection(signal.hand);
    return;
  }

  if (signal.type === 'trackinglost') {
    dragController?.cancelActiveDrag('Se perdió el seguimiento; la pieza volvió a su posición segura.');
  }
}

function handleHandConnection({ status, hands }) {
  const state = appState.getState();
  let message = state.challenge.message;

  if (status === 'none') {
    message = 'No se detectan manos. Mira al frente y mantén las manos dentro del campo de visión.';
  } else if (status === 'available') {
    message = hands.count === 2
      ? 'Dos manos detectadas. Apunta a una pieza para comenzar.'
      : 'Mano detectada. Apunta a una pieza para comenzar.';
  }

  appState.updateState({
    hands,
    challenge: { ...state.challenge, message }
  });
}

function handleInteraction(event) {
  if (event.type === 'button-press') {
    if (event.action === 'exit') {
      renderer?.xr.getSession()?.end();
      return;
    }

    if (event.action === 'reset') {
      dragController?.cancelActiveDrag('Reto reiniciado.');
      challengeController?.reset();
      return;
    }
  }

  challengeController?.handleInteraction(event);
}

