import type { Article, FeatureKind, GlobeParams, World } from '../data/types'
import { biomeLabel, type BiomeId } from './biomes'
import { createClimateSamplers } from './climate'
import { featureTitle } from './names'
import { latLonToDirection, probeSurface, type SurfaceProbe } from './probe'

export type WorldFeature = {
  kind: FeatureKind
  lat: number
  lon: number
  name: string
  summary: string
  biome: BiomeId
}

type Cell = SurfaceProbe & {
  land: boolean
  x: number
  y: number
  z: number
}

const LON_N = 96
const LAT_N = 48
const featureCache = new Map<string, WorldFeature[]>()

function featureKey(params: GlobeParams): string {
  return JSON.stringify(params, (key, value) =>
    key === 'axialTilt' || key === 'resolution' ? undefined : value,
  )
}

function cellIndex(i: number, j: number): number {
  return j * LON_N + ((i % LON_N) + LON_N) % LON_N
}

function neighbors(i: number, j: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let dj = -1; dj <= 1; dj++) {
    for (let di = -1; di <= 1; di++) {
      if (di === 0 && dj === 0) continue
      const jj = j + dj
      if (jj < 0 || jj >= LAT_N) continue
      out.push([i + di, jj])
    }
  }
  return out
}

function angularlyFar(
  picked: WorldFeature[],
  lat: number,
  lon: number,
  minDot: number,
): boolean {
  const [x, y, z] = latLonToDirection(lat, lon)
  return picked.every((feature) => {
    const [px, py, pz] = latLonToDirection(feature.lat, feature.lon)
    return x * px + y * py + z * pz < minDot
  })
}

function saltFor(kind: FeatureKind, lat: number, lon: number): number {
  const kindSalt =
    kind === 'peak' ? 0x11 : kind === 'basin' ? 0x22 : 0x33
  return (kindSalt ^ (Math.round(lat * 10) * 4093) ^ (Math.round(lon * 10) * 17)) >>> 0
}

function toFeature(
  kind: FeatureKind,
  cell: Cell,
  params: GlobeParams,
): WorldFeature {
  const salt = saltFor(kind, cell.lat, cell.lon)
  const name = featureTitle(kind, params.seed, salt)
  const where = biomeLabel(cell.biome)
  const summary =
    kind === 'peak'
      ? `High ground in the ${where}. Named from the height field.`
      : kind === 'basin'
        ? `A depression in the ${where}. Named from the height field.`
        : `A landmass in the ${where}. Named from the climate field.`
  return {
    kind,
    lat: cell.lat,
    lon: cell.lon,
    name,
    summary,
    biome: cell.biome,
  }
}

function pickLocal(
  cells: Cell[],
  kind: FeatureKind,
  params: GlobeParams,
  picked: WorldFeature[],
  test: (cell: Cell, ring: Cell[]) => boolean,
  compare: (a: Cell, b: Cell) => number,
  limit: number,
  minDot: number,
): void {
  const candidates: Cell[] = []
  for (let j = 1; j < LAT_N - 1; j++) {
    for (let i = 0; i < LON_N; i++) {
      const cell = cells[cellIndex(i, j)]
      const ring = neighbors(i, j).map(([ii, jj]) => cells[cellIndex(ii, jj)])
      if (test(cell, ring)) candidates.push(cell)
    }
  }
  candidates.sort(compare)
  for (const cell of candidates) {
    if (!angularlyFar(picked, cell.lat, cell.lon, minDot)) {
      continue
    }
    const next = toFeature(kind, cell, params)
    picked.push(next)
    if (picked.filter((f) => f.kind === kind).length >= limit) break
  }
}

export function findFeatures(params: GlobeParams): WorldFeature[] {
  const key = featureKey(params)
  const cached = featureCache.get(key)
  if (cached) return cached

  const samplers = createClimateSamplers(params.seed)
  const cells: Cell[] = new Array(LON_N * LAT_N)
  for (let j = 0; j < LAT_N; j++) {
    const lat = -90 + (j / (LAT_N - 1)) * 180
    for (let i = 0; i < LON_N; i++) {
      const lon = -180 + (i / LON_N) * 360
      const [x, y, z] = latLonToDirection(lat, lon)
      const probe = probeSurface(params, x, y, z, samplers)
      cells[cellIndex(i, j)] = {
        ...probe,
        land: probe.elevation > 0,
        x,
        y,
        z,
      }
    }
  }

  const picked: WorldFeature[] = []

  pickLocal(
    cells,
    'peak',
    params,
    picked,
    (cell, ring) =>
      cell.land &&
      cell.elevation > 0.016 &&
      ring.every((n) => cell.elevation >= n.elevation),
    (a, b) => b.elevation - a.elevation,
    5,
    0.92,
  )

  pickLocal(
    cells,
    'basin',
    params,
    picked,
    (cell, ring) => {
      if (ring.length < 6) return false
      const mean = ring.reduce((s, n) => s + n.elevation, 0) / ring.length
      if (cell.land) {
        const inland = ring.filter((n) => n.land).length >= 6
        return inland && cell.elevation + 0.004 < mean && cell.elevation > 0.001
      }
      return cell.elevation + 0.012 < mean && cell.elevation < -0.018
    },
    (a, b) => a.elevation - b.elevation,
    4,
    0.9,
  )

  const parent = new Array(cells.length).fill(-1)
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

  for (let i = 0; i < cells.length; i++) {
    if (cells[i].land) parent[i] = i
  }
  for (let j = 0; j < LAT_N; j++) {
    for (let i = 0; i < LON_N; i++) {
      const a = cellIndex(i, j)
      if (!cells[a].land) continue
      for (const [ii, jj] of neighbors(i, j)) {
        const b = cellIndex(ii, jj)
        if (cells[b].land) union(a, b)
      }
    }
  }

  const groups = new Map<number, Cell[]>()
  for (let i = 0; i < cells.length; i++) {
    if (!cells[i].land) continue
    const root = find(i)
    const list = groups.get(root)
    if (list) list.push(cells[i])
    else groups.set(root, [cells[i]])
  }

  const landmasses = [...groups.values()].sort((a, b) => b.length - a.length)
  const continent = landmasses[0]?.length ?? 0
  const islands = landmasses.filter(
    (group) => group.length >= 5 && group.length < continent * 0.28,
  )

  for (const group of islands) {
    if (picked.filter((f) => f.kind === 'island').length >= 5) break
    const high = group.reduce((best, cell) =>
      cell.elevation > best.elevation ? cell : best,
    )
    if (!angularlyFar(picked, high.lat, high.lon, 0.93)) continue
    picked.push(toFeature('island', high, params))
  }

  featureCache.set(key, picked)
  return picked
}

export function articlesFromFeatures(world: World): Article[] {
  return findFeatures(world.globe).map((feature, index) => ({
    id: `feat-${world.id}-${feature.kind}-${index}`,
    universeId: world.universeId,
    worldId: world.id,
    title: feature.name,
    body: feature.summary,
    feature: feature.kind,
    pin: { worldId: world.id, lat: feature.lat, lon: feature.lon },
  }))
}
