# NEXO-5 · Laboratorio virtual de ensamblaje

NEXO-5 es una aplicación educativa de realidad virtual para aprender interacción
3D con las manos. El usuario observa cinco piezas geométricas, apunta a ellas con
el índice, las toma con un gesto de pinza y las coloca en sus cinco destinos dentro
de una mesa de trabajo virtual.

La aplicación está pensada para Meta Quest 3 y Meta Quest Browser. La portada web
explica la actividad y ofrece una previsualización 3D para escritorio; la actividad
real ocurre dentro de una sesión WebXR `immersive-vr` y su interfaz se construye
como objetos 3D, no como elementos HTML superpuestos.

## Qué hace

- Presenta la práctica, sus objetivos, requisitos y compatibilidad WebXR.
- Renderiza una escena 3D opaca con mesa, piso, iluminación y cinco piezas.
- Representa cada pieza con una forma y color propios: cubo, esfera, cono,
  cilindro y prisma.
- Crea cinco destinos etiquetados y asigna cada pieza a un destino concreto.
- Muestra las manos del usuario, un rayo desde el índice y un punto de interacción.
- Permite apuntar, resaltar, tomar con pinza, arrastrar y soltar piezas.
- Valida la colocación únicamente al soltar la pieza.
- Acepta una pieza cuando coincide con su destino y está dentro de una tolerancia
  de `0.12` metros.
- En un acierto hace snap-to-target, cambia el destino a verde, reproduce un tono,
  suma una pieza y bloquea esa pieza.
- En un error muestra feedback rojo, no suma progreso y permite volver a intentar.
- Incluye HUD 3D con contador, cronómetro, estado, instrucciones y mensajes.
- Incluye botones 3D para reiniciar el reto y salir de VR.

## Cómo usarla

### Previsualización en computadora

No necesita Node.js, npm, Vite, webpack, backend ni proceso de compilación.

1. Abre la carpeta en Visual Studio Code.
2. Instala o utiliza la extensión **Live Server**.
3. Abre `index.html` con **Open with Live Server**.
4. Espera a que aparezca la portada y la previsualización WebGL.
5. Revisa `Console` y `Network` si el canvas aparece vacío o la portada muestra
   un error de carga.

En una computadora normal es esperable que el botón indique que `immersive-vr`
no está disponible. La escena de escritorio sirve para revisar la composición y
la carga de recursos, pero no demuestra que el seguimiento de manos funcione.

### Experiencia en Meta Quest 3

Para probar las manos se necesita abrir la aplicación desde Meta Quest Browser
usando una URL HTTPS publicada. El `localhost` de la computadora no es el mismo
`localhost` del visor.

1. Abre la URL pública en Meta Quest Browser.
2. Pulsa **Entrar en VR** y acepta los permisos solicitados.
3. Mantén las manos dentro del campo de visión del visor.
4. Extiende el índice hacia una pieza: el rayo debe resaltarla.
5. Acerca pulgar e índice para hacer pinza y mover la pieza.
6. Suelta la pinza dentro del destino correspondiente.
7. Repite el proceso hasta completar `5/5`.
8. Usa **REINICIAR RETO** para regresar a `0/5` o **SALIR DE VR** para terminar.

### Estados de la actividad

| Elemento | Estados principales |
|---|---|
| Pieza | disponible, seleccionada, colocada |
| Reto | pendiente, activo, error, completado |
| Tracking | desconocido, conectado, siguiendo, perdido |

La pérdida de tracking durante un arrastre cancela la interacción y devuelve la
pieza a su posición segura. Una pieza colocada queda bloqueada hasta reiniciar.

## Arquitectura

La aplicación utiliza módulos ES nativos y un estado central pequeño. La
orquestación principal está en `src/main.js`; cada módulo mantiene una sola
responsabilidad.

```text
index.html                 portada, import map y carga de módulos
css/site.css               diseño responsivo y accesibilidad visual
favicon.svg                icono de NEXO-5
PRUEBAS.md                 matriz de aceptación y evidencias
src/
├── main.js                inicialización, ciclo de render y eventos XR
├── core/
│   ├── app-state.js       estado observable de la aplicación
│   └── config.js          versiones, tolerancia, colores y sesión XR
├── scene/
│   ├── scene-factory.js   Scene, cámara, renderer, luces, piso y dispose
│   ├── laboratory-factory.js mesa, piezas, destinos y estados visuales
│   ├── immersive-hud.js   panel y botones 3D dentro de VR
│   └── canvas-texture.js  texturas de canvas para etiquetas legibles
├── laboratory/
│   ├── laboratory-data.js pares de piezas y destinos
│   ├── challenge-controller.js reglas, validación y finalización
│   ├── timer.js           cronómetro sin intervalos acumulativos
│   └── feedback.js        colores temporales y tonos de respuesta
├── xr/
│   ├── hand-tracker.js    manos, articulaciones, eventos y tracking
│   └── pointer-ray.js     rayo y cursor de apuntado
├── interaction/
│   └── drag-controller.js raycasting, selección, arrastre y cancelación
└── ui/
    └── landing-page.js    estados y mensajes de la portada HTML
```

### Flujo de interacción

```text
mano XR
  → hand-tracker
  → rayo y raycaster
  → drag-controller
  → challenge-controller al soltar
  → app-state
  → immersive-hud
```

La pieza conserva el offset entre el punto de pinza y su centro para evitar
saltos al tomarla. El arrastre está limitado a un volumen frente al usuario y
solo se pueden seleccionar piezas disponibles o botones del HUD.

## Tecnologías y dependencias

- HTML5 semántico y CSS3.
- Bootstrap `5.3.8` para la portada web.
- Three.js `0.187.0` para WebGL, escena 3D y WebXR.
- WebXR Device API con sesión `immersive-vr`.
- `XRHandModelFactory` para la representación visible de las manos.
- jsDelivr como CDN único para Three.js y sus addons.

El import map se encuentra en `index.html` antes de `src/main.js`:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/"
  }
}
</script>
```

Así, los módulos pueden importar `three` y `three/addons/...` sin rutas absolutas
del proyecto. Las rutas propias usan `./`, por lo que son compatibles con Live
Server y con GitHub Pages bajo `/nombre-del-repositorio/`.

La sesión solicita `local-floor` y declara `hand-tracking` como capacidad
opcional. El proyecto no implementa `immersive-ar`, passthrough, cámara física ni
mandos como sustituto del seguimiento de manos.

## Créditos y licencia

- Three.js: proyecto de código abierto, licencia MIT.
- Bootstrap: proyecto de código abierto, licencia MIT.
- NEXO-5: material educativo original de esta práctica.
