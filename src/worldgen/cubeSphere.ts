export const TILES_PER_FACE = 4
export const FACE_COUNT = 6
export const LOD0_RES = 16
export const LOD1_RES = 48
export const MIN_TILE_RES = 32
export const MAX_TILE_RES = 96

export type FaceLayout = {
  origin: [number, number, number]
  right: [number, number, number]
  up: [number, number, number]
}

export const FACE_LAYOUTS: FaceLayout[] = [
  { origin: [1, -1, -1], right: [0, 0, 2], up: [0, 2, 0] },
  { origin: [-1, -1, 1], right: [0, 0, -2], up: [0, 2, 0] },
  { origin: [-1, 1, -1], right: [2, 0, 0], up: [0, 0, 2] },
  { origin: [-1, -1, 1], right: [2, 0, 0], up: [0, 0, -2] },
  { origin: [-1, -1, 1], right: [2, 0, 0], up: [0, 2, 0] },
  { origin: [1, -1, -1], right: [-2, 0, 0], up: [0, 2, 0] },
]

export function cubeToSphere(
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  const x2 = x * x
  const y2 = y * y
  const z2 = z * z
  return [
    x * Math.sqrt(1 - y2 / 2 - z2 / 2 + (y2 * z2) / 3),
    y * Math.sqrt(1 - z2 / 2 - x2 / 2 + (z2 * x2) / 3),
    z * Math.sqrt(1 - x2 / 2 - y2 / 2 + (x2 * y2) / 3),
  ]
}

export function maxTileRes(resolution: number): number {
  return Math.round(
    Math.min(MAX_TILE_RES, Math.max(MIN_TILE_RES, resolution / 5)),
  )
}

export function lodResolutions(maxRes: number): number[] {
  const levels = [LOD0_RES]
  const mid = Math.min(LOD1_RES, maxRes)
  if (mid > LOD0_RES) levels.push(mid)
  if (maxRes > mid) levels.push(maxRes)
  return levels
}

export function cubePoint(
  face: number,
  u: number,
  v: number,
): [number, number, number] {
  const layout = FACE_LAYOUTS[face]
  return [
    layout.origin[0] + layout.right[0] * u + layout.up[0] * v,
    layout.origin[1] + layout.right[1] * u + layout.up[1] * v,
    layout.origin[2] + layout.right[2] * u + layout.up[2] * v,
  ]
}

export function tileCenter(
  face: number,
  ti: number,
  tj: number,
): [number, number, number] {
  const u = (ti + 0.5) / TILES_PER_FACE
  const v = (tj + 0.5) / TILES_PER_FACE
  const [cx, cy, cz] = cubePoint(face, u, v)
  return cubeToSphere(cx, cy, cz)
}

export function tileId(face: number, ti: number, tj: number): number {
  return (face * TILES_PER_FACE + tj) * TILES_PER_FACE + ti
}
