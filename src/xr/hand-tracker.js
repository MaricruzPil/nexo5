import * as THREE from 'three';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { createPointerRay } from './pointer-ray.js';

const HAND_COUNT = 2;
const TIP_JOINT = 'index-finger-tip';
const DISTAL_JOINT = 'index-finger-phalanx-distal';
const THUMB_JOINT = 'thumb-tip';

export function createHandTracker({ renderer, scene, onSignal, onConnectionChange }) {
  const modelFactory = new XRHandModelFactory();
  const handStates = [];

  for (let index = 0; index < HAND_COUNT; index += 1) {
    const hand = renderer.xr.getHand(index);
    const model = modelFactory.createHandModel(hand, 'spheres');
    hand.add(model);
    scene.add(hand);

    const state = createHandState(index, hand, scene);
    handStates.push(state);
    attachHandEvents(state);
  }

  let elapsedWithoutHands = 0;
  let hasReportedNoHands = false;
  let previousTrackingCount = 0;

  function update(deltaMilliseconds = 16) {
    const hasVisibleHand = handStates.some((state) => {
      updateHandPose(state);
      return state.tracking;
    });

    if (!renderer.xr.isPresenting) {
      elapsedWithoutHands = 0;
      hasReportedNoHands = false;
      previousTrackingCount = 0;
      return;
    }

    const trackingCount = handStates.filter((state) => state.tracking).length;
    if (trackingCount !== previousTrackingCount) {
      previousTrackingCount = trackingCount;
      notifyConnectionChange();
    }

    if (hasVisibleHand) {
      elapsedWithoutHands = 0;
      if (hasReportedNoHands) {
        hasReportedNoHands = false;
        notifyConnectionChange();
      }
    } else {
      elapsedWithoutHands += deltaMilliseconds;
      if (elapsedWithoutHands >= 1500 && !hasReportedNoHands) {
        hasReportedNoHands = true;
        onConnectionChange?.({ status: 'none', hands: getConnectionSnapshot() });
      }
    }
  }

  function getStates() {
    return handStates;
  }

  function getConnectionSnapshot() {
    return handStates.reduce((snapshot, state) => {
      if (state.handedness === 'left' || state.handedness === 'right') {
        snapshot[state.handedness] = state.tracking ? 'tracking' : state.connected ? 'connected' : 'lost';
      }
      snapshot.count += state.tracking ? 1 : 0;
      return snapshot;
    }, { left: 'unknown', right: 'unknown', count: 0 });
  }

  function notifyConnectionChange() {
    onConnectionChange?.({ status: 'available', hands: getConnectionSnapshot() });
  }

  function dispose() {
    handStates.forEach((state) => {
      state.hand.removeEventListener('connected', state.listeners.connected);
      state.hand.removeEventListener('disconnected', state.listeners.disconnected);
      state.hand.removeEventListener('pinchstart', state.listeners.pinchstart);
      state.hand.removeEventListener('pinchend', state.listeners.pinchend);
      state.hand.removeEventListener('selectstart', state.listeners.selectstart);
      state.hand.removeEventListener('selectend', state.listeners.selectend);
      scene.remove(state.pointer.group);
      state.pointer.dispose();
      scene.remove(state.hand);
    });
  }

  return Object.freeze({ update, getStates, dispose });

  function createHandState(index, hand, sceneRoot) {
    const pointer = createPointerRay();
    sceneRoot.add(pointer.group);

    return {
      id: `hand-${index}`,
      index,
      hand,
      pointer,
      handedness: 'unknown',
      connected: false,
      tracking: false,
      signalActive: false,
      nativeSelectionObserved: false,
      currentHit: null,
      currentHitPoint: null,
      pinchPoint: new THREE.Vector3(),
      pointerOrigin: new THREE.Vector3(),
      pointerDirection: new THREE.Vector3(0, 0, -1),
      tipPosition: new THREE.Vector3(),
      distalPosition: new THREE.Vector3(),
      thumbPosition: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      listeners: {}
    };
  }

  function attachHandEvents(state) {
    state.listeners.connected = (event) => {
      const inputSource = event.data;
      if (!inputSource?.hand) return;
      state.connected = true;
      state.handedness = inputSource.handedness || state.handedness;
      notifyConnectionChange();
    };

    state.listeners.disconnected = (event) => {
      if (event.data?.handedness && event.data.handedness !== state.handedness) return;
      state.connected = false;
      state.tracking = false;
      state.signalActive = false;
      state.currentHit = null;
      state.currentHitPoint = null;
      state.pointer.update({ visible: false });
      onSignal?.({ type: 'trackinglost', hand: state });
      notifyConnectionChange();
    };

    state.listeners.pinchstart = () => {
      if (!state.nativeSelectionObserved) startSignal(state, 'pinchstart');
    };
    state.listeners.selectstart = () => {
      state.nativeSelectionObserved = true;
      startSignal(state, 'selectstart');
    };
    state.listeners.pinchend = () => {
      if (!state.nativeSelectionObserved) endSignal(state, 'pinchend');
    };
    state.listeners.selectend = () => {
      state.nativeSelectionObserved = true;
      endSignal(state, 'selectend');
    };

    state.hand.addEventListener('connected', state.listeners.connected);
    state.hand.addEventListener('disconnected', state.listeners.disconnected);
    state.hand.addEventListener('pinchstart', state.listeners.pinchstart);
    state.hand.addEventListener('pinchend', state.listeners.pinchend);
    state.hand.addEventListener('selectstart', state.listeners.selectstart);
    state.hand.addEventListener('selectend', state.listeners.selectend);
  }

  function startSignal(state, source) {
    if (!state.tracking || state.signalActive) return;
    state.signalActive = true;
    onSignal?.({ type: 'start', source, hand: state });
  }

  function endSignal(state, source) {
    if (!state.signalActive) return;
    state.signalActive = false;
    onSignal?.({ type: 'end', source, hand: state });
  }

  function updateHandPose(state) {
    const joints = state.hand.joints || {};
    const indexTip = joints[TIP_JOINT];
    const indexDistal = joints[DISTAL_JOINT];
    const thumbTip = joints[THUMB_JOINT];
    const jointsReady = indexTip?.visible && indexDistal?.visible && thumbTip?.visible && state.hand.visible;

    if (!jointsReady) {
      clearTracking(state);
      return;
    }

    state.hand.updateMatrixWorld(true);
    const { tipPosition, distalPosition, thumbPosition, direction } = state;
    indexTip.getWorldPosition(tipPosition);
    indexDistal.getWorldPosition(distalPosition);
    thumbTip.getWorldPosition(thumbPosition);
    direction.subVectors(tipPosition, distalPosition);

    if (direction.lengthSq() < 0.000001) {
      clearTracking(state);
      return;
    }

    state.tracking = true;
    state.pointerOrigin.copy(tipPosition);
    state.pointerDirection.copy(direction.normalize());
    state.pinchPoint.copy(tipPosition).add(thumbPosition).multiplyScalar(0.5);
    state.pointer.update({
      origin: state.pointerOrigin,
      direction: state.pointerDirection,
      visible: true,
      hitPoint: state.currentHitPoint,
      hit: Boolean(state.currentHit)
    });
  }

  function clearTracking(state) {
    const hadInteraction = state.tracking || state.signalActive;
    state.tracking = false;
    state.currentHit = null;
    state.currentHitPoint = null;
    state.pointer.update({ visible: false });

    if (hadInteraction) {
      state.signalActive = false;
      onSignal?.({ type: 'trackinglost', hand: state });
    }
  }
}
