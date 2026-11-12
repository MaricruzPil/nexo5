import * as THREE from 'three';
import { APP_CONFIG } from '../core/config.js';
import { LABORATORY_TOTAL } from './laboratory-data.js';
import { createChallengeTimer } from './timer.js';
import { createFeedbackController } from './feedback.js';

const ERROR_MESSAGE_DURATION_MS = 1200;

export function createChallengeController({ appState, laboratory }) {
  const timer = createChallengeTimer();
  const feedback = createFeedbackController({ laboratory });
  let errorMessageUntil = 0;
  let lastDisplayedSecond = -1;

  function startOrResume(now = performance.now()) {
    const state = appState.getState();
    if (state.challenge.status === 'complete') return;
    timer.start(now);
    setChallenge({ status: 'active', elapsedMs: timer.getElapsed(now) });
  }

  function pause(now = performance.now()) {
    timer.pause(now);
    setChallenge({ elapsedMs: timer.getElapsed(now) });
  }

  function update(now = performance.now()) {
    feedback.update(now);
    if (timer.isRunning()) {
      const elapsedMs = timer.getElapsed(now);
      const second = Math.floor(elapsedMs / 1000);
      if (second !== lastDisplayedSecond) {
        lastDisplayedSecond = second;
        setChallenge({ elapsedMs });
      }
    }

    const state = appState.getState();
    if (state.challenge.status === 'error' && errorMessageUntil > 0 && now >= errorMessageUntil) {
      errorMessageUntil = 0;
      setChallenge({ status: 'active', message: 'Sigue intentando: coloca cada pieza en su silueta.' });
    }
  }

  function handleInteraction(event) {
    if (event.type === 'released') {
      validateRelease(event.piece);
      return;
    }

    if (event.type === 'selected') {
      startOrResume();
      setChallenge({
        status: 'active',
        message: `Pieza ${event.piece.userData.label} seleccionada. Suéltala en su destino.`
      });
      return;
    }

    if (event.type === 'cancelled') {
      setChallenge({ message: event.message });
    }
  }

  function validateRelease(piece) {
    if (!piece || piece.userData.state === 'placed') return;

    const assignedTarget = laboratory.targets.get(piece.userData.targetId);
    if (!assignedTarget) {
      setChallengeError('No se encontró el destino asignado para esta pieza.');
      return;
    }

    const piecePosition = piece.getWorldPosition(new THREE.Vector3());
    const assignedPosition = assignedTarget.getWorldPosition(new THREE.Vector3());
    const assignedDistance = piecePosition.distanceTo(assignedPosition);
    const nearestTarget = findNearestTarget(piecePosition);

    if (assignedDistance <= getTolerance()) {
      placePiece(piece, assignedTarget);
      return;
    }

    if (nearestTarget && nearestTarget.target !== assignedTarget && nearestTarget.distance <= getTolerance()) {
      showError(nearestTarget.target, 'Destino equivocado. Busca la silueta que coincide con la pieza.');
      return;
    }

    showError(assignedTarget, 'La pieza está demasiado lejos de su destino.');
  }

  function placePiece(piece, target) {
    piece.position.copy(target.position);
    piece.rotation.copy(target.rotation);
    piece.userData.state = 'placed';
    piece.userData.placedAt = performance.now();
    target.userData.state = 'placed';
    laboratory.setTargetIndicator(target.userData.targetId, 0x74e0d1);
    feedback.showSuccess(target.userData.targetId);

    const assembled = countPlacedPieces();
    if (assembled === LABORATORY_TOTAL) {
      const now = performance.now();
      timer.stop(now);
      setChallenge({
        assembled,
        elapsedMs: timer.getElapsed(now),
        status: 'complete',
        message: `Laboratorio completado en ${formatTime(timer.getElapsed(now))}.`
      });
      return;
    }

    setChallenge({
      assembled,
      status: 'active',
      message: `Acierto: ${piece.userData.label} encajada. Continúa con la siguiente.`
    });
  }

  function reset() {
    timer.reset();
    feedback.reset();
    errorMessageUntil = 0;
    lastDisplayedSecond = -1;
    laboratory.resetVisualState();
    setChallenge({
      assembled: 0,
      total: LABORATORY_TOTAL,
      elapsedMs: 0,
      status: 'pending',
      message: 'Reto reiniciado. Apunta a una pieza para comenzar.'
    });
  }

  function dispose() {
    feedback.dispose();
  }

  function countPlacedPieces() {
    return [...laboratory.pieces.values()].filter((piece) => piece.userData.state === 'placed').length;
  }

  function findNearestTarget(position) {
    return [...laboratory.targets.values()].reduce((nearest, target) => {
      const targetPosition = target.getWorldPosition(new THREE.Vector3());
      const distance = position.distanceTo(targetPosition);
      if (!nearest || distance < nearest.distance) return { target, distance };
      return nearest;
    }, null);
  }

  function getTolerance() {
    const tolerance = Number(APP_CONFIG.assemblyToleranceMeters);
    return Number.isFinite(tolerance) && tolerance > 0 ? tolerance : 0.12;
  }

  function showError(target, message) {
    const targetId = target.userData.targetId;
    feedback.showError(targetId);
    errorMessageUntil = performance.now() + ERROR_MESSAGE_DURATION_MS;
    setChallenge({ status: 'error', message });
  }

  function setChallengeError(message) {
    errorMessageUntil = performance.now() + ERROR_MESSAGE_DURATION_MS;
    setChallenge({ status: 'error', message });
  }

  function setChallenge(patch) {
    const state = appState.getState();
    appState.updateState({
      challenge: {
        ...state.challenge,
        ...patch,
        total: LABORATORY_TOTAL,
        assembled: patch.assembled ?? countPlacedPieces()
      }
    });
  }

  return Object.freeze({ startOrResume, pause, update, handleInteraction, reset, dispose });
}

function formatTime(elapsedMs) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
