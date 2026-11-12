import * as THREE from 'three';

export function createCanvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('No se pudo crear el contexto 2D para el texto inmersivo.');
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  function redraw(data) {
    draw(context, width, height, data);
    texture.needsUpdate = true;
  }

  function dispose() {
    texture.dispose();
  }

  return Object.freeze({ canvas, context, texture, redraw, dispose });
}

export function createLabelSprite(text, color = '#dce9ea', options = {}) {
  const textureCanvas = createCanvasTexture(512, 128, (context, width, height) => {
    context.clearRect(0, 0, width, height);
    context.font = `700 ${options.fontSize || 34}px "Cascadia Mono", Consolas, monospace`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = options.background || 'rgba(16, 27, 36, 0.88)';
    context.fillRect(12, 24, width - 24, height - 48);
    context.strokeStyle = options.border || color;
    context.lineWidth = 3;
    context.strokeRect(12, 24, width - 24, height - 48);
    context.fillStyle = color;
    context.fillText(text, width / 2, height / 2 + 1);
  });
  textureCanvas.redraw();

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textureCanvas.texture,
    transparent: true,
    depthWrite: false
  }));
  sprite.scale.set(options.width || 0.46, options.height || 0.115, 1);
  sprite.userData.canvasTexture = textureCanvas;
  return sprite;
}
