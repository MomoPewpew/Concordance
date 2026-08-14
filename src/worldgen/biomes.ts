import type { ClimateSample } from './climate'
import { srgbToLinear } from './noise'

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
} as const

export type BiomeId = (typeof BIOME)[keyof typeof BIOME]

const SRGB: Record<BiomeId, [number, number, number]> = {
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
}

export const BIOME_COLORS: Record<BiomeId, [number, number, number]> = (() => {
  const out = {} as Record<BiomeId, [number, number, number]>
  for (const id of Object.keys(SRGB) as BiomeId[]) {
    const [r, g, b] = SRGB[id]
    out[id] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)]
  }
  return out
})()

export function pickBiome(
  climate: ClimateSample,
  height: number,
  temperature: number,
): BiomeId {
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
