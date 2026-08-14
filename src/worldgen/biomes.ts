import type { ClimateSample } from './climate'
import { clamp, srgbToLinear } from './noise'

function mix3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const k = clamp(t, 0, 1)
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ]
}

function smoother(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export const BIOME = {
  frozenOcean: 'frozen_ocean',
  coldOcean: 'cold_ocean',
  ocean: 'ocean',
  warmOcean: 'warm_ocean',
  beach: 'beach',
  snowyBeach: 'snowy_beach',
  stonyShore: 'stony_shore',
  desert: 'desert',
  savanna: 'savanna',
  plains: 'plains',
  forest: 'forest',
  jungle: 'jungle',
  swamp: 'swamp',
  taiga: 'taiga',
  snowyPlains: 'snowy_plains',
  meadow: 'meadow',
  grove: 'grove',
  snowySlopes: 'snowy_slopes',
  stonyPeaks: 'stony_peaks',
  frozenPeaks: 'frozen_peaks',
  windswept: 'windswept',
  inlandSea: 'inland_sea',
} as const

export type BiomeId = (typeof BIOME)[keyof typeof BIOME]

export const BIOME_SRGB: Record<BiomeId, [number, number, number]> = {
  frozen_ocean: [0.78, 0.86, 0.9],
  cold_ocean: [0.12, 0.28, 0.42],
  ocean: [0.08, 0.32, 0.58],
  warm_ocean: [0.08, 0.48, 0.62],
  beach: [0.91, 0.82, 0.62],
  snowy_beach: [0.89, 0.87, 0.82],
  stony_shore: [0.45, 0.44, 0.4],
  desert: [0.86, 0.74, 0.45],
  savanna: [0.74, 0.68, 0.32],
  plains: [0.48, 0.68, 0.28],
  forest: [0.18, 0.46, 0.22],
  jungle: [0.1, 0.36, 0.16],
  swamp: [0.3, 0.36, 0.18],
  taiga: [0.22, 0.36, 0.28],
  snowy_plains: [0.9, 0.93, 0.95],
  meadow: [0.46, 0.66, 0.32],
  grove: [0.24, 0.42, 0.28],
  snowy_slopes: [0.82, 0.86, 0.88],
  stony_peaks: [0.58, 0.56, 0.52],
  frozen_peaks: [0.94, 0.96, 0.97],
  windswept: [0.52, 0.55, 0.42],
  inland_sea: [0.12, 0.42, 0.48],
}

export const BIOME_COLORS: Record<BiomeId, [number, number, number]> = (() => {
  const out = {} as Record<BiomeId, [number, number, number]>
  for (const id of Object.keys(BIOME_SRGB) as BiomeId[]) {
    const [r, g, b] = BIOME_SRGB[id]
    out[id] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)]
  }
  return out
})()

/**
 * Soft land/ocean colors from climate. Keep in sync with `blendBiomeColor`
 * in `src/shaders/globeShaders.ts`.
 */
export function blendBiomeSrgb(
  continentalness: number,
  humidity: number,
  erosion: number,
  height: number,
  temperature: number,
): [number, number, number] {
  const C = BIOME_SRGB
  const t = temperature
  const h = humidity
  const e = erosion

  if (height <= 0) {
    let ocean = mix3(C.frozen_ocean, C.cold_ocean, smoother(-0.62, -0.38, t))
    ocean = mix3(ocean, C.ocean, smoother(-0.32, -0.08, t))
    return mix3(ocean, C.warm_ocean, smoother(0.28, 0.52, t))
  }

  const hot = mix3(
    mix3(C.desert, C.savanna, smoother(-0.16, 0.0, h)),
    C.jungle,
    smoother(-0.02, 0.18, h),
  )
  let warm = mix3(C.desert, C.plains, smoother(-0.28, -0.08, h))
  warm = mix3(warm, C.forest, smoother(-0.08, 0.12, h))
  const swampW =
    smoother(0.12, 0.28, h) *
    smoother(-0.02, 0.12, e) *
    (1 - smoother(0.035, 0.07, height))
  warm = mix3(warm, C.swamp, swampW)
  const cool = mix3(C.plains, C.taiga, smoother(-0.08, 0.12, h))
  const cold = mix3(C.snowy_plains, C.taiga, smoother(-0.22, 0.0, h))

  let low = mix3(C.snowy_plains, cold, smoother(-0.62, -0.42, t))
  low = mix3(low, cool, smoother(-0.42, -0.22, t))
  low = mix3(low, warm, smoother(-0.22, 0.08, t))
  low = mix3(low, hot, smoother(0.18, 0.42, t))

  let highland = mix3(C.meadow, C.grove, 1 - smoother(-0.22, -0.02, t))
  highland = mix3(highland, C.snowy_slopes, 1 - smoother(-0.52, -0.28, t))
  const wind =
    (1 - smoother(-0.36, -0.18, e)) *
    (1 - smoother(-0.12, 0.05, h)) *
    smoother(-0.48, -0.28, t)
  highland = mix3(highland, C.windswept, wind)
  const peak = mix3(C.stony_peaks, C.frozen_peaks, 1 - smoother(-0.36, -0.08, t))

  const highlandW =
    (1 - smoother(-0.14, -0.02, e)) *
    smoother(-0.06, 0.04, continentalness) *
    smoother(0.01, 0.024, height)
  const peakW = (1 - smoother(-0.42, -0.22, e)) * smoother(0.018, 0.038, height)
  const shoreW =
    (1 - smoother(0.0008, 0.016, height)) *
    (1 - smoother(-0.12, 0.1, continentalness))
  let shore = mix3(C.beach, C.snowy_beach, 1 - smoother(-0.38, -0.18, t))
  shore = mix3(shore, C.stony_shore, 1 - smoother(-0.48, -0.32, e))

  let col = mix3(low, highland, highlandW)
  col = mix3(col, peak, peakW)
  return mix3(col, shore, shoreW)
}

export function pickBiome(
  climate: ClimateSample,
  height: number,
  temperature: number,
  lake = false,
): BiomeId {
  if (lake) return BIOME.inlandSea

  const { continentalness, erosion, humidity } = climate
  const t = temperature
  const h = humidity
  const e = erosion

  if (continentalness < -0.19 || height <= 0) {
    if (t < -0.5) return BIOME.frozenOcean
    if (t < -0.18) return BIOME.coldOcean
    if (t > 0.45) return BIOME.warmOcean
    return BIOME.ocean
  }

  if (height > 0 && continentalness < -0.135) {
    if (e < -0.4) return BIOME.stonyShore
    if (t < -0.28) return BIOME.snowyBeach
    return BIOME.beach
  }

  const isPeak = e < -0.35 && height > 0.03
  const isHighland = e < -0.08 && continentalness > -0.02 && height > 0.018

  if (isPeak) {
    if (t < -0.22) return BIOME.frozenPeaks
    return BIOME.stonyPeaks
  }

  if (isHighland) {
    if (t < -0.42) return BIOME.snowySlopes
    if (t < -0.12) return BIOME.grove
    if (e < -0.3 && h < 0) return BIOME.windswept
    return BIOME.meadow
  }

  if (t > 0.32) {
    if (h < -0.08) return BIOME.desert
    if (h < 0.08) return BIOME.savanna
    return BIOME.jungle
  }

  if (t > 0.0) {
    if (h > 0.22 && e > 0.05 && height < 0.05) return BIOME.swamp
    if (h > 0.02) return BIOME.forest
    if (h < -0.18) return BIOME.desert
    return BIOME.plains
  }

  if (t > -0.32) {
    if (h > 0) return BIOME.taiga
    return BIOME.plains
  }

  if (t > -0.52) {
    return h > -0.12 ? BIOME.taiga : BIOME.snowyPlains
  }

  return BIOME.snowyPlains
}

export function biomeLabel(id: BiomeId): string {
  return id
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
