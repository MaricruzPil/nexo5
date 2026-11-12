const INITIAL_STATE = Object.freeze({
  phase: 'loading',
  xrSupport: 'checking',
  xrSession: 'inactive',
  message: 'Comprobando capacidades del navegador.',
  hands: Object.freeze({ left: 'unknown', right: 'unknown', count: 0 }),
  challenge: Object.freeze({
    assembled: 0,
    total: 5,
    elapsedMs: 0,
    status: 'pending',
    message: 'Apunta a una pieza para comenzar.'
  })
});

export function createAppState() {
  let currentState = { ...INITIAL_STATE };
  const subscribers = new Set();

  function getState() {
    return { ...currentState };
  }

  function updateState(patch) {
    currentState = { ...currentState, ...patch };
    subscribers.forEach((subscriber) => subscriber(getState()));
  }

  function subscribe(subscriber) {
    subscribers.add(subscriber);
    subscriber(getState());
    return () => subscribers.delete(subscriber);
  }

  return Object.freeze({ getState, updateState, subscribe });
}
