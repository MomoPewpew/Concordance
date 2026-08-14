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
  /** Quality knob for near-camera tile density (128–512). */
  resolution: number
  /** Shift continentalness down for more ocean, up for more land. */
  oceanBias: number
  /** Obliquity in degrees. 0 = spin axis aligned with the orbit axis. */
  axialTilt: number
  /** Polar flattening. 0 = sphere. Applied as a Y scale on the planet. */
  flattening: number
  /** 0 = no interior water, 1 = large epeiric seas and lakes. */
  inlandSeas: number
  continentalness: NoiseLayer
  erosion: NoiseLayer
  weirdness: NoiseLayer
  temperature: NoiseLayer
  humidity: NoiseLayer
}

/** Auto-named landform from the climate field. */
export type FeatureKind = 'peak' | 'basin' | 'island' | 'lake'

/** Pin on a world. Lat/lon in degrees. */
export type ArticlePin = {
  worldId: string
  lat: number
  lon: number
}

/** Hyperlinked article. Wiki links use [[Title]]. */
export type Article = {
  id: string
  universeId: string
  worldId?: string
  title: string
  body: string
  pin?: ArticlePin
  /** Set when the article was generated from a named feature. */
  feature?: FeatureKind
}

export type LookTarget = {
  lat: number
  lon: number
  nonce: number
}
