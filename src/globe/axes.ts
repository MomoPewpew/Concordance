import { Vector3 } from 'three'

/** Local planet pole axis. Tilt is applied by rotating the planet group. */
export const PLANET_SPIN_AXIS = new Vector3(0, 1, 0)

/**
 * Normal to the orbital plane (revolution around the sun).
 * Stays world +Y; axial tilt rotates the planet under this axis.
 */
export const ORBIT_AXIS = new Vector3(0, 1, 0)

export const SPIN_AXIS_COLOR = '#7dd3fc'
export const ORBIT_AXIS_COLOR = '#fbbf24'
