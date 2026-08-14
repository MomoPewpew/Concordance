import { BufferAttribute, BufferGeometry } from 'three'
import type { GlobeParams } from '../data/types'
import { createClimateSamplers } from './climate'
import { latLonToDirection, probeSurface } from './probe'

const LON_N = 72
const LAT_N = 36
const ACC_MIN = 6
const LIFT = 0.0022

const cache = new Map<string, BufferGeometry>()

function riverKey(params: GlobeParams): string {
  return JSON.stringify(params, (key, value) =>
    key === 'axialTilt' || key === 'resolution' || key === 'flattening'
      ? undefined
      : value,
  )
}

function cellIndex(i: number, j: number): number {
  return j * LON_N + (((i % LON_N) + LON_N) % LON_N)
}

type Cell = {
  x: number
  y: number
  z: number
  elevation: number
  humidity: number
  land: boolean
}

export function generateDrainages(params: GlobeParams): BufferGeometry {
  const key = riverKey(params)
  const cached = cache.get(key)
  if (cached) return cached

  const samplers = createClimateSamplers(params)
  const cells: Cell[] = new Array(LON_N * LAT_N)
  for (let j = 0; j < LAT_N; j++) {
    const lat = -90 + (j / (LAT_N - 1)) * 180
    for (let i = 0; i < LON_N; i++) {
      const lon = -180 + (i / LON_N) * 360
      const [x, y, z] = latLonToDirection(lat, lon)
      const probe = probeSurface(params, x, y, z, samplers)
      cells[cellIndex(i, j)] = {
        x,
        y,
        z,
        elevation: probe.elevation,
        humidity: probe.humidity,
        land: probe.elevation > 0.0008 && !probe.lake,
      }
    }
  }

  const flowTo = new Int32Array(cells.length).fill(-1)
  for (let j = 0; j < LAT_N; j++) {
    for (let i = 0; i < LON_N; i++) {
      const id = cellIndex(i, j)
      const cell = cells[id]
      if (!cell.land) continue
      let best = -1
      let bestH = cell.elevation
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (di === 0 && dj === 0) continue
          const jj = j + dj
          if (jj < 0 || jj >= LAT_N) continue
          const nid = cellIndex(i + di, jj)
          const neighbor = cells[nid]
          const nh = neighbor.land ? neighbor.elevation : neighbor.elevation - 0.02
          if (nh < bestH) {
            bestH = nh
            best = nid
          }
        }
      }
      flowTo[id] = best
    }
  }

  const order = cells
    .map((_, id) => id)
    .sort((a, b) => cells[b].elevation - cells[a].elevation)
  const acc = new Float32Array(cells.length)
  for (const id of order) {
    if (!cells[id].land) continue
    acc[id] += 1 + Math.max(cells[id].humidity, 0) * 0.8
    const next = flowTo[id]
    if (next >= 0) acc[next] += acc[id]
  }

  const positions: number[] = []
  const colors: number[] = []

  function point(cell: Cell): [number, number, number] {
    const r = 1 + cell.elevation + LIFT
    return [cell.x * r, cell.y * r, cell.z * r]
  }

  for (let id = 0; id < cells.length; id++) {
    if (acc[id] < ACC_MIN) continue
    const next = flowTo[id]
    if (next < 0) continue
    const a = cells[id]
    if (!a.land) continue
    const [x0, y0, z0] = point(a)
    const [x1, y1, z1] = point(cells[next])
    positions.push(x0, y0, z0, x1, y1, z1)
    const t = Math.min(acc[id] / 48, 1)
    const r = 0.08 + t * 0.06
    const g = 0.28 + t * 0.22
    const b = 0.34 + t * 0.22
    colors.push(r, g, b, r, g, b)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(positions), 3),
  )
  geometry.setAttribute(
    'color',
    new BufferAttribute(new Float32Array(colors), 3),
  )
  geometry.computeBoundingSphere()
  cache.set(key, geometry)
  return geometry
}
