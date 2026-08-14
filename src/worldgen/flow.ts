import { BufferAttribute, BufferGeometry } from 'three'
import type { GlobeParams } from '../data/types'
import { createClimateSamplers } from './climate'
import { hashSeed, mulberry32 } from './noise'
import { probeSurface } from './probe'

function fibonacciSphere(count: number): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(count - 1, 1)) * 2
    const r = Math.sqrt(Math.max(1 - y * y, 0))
    const theta = golden * i
    out.push([Math.cos(theta) * r, y, Math.sin(theta) * r])
  }
  return out
}

function eastNorth(
  x: number,
  y: number,
  z: number,
): { east: [number, number, number]; north: [number, number, number] } {
  const ex = -z
  const ey = 0
  const ez = x
  const el = Math.hypot(ex, ey, ez)
  const east: [number, number, number] =
    el < 1e-6 ? [1, 0, 0] : [ex / el, ey / el, ez / el]
  const nx = y * east[2] - z * east[1]
  const ny = z * east[0] - x * east[2]
  const nz = x * east[1] - y * east[0]
  const nl = Math.hypot(nx, ny, nz) || 1
  return { east, north: [nx / nl, ny / nl, nz / nl] }
}

function prevailing(
  y: number,
  east: [number, number, number],
  north: [number, number, number],
): [number, number, number] {
  const lat = Math.asin(Math.max(-1, Math.min(1, y)))
  const absDeg = (Math.abs(lat) * 180) / Math.PI
  const hemi = lat >= 0 ? 1 : -1
  let e = 0
  let n = 0
  if (absDeg < 28) {
    e = -1
    n = -hemi * 0.28
  } else if (absDeg < 60) {
    e = 1
    n = hemi * 0.22
  } else {
    e = -0.65
    n = 0
  }
  return [
    east[0] * e + north[0] * n,
    east[1] * e + north[1] * n,
    east[2] * e + north[2] * n,
  ]
}

function addStroke(
  positions: number[],
  colors: number[],
  x: number,
  y: number,
  z: number,
  dx: number,
  dy: number,
  dz: number,
  radius: number,
  length: number,
  rgb: [number, number, number],
): void {
  const dl = Math.hypot(dx, dy, dz) || 1
  const ux = dx / dl
  const uy = dy / dl
  const uz = dz / dl
  const x0 = x * radius
  const y0 = y * radius
  const z0 = z * radius
  const x1 = x * radius + ux * length
  const y1 = y * radius + uy * length
  const z1 = z * radius + uz * length
  positions.push(x0, y0, z0, x1, y1, z1)
  colors.push(rgb[0], rgb[1], rgb[2], rgb[0], rgb[1], rgb[2])
}

function geometryFromStrokes(
  positions: number[],
  colors: number[],
): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
  geometry.computeBoundingSphere()
  return geometry
}

const flowCache = new Map<string, { wind: BufferGeometry; currents: BufferGeometry }>()

function flowKey(params: GlobeParams): string {
  return JSON.stringify(params, (key, value) =>
    key === 'axialTilt' || key === 'resolution' ? undefined : value,
  )
}

export function generateFlowStrokes(params: GlobeParams): {
  wind: BufferGeometry
  currents: BufferGeometry
} {
  const key = flowKey(params)
  const cached = flowCache.get(key)
  if (cached) return cached

  const samplers = createClimateSamplers(params.seed)
  const rng = mulberry32(hashSeed(params.seed, 0x88))
  const windPos: number[] = []
  const windCol: number[] = []
  const curPos: number[] = []
  const curCol: number[] = []

  for (const [x, y, z] of fibonacciSphere(260)) {
    const { east, north } = eastNorth(x, y, z)
    const [wx, wy, wz] = prevailing(y, east, north)
    const jitter = (rng() - 0.5) * 0.35
    addStroke(
      windPos,
      windCol,
      x,
      y,
      z,
      wx + east[0] * jitter,
      wy + east[1] * jitter,
      wz + east[2] * jitter,
      1.048,
      0.055,
      [0.92, 0.95, 1],
    )
  }

  for (const [x, y, z] of fibonacciSphere(420)) {
    const probe = probeSurface(params, x, y, z, samplers)
    if (probe.elevation >= -0.002) continue
    const { east, north } = eastNorth(x, y, z)
    const lat = (probe.lat * Math.PI) / 180
    const hemi = lat >= 0 ? 1 : -1
    const west = 0.7 + Math.cos(lat) * 0.35
    let dx = -east[0] * west
    let dy = -east[1] * west
    let dz = -east[2] * west
    const gyre = Math.sin(lat * 2) * 0.45 * hemi
    dx += north[0] * gyre
    dy += north[1] * gyre
    dz += north[2] * gyre

    const step = 0.05
    const near = probeSurface(
      params,
      x + east[0] * step,
      y + east[1] * step,
      z + east[2] * step,
      samplers,
    )
    if (near.elevation > 0 && probe.elevation < 0) {
      dx += north[0] * 0.8 * hemi
      dy += north[1] * 0.8 * hemi
      dz += north[2] * 0.8 * hemi
    }

    addStroke(curPos, curCol, x, y, z, dx, dy, dz, 1.008, 0.05, [0.25, 0.72, 0.78])
    if (curPos.length / 6 >= 180) break
  }

  const result = {
    wind: geometryFromStrokes(windPos, windCol),
    currents: geometryFromStrokes(curPos, curCol),
  }
  flowCache.set(key, result)
  return result
}
