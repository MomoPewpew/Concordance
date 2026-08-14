import type { GlobeParams } from '../data/types'
import {
  createClimateSamplers,
  sampleClimate,
  type ClimateSamplers,
} from './climate'
import {
  LOD0_RES,
  TILES_PER_FACE,
  cubePoint,
  cubeToSphere,
  tileCenter,
  tileId,
} from './cubeSphere'
import { applyLapseRate, heightFromClimate } from './height'
import { isInlandSea, sampleLakeNoise } from './water'

export const SKIRT_DROP = 0.004

export type TileMeshData = {
  face: number
  ti: number
  tj: number
  res: number
  id: number
  center: [number, number, number]
  positions: Float32Array
  elevation: Float32Array
  temperature: Float32Array
  aClimate: Float32Array
  aLake: Float32Array
  indices: Uint32Array
  surfaceCount: number
  surfaceIndexCount: number
  lakePositions: Float32Array | null
  lakeIndices: Uint32Array | null
}

const MIN_LAND = 0.0014

export function generateTile(
  params: GlobeParams,
  face: number,
  ti: number,
  tj: number,
  res: number,
  samplers: ClimateSamplers = createClimateSamplers(params.seed),
): TileMeshData {
  const cols = res + 1
  const surfaceCount = cols * cols
  const skirtRing = cols * 4
  const vertCount = surfaceCount + skirtRing * 2

  const sphereX = new Float32Array(vertCount)
  const sphereY = new Float32Array(vertCount)
  const sphereZ = new Float32Array(vertCount)
  const elevations = new Float32Array(vertCount)
  const temperatures = new Float32Array(vertCount)
  const climates = new Float32Array(vertCount * 3)
  const lakeFlags = new Float32Array(vertCount)

  const u0 = ti / TILES_PER_FACE
  const v0 = tj / TILES_PER_FACE
  const du = 1 / TILES_PER_FACE
  const dv = 1 / TILES_PER_FACE

  const sampleVert = (index: number, u: number, v: number) => {
    const [cx, cy, cz] = cubePoint(face, u, v)
    const [sx, sy, sz] = cubeToSphere(cx, cy, cz)
    const climate = sampleClimate(sx, sy, sz, params, samplers)
    const height = heightFromClimate(climate)
    const elevation = height * params.heightScale
    const lake = isInlandSea(
      climate,
      height,
      params,
      sampleLakeNoise(samplers.lake, sx, sy, sz),
    )
    sphereX[index] = sx
    sphereY[index] = sy
    sphereZ[index] = sz
    elevations[index] = elevation
    temperatures[index] = applyLapseRate(climate.temperature, elevation)
    climates[index * 3] = climate.continentalness
    climates[index * 3 + 1] = climate.humidity
    climates[index * 3 + 2] = climate.erosion
    lakeFlags[index] = lake ? 1 : 0
  }

  for (let j = 0; j < cols; j++) {
    const v = v0 + (j / res) * dv
    for (let i = 0; i < cols; i++) {
      const u = u0 + (i / res) * du
      sampleVert(j * cols + i, u, v)
    }
  }

  const southBot = surfaceCount
  const northBot = surfaceCount + cols
  const westBot = surfaceCount + cols * 2
  const eastBot = surfaceCount + cols * 3
  const southTop = surfaceCount + skirtRing
  const northTop = southTop + cols
  const westTop = southTop + cols * 2
  const eastTop = southTop + cols * 3
  for (let i = 0; i < cols; i++) {
    const s = i
    const n = res * cols + i
    const w = i * cols
    const e = i * cols + res
    copyVert(southBot + i, s, sphereX, sphereY, sphereZ, elevations, temperatures, climates, lakeFlags)
    copyVert(northBot + i, n, sphereX, sphereY, sphereZ, elevations, temperatures, climates, lakeFlags)
    copyVert(westBot + i, w, sphereX, sphereY, sphereZ, elevations, temperatures, climates, lakeFlags)
    copyVert(eastBot + i, e, sphereX, sphereY, sphereZ, elevations, temperatures, climates, lakeFlags)
    copyVert(southTop + i, s, sphereX, sphereY, sphereZ, elevations, temperatures, climates, lakeFlags)
    copyVert(northTop + i, n, sphereX, sphereY, sphereZ, elevations, temperatures, climates, lakeFlags)
    copyVert(westTop + i, w, sphereX, sphereY, sphereZ, elevations, temperatures, climates, lakeFlags)
    copyVert(eastTop + i, e, sphereX, sphereY, sphereZ, elevations, temperatures, climates, lakeFlags)
  }

  const indexList: number[] = []
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const a = j * cols + i
      const b = j * cols + (i + 1)
      const c = (j + 1) * cols + (i + 1)
      const d = (j + 1) * cols + i
      indexList.push(a, b, c, a, c, d)
    }
  }
  const surfaceIndexCount = indexList.length
  for (let i = 0; i < res; i++) {
    indexList.push(
      southTop + i,
      southBot + i,
      southBot + i + 1,
      southTop + i,
      southBot + i + 1,
      southTop + i + 1,
    )
    indexList.push(
      northTop + i,
      northTop + i + 1,
      northBot + i + 1,
      northTop + i,
      northBot + i + 1,
      northBot + i,
    )
    indexList.push(
      westTop + i,
      westTop + i + 1,
      westBot + i + 1,
      westTop + i,
      westBot + i + 1,
      westBot + i,
    )
    indexList.push(
      eastTop + i,
      eastBot + i,
      eastBot + i + 1,
      eastTop + i,
      eastBot + i + 1,
      eastTop + i + 1,
    )
  }

  ensureOutwardWinding(sphereX, sphereY, sphereZ, indexList)

  const parent = new Int32Array(surfaceCount).fill(-1)
  const find = (a: number): number => {
    let i = a
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }
  const union = (a: number, b: number) => {
    const pa = find(a)
    const pb = find(b)
    if (pa !== pb) parent[pa] = pb
  }

  for (let i = 0; i < surfaceCount; i++) {
    if (lakeFlags[i]) parent[i] = i
  }
  for (let t = 0; t < res * res * 6; t += 3) {
    const a = indexList[t]
    const b = indexList[t + 1]
    const c = indexList[t + 2]
    if (a >= surfaceCount || b >= surfaceCount || c >= surfaceCount) continue
    if (lakeFlags[a] && lakeFlags[b]) union(a, b)
    if (lakeFlags[b] && lakeFlags[c]) union(b, c)
    if (lakeFlags[c] && lakeFlags[a]) union(c, a)
  }

  const maxElev = new Map<number, number>()
  for (let i = 0; i < surfaceCount; i++) {
    if (!lakeFlags[i]) continue
    const root = find(i)
    const prev = maxElev.get(root) ?? -Infinity
    if (elevations[i] > prev) maxElev.set(root, elevations[i])
  }

  const lakeRadius = new Float32Array(surfaceCount)
  for (let i = 0; i < surfaceCount; i++) {
    if (!lakeFlags[i]) continue
    lakeRadius[i] = 1 + (maxElev.get(find(i)) ?? elevations[i]) + 0.0007
  }

  const positions = new Float32Array(vertCount * 3)
  for (let i = 0; i < vertCount; i++) {
    const src = skirtSource(i, surfaceCount, cols, res, skirtRing)
    const elevation = elevations[src]
    const isSkirtBot = i >= surfaceCount && i < surfaceCount + skirtRing
    const displaced = lakeFlags[src]
      ? lakeRadius[src] - 1 - 0.0009
      : elevation > params.seaLevel
        ? Math.max(elevation, MIN_LAND)
        : elevation
    const radius = 1 + displaced - (isSkirtBot ? SKIRT_DROP : 0)
    positions[i * 3] = sphereX[i] * radius
    positions[i * 3 + 1] = sphereY[i] * radius
    positions[i * 3 + 2] = sphereZ[i] * radius
  }

  const lakePos: number[] = []
  const lakeIdx: number[] = []
  const lakeIndexOf = new Map<number, number>()
  const lakeVert = (i: number): number => {
    const existing = lakeIndexOf.get(i)
    if (existing !== undefined) return existing
    const next = lakeIndexOf.size
    lakeIndexOf.set(i, next)
    const r = lakeRadius[i]
    lakePos.push(sphereX[i] * r, sphereY[i] * r, sphereZ[i] * r)
    return next
  }
  for (let t = 0; t < res * res * 6; t += 3) {
    const a = indexList[t]
    const b = indexList[t + 1]
    const c = indexList[t + 2]
    if (a >= surfaceCount || b >= surfaceCount || c >= surfaceCount) continue
    if (!lakeFlags[a] || !lakeFlags[b] || !lakeFlags[c]) continue
    lakeIdx.push(lakeVert(a), lakeVert(b), lakeVert(c))
  }

  return {
    face,
    ti,
    tj,
    res,
    id: tileId(face, ti, tj),
    center: tileCenter(face, ti, tj),
    positions,
    elevation: elevations,
    temperature: temperatures,
    aClimate: climates,
    aLake: lakeFlags,
    indices: new Uint32Array(indexList),
    surfaceCount,
    surfaceIndexCount,
    lakePositions: lakePos.length > 0 ? new Float32Array(lakePos) : null,
    lakeIndices: lakeIdx.length > 0 ? new Uint32Array(lakeIdx) : null,
  }
}

export function generateLod0Tiles(params: GlobeParams): TileMeshData[] {
  const samplers = createClimateSamplers(params.seed)
  const tiles: TileMeshData[] = []
  for (let face = 0; face < 6; face++) {
    for (let tj = 0; tj < TILES_PER_FACE; tj++) {
      for (let ti = 0; ti < TILES_PER_FACE; ti++) {
        tiles.push(generateTile(params, face, ti, tj, LOD0_RES, samplers))
      }
    }
  }
  return tiles
}

function skirtSource(
  i: number,
  surfaceCount: number,
  cols: number,
  res: number,
  skirtRing: number,
): number {
  if (i < surfaceCount) return i
  const ring = (i - surfaceCount) % skirtRing
  if (ring < cols) return ring
  if (ring < cols * 2) return res * cols + (ring - cols)
  if (ring < cols * 3) return (ring - cols * 2) * cols
  return (ring - cols * 3) * cols + res
}

function copyVert(
  dest: number,
  src: number,
  sphereX: Float32Array,
  sphereY: Float32Array,
  sphereZ: Float32Array,
  elevations: Float32Array,
  temperatures: Float32Array,
  climates: Float32Array,
  lakeFlags: Float32Array,
): void {
  sphereX[dest] = sphereX[src]
  sphereY[dest] = sphereY[src]
  sphereZ[dest] = sphereZ[src]
  elevations[dest] = elevations[src]
  temperatures[dest] = temperatures[src]
  climates[dest * 3] = climates[src * 3]
  climates[dest * 3 + 1] = climates[src * 3 + 1]
  climates[dest * 3 + 2] = climates[src * 3 + 2]
  lakeFlags[dest] = lakeFlags[src]
}

function ensureOutwardWinding(
  x: Float32Array,
  y: Float32Array,
  z: Float32Array,
  indices: number[],
): void {
  for (let t = 0; t < indices.length; t += 3) {
    const ia = indices[t]
    const ib = indices[t + 1]
    const ic = indices[t + 2]
    const ax = x[ia]
    const ay = y[ia]
    const az = z[ia]
    const e1x = x[ib] - ax
    const e1y = y[ib] - ay
    const e1z = z[ib] - az
    const e2x = x[ic] - ax
    const e2y = y[ic] - ay
    const e2z = z[ic] - az
    const nx = e1y * e2z - e1z * e2y
    const ny = e1z * e2x - e1x * e2z
    const nz = e1x * e2y - e1y * e2x
    const cx = (ax + x[ib] + x[ic]) / 3
    const cy = (ay + y[ib] + y[ic]) / 3
    const cz = (az + z[ib] + z[ic]) / 3
    if (nx * cx + ny * cy + nz * cz < 0) {
      indices[t + 1] = ic
      indices[t + 2] = ib
    }
  }
}
