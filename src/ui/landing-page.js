export function createLandingPage(documentRoot = document) {
  const vrButtonMount = documentRoot.querySelector('#vr-button-mount');
  const compatibilityMessage = documentRoot.querySelector('#compatibility-message');
  const capabilityIndicator = documentRoot.querySelector('#capability-indicator');
  const capabilityStatus = documentRoot.querySelector('#capability-status');
  const capabilityDetails = documentRoot.querySelector('#capability-details');

  if (!vrButtonMount || !compatibilityMessage || !capabilityIndicator || !capabilityStatus || !capabilityDetails) {
    throw new Error('La portada no contiene todos los elementos de compatibilidad esperados.');
  }

  let vrButtonObserver = null;

  function setCapabilityState(state, detail) {
    const labels = {
      checking: 'Comprobando capacidades',
      ready: 'WebXR VR disponible',
      unsupported: 'WebXR VR no disponible',
      error: 'No se pudo verificar WebXR'
    };

    capabilityIndicator.className = `status-indicator status-${state === 'ready' ? 'ready' : state === 'checking' ? 'checking' : 'error'}`;
    capabilityStatus.textContent = labels[state] || labels.error;
    capabilityDetails.textContent = detail;
  }

  function setCompatibilityMessage(message, kind = 'neutral') {
    compatibilityMessage.textContent = message;
    compatibilityMessage.className = `compatibility-message${kind === 'error' ? ' is-error' : kind === 'ready' ? ' is-ready' : ''}`;
  }

  function mountVrButton(button) {
    vrButtonMount.replaceChildren(button);
    button.classList.add('btn-vr');
    button.setAttribute('aria-describedby', 'compatibility-message');
    localizeVrButton(button);
    vrButtonObserver?.disconnect();
    vrButtonObserver = new MutationObserver(() => localizeVrButton(button));
    vrButtonObserver.observe(button, { childList: true, characterData: true, subtree: true });
  }

  function localizeVrButton(button) {
    const labels = {
      'ENTER VR': 'Entrar en VR',
      'EXIT VR': 'Salir de VR',
      'VR NOT SUPPORTED': 'VR no disponible',
      'VR NOT ALLOWED': 'VR no permitido'
    };
    const translatedLabel = labels[button.textContent.trim()];
    if (translatedLabel) button.textContent = translatedLabel;
  }

  function setVrButtonText(text) {
    const button = vrButtonMount.querySelector('button');
    if (button) button.textContent = text;
  }

  return Object.freeze({ setCapabilityState, setCompatibilityMessage, mountVrButton, setVrButtonText });
}
