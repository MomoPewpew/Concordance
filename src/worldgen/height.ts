import type { ClimateSample } from './climate'
import { lerp, remap, ridged, smoothstep } from './noise'

/** Signed height in worldgen units. Sea level is 0. */
export function heightFromClimate(c: ClimateSample): number {
  const { continentalness, erosion, weirdness, ridgeFine } = c

  const ocean = remap(continentalness, -1, -0.19, -0.65, 0)
  const land = remap(continentalness, -0.19, 1, 0, 0.26)
  const base = lerp(ocean, land, smoothstep(-0.28, -0.1, continentalness))

  const landMask = smoothstep(-0.16, 0.18, continentalness)
  const erosion01 = erosion * 0.5 + 0.5
  const mountain = (1 - erosion01) ** 1.7
  const peaks = ridged(weirdness) ** 1.35 * mountain * landMask
  const crests = ridged(ridgeFine) ** 2.1 * mountain * landMask
  const gulleys =
    (1 - ridged(ridgeFine)) * mountain * landMask * smoothstep(0.04, 0.16, peaks)

  return base + peaks * 0.66 + crests * 0.2 - gulleys * 0.07
}

/** Colder with altitude. `elevation` is radial offset (height * heightScale). */
export function applyLapseRate(temperature: number, elevation: number): number {
  return temperature - Math.max(elevation, 0) * 9.5
}
