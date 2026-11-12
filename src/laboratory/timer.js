export function createChallengeTimer() {
  let elapsedMs = 0;
  let startedAt = null;
  let running = false;

  function start(now = performance.now()) {
    if (running) return;
    startedAt = now - elapsedMs;
    running = true;
  }

  function pause(now = performance.now()) {
    if (!running) return;
    elapsedMs = Math.max(0, now - startedAt);
    startedAt = null;
    running = false;
  }

  function stop(now = performance.now()) {
    pause(now);
  }

  function reset() {
    elapsedMs = 0;
    startedAt = null;
    running = false;
  }

  function getElapsed(now = performance.now()) {
    return running ? Math.max(0, now - startedAt) : elapsedMs;
  }

  function isRunning() {
    return running;
  }

  return Object.freeze({ start, pause, stop, reset, getElapsed, isRunning });
}
