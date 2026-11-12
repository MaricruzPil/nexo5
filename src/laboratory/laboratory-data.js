function freezeDefinition(definition) {
  return Object.freeze({
    ...definition,
    sourcePosition: Object.freeze([...definition.sourcePosition]),
    sourceRotation: Object.freeze([...definition.sourceRotation]),
    targetPosition: Object.freeze([...definition.targetPosition]),
    targetRotation: Object.freeze([...definition.targetRotation])
  });
}

export const LABORATORY_DEFINITIONS = Object.freeze([
  freezeDefinition({
    id: 'piece-cube',
    targetId: 'target-cube',
    kind: 'cube',
    label: 'CUBO',
    color: 0x3db7aa,
    sourcePosition: [-1.0, 1.28, -1.13],
    sourceRotation: [0.12, 0.28, 0.08],
    targetPosition: [-1.0, 1.23, -1.78],
    targetRotation: [0, 0, 0]
  }),
  freezeDefinition({
    id: 'piece-orb',
    targetId: 'target-orb',
    kind: 'orb',
    label: 'ESFERA',
    color: 0x8178e8,
    sourcePosition: [-0.5, 1.27, -1.13],
    sourceRotation: [0, 0, 0],
    targetPosition: [-0.5, 1.25, -1.78],
    targetRotation: [0, 0, 0]
  }),
  freezeDefinition({
    id: 'piece-cone',
    targetId: 'target-cone',
    kind: 'cone',
    label: 'CONO',
    color: 0xf2b84b,
    sourcePosition: [0, 1.27, -1.13],
    sourceRotation: [0.2, 0.18, -0.12],
    targetPosition: [0, 1.27, -1.78],
    targetRotation: [0, 0, 0]
  }),
  freezeDefinition({
    id: 'piece-cylinder',
    targetId: 'target-cylinder',
    kind: 'cylinder',
    label: 'CILINDRO',
    color: 0xe26d6d,
    sourcePosition: [0.5, 1.27, -1.13],
    sourceRotation: [0.12, 0.24, 0.08],
    targetPosition: [0.5, 1.27, -1.78],
    targetRotation: [0, 0, 0]
  }),
  freezeDefinition({
    id: 'piece-prism',
    targetId: 'target-prism',
    kind: 'prism',
    label: 'PRISMA',
    color: 0x74e0d1,
    sourcePosition: [1.0, 1.26, -1.13],
    sourceRotation: [0.18, 0.35, 0.1],
    targetPosition: [1.0, 1.25, -1.78],
    targetRotation: [0, 0, 0]
  })
]);

export const LABORATORY_TOTAL = LABORATORY_DEFINITIONS.length;
