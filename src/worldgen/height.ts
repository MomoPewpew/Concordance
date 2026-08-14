import type { ClimateSample } from './climate'
import { lerp, ridged, smoothstep } from './noise'

/** 0–1 ice cover from air temperature. Water becomes a landmass past this. */
export function iceCover(temperature: number): number {
  return smoothstep(-0.4, -0.62, temperature)
}

/** Signed height in worldgen units. Sea level is 0. */
export function heightFromClimate(c: ClimateSample): number {
  const {
    continentalness,
    erosion,
    weirdness,
    ridgeFine,
    orogeny,
    divergent,
    plateLand,
  } = c

  const plate = smoothstep(0.12, 0.72, plateLand)
  const seafloor = -0.48 + weirdness * 0.032
  const platform = 0.016
  const plateBase = lerp(seafloor, platform, plate)

  const landMask = plate
  const erosion01 = erosion * 0.5 + 0.5
  const rolling = continentalness * 0.05 * landMask
  const modestRidge =
    ridged(weirdness) ** 1.4 * (1 - erosion01) ** 1.45 * landMask * 0.075
  const modestGulley =
    (1 - ridged(ridgeFine)) * (1 - erosion01) * landMask * 0.022

  const peaks = ridged(weirdness) ** 1.25
  const crests = ridged(ridgeFine) ** 2.05
  const mountains = orogeny * (0.36 + peaks * 0.52 + crests * 0.18)
  const beltGulleys =
    orogeny * (1 - ridged(ridgeFine)) * 0.07 * smoothstep(0.18, 0.72, peaks)

  const mor = divergent * (1 - landMask) * 0.11
  const rift = divergent * landMask * 0.048
  const crust =
    plateBase +
    rolling +
    modestRidge -
    modestGulley +
    mountains -
    beltGulleys +
    mor -
    rift

  const freeze = iceCover(c.temperature)
  const ice = 0.016 + ridged(weirdness) * 0.012 + ridged(ridgeFine) * 0.006
  return lerp(crust, Math.max(crust, ice), freeze)
}

/** Colder with altitude. `elevation` is radial offset (height * heightScale). */
export function applyLapseRate(temperature: number, elevation: number): number {
  return temperature - Math.max(elevation, 0) * 9.5
}
