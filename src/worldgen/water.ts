import type { NoiseFunction3D } from 'simplex-noise'
import type { GlobeParams } from '../data/types'
import type { ClimateSample } from './climate'
import { iceCover } from './height'
import { fbm3 } from './noise'

export function sampleLakeNoise(
  sampler: NoiseFunction3D,
  x: number,
  y: number,
  z: number,
): number {
  return fbm3(sampler, x, y, z, {
    scale: 2.15,
    octaves: 3,
    persistence: 0.48,
    lacunarity: 2.05,
    offset: [71.2, 4.4, 19.1],
  })
}

/** Landlocked water above the global ocean, from a higher local water table. */
export function isInlandSea(
  climate: ClimateSample,
  height: number,
  params: GlobeParams,
  lakeNoise: number,
): boolean {
  const amount = params.inlandSeas ?? 0
  if (amount < 0.02) return false
  if (height <= 0) return false
  if (iceCover(climate.temperature) > 0.45) return false
  if (climate.continentalness < 0.05) return false
  const maxFill = 0.005 + amount * 0.024
  if (height > maxFill) return false
  const wet = climate.humidity * 0.35 + (climate.erosion > 0 ? 0.08 : 0)
  const threshold = 0.38 - amount * 0.32 - wet
  return lakeNoise > threshold
}
