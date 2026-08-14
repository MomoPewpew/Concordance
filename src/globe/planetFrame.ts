export function planetLocalToWorld(
  x: number,
  y: number,
  z: number,
  axialTilt: number,
  dayAngle: number,
): [number, number, number] {
  const tilt = -(axialTilt * Math.PI) / 180
  const day = (dayAngle * Math.PI) / 180
  const cd = Math.cos(day)
  const sd = Math.sin(day)
  const x1 = x * cd + z * sd
  const y1 = y
  const z1 = -x * sd + z * cd
  const ct = Math.cos(tilt)
  const st = Math.sin(tilt)
  return [x1 * ct - y1 * st, x1 * st + y1 * ct, z1]
}

export function planetWorldToLocal(
  x: number,
  y: number,
  z: number,
  axialTilt: number,
  dayAngle: number,
): [number, number, number] {
  const tilt = -(axialTilt * Math.PI) / 180
  const day = (dayAngle * Math.PI) / 180
  const ct = Math.cos(-tilt)
  const st = Math.sin(-tilt)
  const x1 = x * ct - y * st
  const y1 = x * st + y * ct
  const z1 = z
  const cd = Math.cos(-day)
  const sd = Math.sin(-day)
  return [x1 * cd + z1 * sd, y1, -x1 * sd + z1 * cd]
}
