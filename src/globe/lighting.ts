import { Vector3 } from 'three'
import { srgbToLinear } from '../worldgen/noise'
import { ORBIT_AXIS } from './axes'

/** Direction to the system's star. Always perpendicular to the orbit axis. */
export const STAR_DIRECTION = (() => {
  const dir = new Vector3(4.2, 2.4, 3.6)
  return dir.addScaledVector(ORBIT_AXIS, -dir.dot(ORBIT_AXIS)).normalize()
})()

export const ROCK_COLOR = new Vector3(
  srgbToLinear(0.42),
  srgbToLinear(0.39),
  srgbToLinear(0.35),
)

export const SAND_COLOR = new Vector3(
  srgbToLinear(0.9),
  srgbToLinear(0.8),
  srgbToLinear(0.58),
)

export const SNOW_COLOR = new Vector3(
  srgbToLinear(0.95),
  srgbToLinear(0.97),
  srgbToLinear(0.99),
)

export const OCEAN_DEEP = new Vector3(
  srgbToLinear(0.02),
  srgbToLinear(0.08),
  srgbToLinear(0.18),
)

export const OCEAN_SHALLOW = new Vector3(
  srgbToLinear(0.12),
  srgbToLinear(0.42),
  srgbToLinear(0.55),
)

export const ATMOSPHERE_COLOR = new Vector3(
  srgbToLinear(0.45),
  srgbToLinear(0.7),
  srgbToLinear(1),
)

export const CLOUD_COLOR = new Vector3(
  srgbToLinear(0.93),
  srgbToLinear(0.95),
  srgbToLinear(0.98),
)

export const RAIN_COLOR = new Vector3(
  srgbToLinear(0.62),
  srgbToLinear(0.76),
  srgbToLinear(0.95),
)
