import { BufferAttribute, BufferGeometry } from 'three'
import type { GlobeParams } from '../data/types'
import { BIOME_COLORS, pickBiome } from './biomes'
import { createClimateSamplers, sampleClimate } from './climate'
import { applyLapseRate, heightFromClimate } from './height'
import { isInlandSea, sampleLakeNoise } from './water'

const FACE_LAYOUTS: Array<{
  origin: [number, number, number]
  right: [number, number, number]
  up: [number, number, number]
}> = [
  { origin: [1, -1, -1], right: [0, 0, 2], up: [0, 2, 0] },
  { origin: [-1, -1, 1], right: [0, 0, -2], up: [0, 2, 0] },
  { origin: [-1, 1, -1], right: [2, 0, 0], up: [0, 0, 2] },
  { origin: [-1, -1, 1], right: [2, 0, 0], up: [0, 0, -2] },
  { origin: [-1, -1, 1], right: [2, 0, 0], up: [0, 2, 0] },
  { origin: [1, -1, -1], right: [-2, 0, 0], up: [0, 2, 0] },
]

function cubeToSphere(x: number, y: number, z: number): [number, number, number] {
  const x2 = x * x
  const y2 = y * y
  const z2 = z * z
  return [
    x * Math.sqrt(1 - y2 / 2 - z2 / 2 + (y2 * z2) / 3),
    y * Math.sqrt(1 - z2 / 2 - x2 / 2 + (z2 * x2) / 3),
    z * Math.sqrt(1 - x2 / 2 - y2 / 2 + (x2 * y2) / 3),
  ]
}

function vertKey(x: number, y: number, z: number): string {
  return `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`
}

function cacheKey(params: GlobeParams): string {
  return `v3:${JSON.stringify(params, (key, value) =>
    key === 'axialTilt' || key === 'flattening' ? undefined : value,
  )}`
}

type GlobeMeshes = {
  terrain: BufferGeometry
  lakes: BufferGeometry | null
}

const geometryCache = new Map<string, GlobeMeshes>()

export function generateTerrain(params: GlobeParams): BufferGeometry {
  return generateGlobeMeshes(params).terrain
}

export function generateLakes(params: GlobeParams): BufferGeometry | null {
  return generateGlobeMeshes(params).lakes
}

export function generateGlobeMeshes(params: GlobeParams): GlobeMeshes {
  const key = cacheKey(params)
  const cached = geometryCache.get(key)
  if (cached) return cached

  const res = params.resolution
  const samplers = createClimateSamplers(params.seed)
  const indexOf = new Map<string, number>()
  const sphereX: number[] = []
  const sphereY: number[] = []
  const sphereZ: number[] = []
  const elevations: number[] = []
  const temperatures: number[] = []
  const climates: number[] = []
  const colors: number[] = []
  const lakeFlags: number[] = []
  const indices: number[] = []

  const getIndex = (cx: number, cy: number, cz: number): number => {
    const k = vertKey(cx, cy, cz)
    const existing = indexOf.get(k)
    if (existing !== undefined) return existing

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
    const temperature = applyLapseRate(climate.temperature, elevation)
    const biome = pickBiome(climate, height, temperature, lake)
    const [r, g, b] = BIOME_COLORS[biome]

    const i = sphereX.length
    indexOf.set(k, i)
    sphereX.push(sx)
    sphereY.push(sy)
    sphereZ.push(sz)
    elevations.push(elevation)
    temperatures.push(temperature)
    climates.push(climate.continentalness, climate.humidity, climate.erosion)
    colors.push(r, g, b)
    lakeFlags.push(lake ? 1 : 0)
    return i
  }

  const grid: number[] = new Array((res + 1) * (res + 1))

  for (const face of FACE_LAYOUTS) {
    for (let j = 0; j <= res; j++) {
      const v = j / res
      for (let i = 0; i <= res; i++) {
        const u = i / res
        const cx = face.origin[0] + face.right[0] * u + face.up[0] * v
        const cy = face.origin[1] + face.right[1] * u + face.up[1] * v
        const cz = face.origin[2] + face.right[2] * u + face.up[2] * v
        grid[j * (res + 1) + i] = getIndex(cx, cy, cz)
      }
    }

    for (let j = 0; j < res; j++) {
      for (let i = 0; i < res; i++) {
        const a = grid[j * (res + 1) + i]
        const b = grid[j * (res + 1) + (i + 1)]
        const c = grid[(j + 1) * (res + 1) + (i + 1)]
        const d = grid[(j + 1) * (res + 1) + i]
        indices.push(a, b, c, a, c, d)
      }
    }
  }

  ensureOutwardWinding(sphereX, sphereY, sphereZ, indices)

  const parent = new Int32Array(sphereX.length).fill(-1)
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

  for (let i = 0; i < lakeFlags.length; i++) {
    if (lakeFlags[i]) parent[i] = i
  }
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t]
    const b = indices[t + 1]
    const c = indices[t + 2]
    if (lakeFlags[a] && lakeFlags[b]) union(a, b)
    if (lakeFlags[b] && lakeFlags[c]) union(b, c)
    if (lakeFlags[c] && lakeFlags[a]) union(c, a)
  }

  const maxElev = new Map<number, number>()
  for (let i = 0; i < lakeFlags.length; i++) {
    if (!lakeFlags[i]) continue
    const root = find(i)
    const prev = maxElev.get(root) ?? -Infinity
    if (elevations[i] > prev) maxElev.set(root, elevations[i])
  }

  const lakeRadius = new Float32Array(sphereX.length)
  for (let i = 0; i < lakeFlags.length; i++) {
    if (!lakeFlags[i]) continue
    lakeRadius[i] = 1 + (maxElev.get(find(i)) ?? elevations[i]) + 0.0007
  }

  const positions = new Float32Array(sphereX.length * 3)
  const minLand = 0.0014
  for (let i = 0; i < sphereX.length; i++) {
    const elevation = elevations[i]
    const displaced = lakeFlags[i]
      ? lakeRadius[i] - 1 - 0.0009
      : elevation > params.seaLevel
        ? Math.max(elevation, minLand)
        : elevation
    const radius = 1 + displaced
    positions[i * 3] = sphereX[i] * radius
    positions[i * 3 + 1] = sphereY[i] * radius
    positions[i * 3 + 2] = sphereZ[i] * radius
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute(
    'elevation',
    new BufferAttribute(new Float32Array(elevations), 1),
  )
  geometry.setAttribute(
    'temperature',
    new BufferAttribute(new Float32Array(temperatures), 1),
  )
  geometry.setAttribute(
    'aClimate',
    new BufferAttribute(new Float32Array(climates), 3),
  )
  geometry.setAttribute(
    'biomeColor',
    new BufferAttribute(new Float32Array(colors), 3),
  )
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  const lakeIndices: number[] = []
  const lakePositions: number[] = []
  const lakeIndexOf = new Map<number, number>()
  const lakeVert = (i: number): number => {
    const existing = lakeIndexOf.get(i)
    if (existing !== undefined) return existing
    const next = lakeIndexOf.size
    lakeIndexOf.set(i, next)
    const r = lakeRadius[i]
    lakePositions.push(sphereX[i] * r, sphereY[i] * r, sphereZ[i] * r)
    return next
  }
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t]
    const b = indices[t + 1]
    const c = indices[t + 2]
    if (!lakeFlags[a] || !lakeFlags[b] || !lakeFlags[c]) continue
    lakeIndices.push(lakeVert(a), lakeVert(b), lakeVert(c))
  }

  let lakes: BufferGeometry | null = null
  if (lakeIndices.length > 0) {
    lakes = new BufferGeometry()
    lakes.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(lakePositions), 3),
    )
    lakes.setIndex(lakeIndices)
    lakes.computeVertexNormals()
    lakes.computeBoundingSphere()
  }

  const result = { terrain: geometry, lakes }
  geometryCache.set(key, result)
  return result
}

function ensureOutwardWinding(
  x: number[],
  y: number[],
  z: number[],
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
