import type { GlobeParams, Universe, World } from './types'

const globe: GlobeParams = {
  seed: 1729,
  seaLevel: 0,
  heightScale: 0.082,
  resolution: 320,
  oceanBias: -0.22,
  axialTilt: 0,
  continentalness: {
    scale: 1.05,
    octaves: 4,
    persistence: 0.45,
    lacunarity: 2.1,
    offset: [0, 0, 0],
  },
  erosion: {
    scale: 2.85,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2.1,
    offset: [12.4, 3.1, 7.7],
  },
  weirdness: {
    scale: 3.4,
    octaves: 4,
    persistence: 0.48,
    lacunarity: 2.15,
    offset: [30.2, 18.5, 4.4],
  },
  temperature: {
    scale: 1.55,
    octaves: 3,
    persistence: 0.5,
    lacunarity: 2,
    offset: [50, 2, 9],
  },
  humidity: {
    scale: 2.05,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2,
    offset: [8, 40, 15],
  },
}

export const sampleWorld: World = {
  id: 'world-aethel',
  universeId: 'universe-poc',
  name: 'Aethel',
  globe,
}

export const sampleUniverse: Universe = {
  id: 'universe-poc',
  name: 'POC Universe',
  worlds: [sampleWorld],
}
