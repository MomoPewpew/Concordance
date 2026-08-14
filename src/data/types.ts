/** Future auth identity. Unused in the globe POC. */
export type User = {
  id: string
  displayName: string
  universeIds: string[]
}

export type Universe = {
  id: string
  name: string
  ownerId?: string
  worlds: World[]
}

export type World = {
  id: string
  universeId: string
  name: string
  globe: GlobeParams
}

export type NoiseLayer = {
  scale: number
  octaves: number
  persistence: number
  lacunarity: number
  offset: [number, number, number]
}

/**
 * Everything needed to rebuild a globe. Geometry is never stored —
 * a world is seed + these params.
 */
export type GlobeParams = {
  seed: number
  /** Elevation zero. Unit sphere radius is 1; this is the height threshold. */
  seaLevel: number
  /** Multiplier from worldgen height to radial displacement. */
  heightScale: number
  /** Grid resolution per cube-sphere face (verts per edge ≈ resolution + 1). */
  resolution: number
  /** Shift continentalness down for more ocean, up for more land. */
  oceanBias: number
  /** Obliquity in degrees. 0 = spin axis aligned with the orbit axis. */
  axialTilt: number
  continentalness: NoiseLayer
  erosion: NoiseLayer
  weirdness: NoiseLayer
  temperature: NoiseLayer
  humidity: NoiseLayer
}

/** Pin on a world. Lat/lon in degrees. */
export type ArticlePin = {
  worldId: string
  lat: number
  lon: number
}

/** Hyperlinked article stub. Persistence and wiki editing come later. */
export type Article = {
  id: string
  universeId: string
  worldId?: string
  title: string
  body: string
  pin?: ArticlePin
}
