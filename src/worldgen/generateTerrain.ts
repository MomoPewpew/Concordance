import { BufferAttribute, BufferGeometry } from 'three'
import type { GlobeParams } from '../data/types'
import { BIOME_COLORS, pickBiome } from './biomes'
import {
  createClimateSamplers,
  sampleClimate,
} from './climate'
import { applyLapseRate, heightFromClimate } from './height'

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
  return JSON.stringify(params, (key, value) =>
    key === 'axialTilt' ? undefined : value,
  )
}

const geometryCache = new Map<string, BufferGeometry>()

export function generateTerrain(params: GlobeParams): BufferGeometry {
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
  const colors: number[] = []
  const indices: number[] = []

  const getIndex = (cx: number, cy: number, cz: number): number => {
    const k = vertKey(cx, cy, cz)
    const existing = indexOf.get(k)
    if (existing !== undefined) return existing

    const [sx, sy, sz] = cubeToSphere(cx, cy, cz)
    const climate = sampleClimate(sx, sy, sz, params, samplers)
    const height = heightFromClimate(climate)
    const elevation = height * params.heightScale
    const temperature = applyLapseRate(climate.temperature, elevation)
    const biome = pickBiome(climate, height, temperature)
    const [r, g, b] = BIOME_COLORS[biome]

    const i = sphereX.length
    indexOf.set(k, i)
    sphereX.push(sx)
    sphereY.push(sy)
    sphereZ.push(sz)
    elevations.push(elevation)
    temperatures.push(temperature)
    colors.push(r, g, b)
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

  const positions = new Float32Array(sphereX.length * 3)
  const minLand = 0.0014
  for (let i = 0; i < sphereX.length; i++) {
    const elevation = elevations[i]
    const displaced =
      elevation > params.seaLevel ? Math.max(elevation, minLand) : elevation
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
    'biomeColor',
    new BufferAttribute(new Float32Array(colors), 3),
  )
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  geometryCache.set(key, geometry)
  return geometry
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
