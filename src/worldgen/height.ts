import type { ClimateSample } from './climate'
import { remap, ridged, smoothstep } from './noise'

/** Signed height in worldgen units. Sea level is 0. */
export function heightFromClimate(c: ClimateSample): number {
  const { continentalness, erosion, weirdness } = c

  const base =
    continentalness < -0.19
      ? remap(continentalness, -1, -0.19, -0.65, -0.008)
      : remap(continentalness, -0.19, 1, 0.004, 0.26)

  const landMask = smoothstep(-0.1, 0.2, continentalness)
  const erosion01 = erosion * 0.5 + 0.5
  const mountain = (1 - erosion01) ** 1.7
  const peaks = ridged(weirdness) * mountain * landMask

  return base + peaks * 0.62
}

/** Colder with altitude. `elevation` is radial offset (height * heightScale). */
export function applyLapseRate(temperature: number, elevation: number): number {
  return temperature - Math.max(elevation, 0) * 9.5
}
