export const APP_CONFIG = Object.freeze({
  name: 'NEXO-5',
  title: 'Laboratorio virtual de manipulación y ensamblaje 3D',
  threeVersion: '0.187.0',
  bootstrapVersion: '5.3.8',
  assemblyToleranceMeters: 0.12,
  xrSessionInit: Object.freeze({
    requiredFeatures: ['local-floor'],
    optionalFeatures: ['hand-tracking']
  }),
  colors: Object.freeze({
    background: 0x101b24,
    table: 0x233843,
    tableEdge: 0x3db7aa,
    grid: 0x31505a,
    mist: 0xdce9ea,
    teal: 0x3db7aa,
    amber: 0xf2b84b,
    violet: 0x8178e8,
    coral: 0xe26d6d
  })
});
