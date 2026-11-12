const SUCCESS_COLOR = 0x74e0d1;
const ERROR_COLOR = 0xe26d6d;
const ERROR_DURATION_MS = 700;

export function createFeedbackController({ laboratory }) {
  const activeErrors = new Map();
  let audioContext = null;

  function showSuccess(targetId) {
    activeErrors.delete(targetId);
    laboratory.setTargetIndicator(targetId, SUCCESS_COLOR);
    playTone({ frequency: 660, duration: 0.09, type: 'sine', gain: 0.045 });
    window.setTimeout(() => {
      if (laboratory.targets.get(targetId)?.userData.state === 'placed') {
        laboratory.setTargetIndicator(targetId, SUCCESS_COLOR);
      }
    }, 120);
  }

  function showError(targetId, now = performance.now()) {
    if (!targetId) return;
    const until = now + ERROR_DURATION_MS;
    activeErrors.set(targetId, until);
    laboratory.setTargetIndicator(targetId, ERROR_COLOR);
    playTone({ frequency: 180, duration: 0.1, type: 'triangle', gain: 0.028 });
  }

  function update(now = performance.now()) {
    activeErrors.forEach((until, targetId) => {
      if (now < until) return;
      activeErrors.delete(targetId);
      laboratory.resetTargetVisual(targetId);
    });
  }

  function reset() {
    activeErrors.clear();
    laboratory.resetTargetVisuals();
  }

  function dispose() {
    activeErrors.clear();
    if (audioContext && audioContext.state !== 'closed') {
      void audioContext.close();
    }
    audioContext = null;
  }

  function playTone({ frequency, duration, type, gain }) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      audioContext ||= new AudioContextClass();
      void audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const volume = audioContext.createGain();
      const startTime = audioContext.currentTime;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startTime);
      volume.gain.setValueAtTime(gain, startTime);
      volume.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      oscillator.connect(volume);
      volume.connect(audioContext.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    } catch (error) {
      console.warn('El feedback sonoro no está disponible:', error);
    }
  }

  return Object.freeze({ showSuccess, showError, update, reset, dispose });
}
