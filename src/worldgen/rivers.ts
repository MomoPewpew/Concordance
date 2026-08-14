import { BufferAttribute, BufferGeometry, Vector3 } from 'three'
import type { NoiseFunction3D } from 'simplex-noise'
import type { GlobeParams } from '../data/types'
import { createClimateSamplers, type ClimateSamplers } from './climate'
import { iceCover } from './height'
import { clamp, createFbm, hashSeed, lerp, smoothstep } from './noise'
import { latLonToDirection, probeSurface } from './probe'

const LON_N = 96
const LAT_N = 48
const ACC_MIN = 8
const LIFT = 0.0014
const CHAOS = 3
const STEP = 0.01

const cache = new Map<string, BufferGeometry>()

type Cell = {
  i: number
  j: number
  x: number
  y: number
  z: number
  elevation: number
  humidity: number
  land: boolean
}

type Knot = {
  x: number
  y: number
  z: number
  elevation: number
  acc: number
}

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

function neighbors(i: number, j: number): number[] {
  const out: number[] = []
  for (let dj = -1; dj <= 1; dj++) {
    for (let di = -1; di <= 1; di++) {
      if (di === 0 && dj === 0) continue
      const jj = j + dj
      if (jj < 0 || jj >= LAT_N) continue
      out.push(cellIndex(i + di, jj))
    }
  }
  return out
}

function widthFor(acc: number): number {
  const t = Math.pow(clamp((acc - 6) / 110, 0, 1), 0.5)
  return lerp(0.0007, 0.0032, t)
}

function mixKnot(a: Knot, b: Knot, t: number): Knot {
  const x = a.x + (b.x - a.x) * t
  const y = a.y + (b.y - a.y) * t
  const z = a.z + (b.z - a.z) * t
  const len = Math.hypot(x, y, z) || 1
  return {
    x: x / len,
    y: y / len,
    z: z / len,
    elevation: lerp(a.elevation, b.elevation, t),
    acc: lerp(a.acc, b.acc, t),
  }
}

function slerpKnot(a: Knot, b: Knot, t: number): Knot {
  const d = clamp(a.x * b.x + a.y * b.y + a.z * b.z, -1, 1)
  const o = Math.acos(d)
  if (o < 1e-4) return mixKnot(a, b, t)
  const s = Math.sin(o)
  const w0 = Math.sin((1 - t) * o) / s
  const w1 = Math.sin(t * o) / s
  const x = a.x * w0 + b.x * w1
  const y = a.y * w0 + b.y * w1
  const z = a.z * w0 + b.z * w1
  const len = Math.hypot(x, y, z) || 1
  return {
    x: x / len,
    y: y / len,
    z: z / len,
    elevation: lerp(a.elevation, b.elevation, t),
    acc: lerp(a.acc, b.acc, t),
  }
}

function chaikin(knots: Knot[]): Knot[] {
  if (knots.length < 2) return knots
  const next: Knot[] = [knots[0]]
  for (let i = 0; i < knots.length - 1; i++) {
    next.push(mixKnot(knots[i], knots[i + 1], 0.25))
    next.push(mixKnot(knots[i], knots[i + 1], 0.75))
  }
  next.push(knots[knots.length - 1])
  return next
}

function densify(knots: Knot[]): Knot[] {
  if (knots.length < 2) return knots
  const out: Knot[] = [knots[0]]
  for (let i = 0; i < knots.length - 1; i++) {
    const a = knots[i]
    const b = knots[i + 1]
    const ang = Math.acos(clamp(a.x * b.x + a.y * b.y + a.z * b.z, -1, 1))
    const steps = Math.max(1, Math.ceil(ang / STEP))
    for (let s = 1; s <= steps; s++) {
      out.push(slerpKnot(a, b, s / steps))
    }
  }
  return out
}

function rotateToward(
  from: { x: number; y: number; z: number },
  toward: { x: number; y: number; z: number },
  angle: number,
): { x: number; y: number; z: number } {
  let ax = from.y * toward.z - from.z * toward.y
  let ay = from.z * toward.x - from.x * toward.z
  let az = from.x * toward.y - from.y * toward.x
  const al = Math.hypot(ax, ay, az)
  if (al < 1e-8) return { x: from.x, y: from.y, z: from.z }
  ax /= al
  ay /= al
  az /= al
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const cx = ay * from.z - az * from.y
  const cy = az * from.x - ax * from.z
  const cz = ax * from.y - ay * from.x
  const d = ax * from.x + ay * from.y + az * from.z
  const x = from.x * c + cx * s + ax * d * (1 - c)
  const y = from.y * c + cy * s + ay * d * (1 - c)
  const z = from.z * c + cz * s + az * d * (1 - c)
  const len = Math.hypot(x, y, z) || 1
  return { x: x / len, y: y / len, z: z / len }
}

function extendToOcean(
  from: { x: number; y: number; z: number },
  sea: { x: number; y: number; z: number },
  acc: number,
  params: GlobeParams,
  samplers: ClimateSamplers,
): Knot[] {
  const maxAng = 0.16
  const probeN = 28
  let shore = maxAng
  for (let i = 1; i <= probeN; i++) {
    const ang = (i / probeN) * maxAng
    const dir = rotateToward(from, sea, ang)
    if (probeSurface(params, dir.x, dir.y, dir.z, samplers).elevation <= 0) {
      shore = ang
      break
    }
  }
  const end = shore + 0.022
  const out: Knot[] = []
  const outN = 6
  for (let i = 1; i <= outN; i++) {
    const ang = (i / outN) * end
    const dir = rotateToward(from, sea, ang)
    const elev =
      ang < shore
        ? Math.max(
            probeSurface(params, dir.x, dir.y, dir.z, samplers).elevation,
            0,
          )
        : 0
    out.push(knotFrom(dir, elev, acc))
  }
  return out
}

function wigglePath(knots: Knot[], noise: NoiseFunction3D): void {
  const n = knots.length
  if (n < 4) return
  const ox = new Float32Array(n)
  const oy = new Float32Array(n)
  const oz = new Float32Array(n)
  const dist = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    ox[i] = knots[i].x
    oy[i] = knots[i].y
    oz[i] = knots[i].z
    if (i > 0) {
      dist[i] =
        dist[i - 1] +
        Math.hypot(ox[i] - ox[i - 1], oy[i] - oy[i - 1], oz[i] - oz[i - 1])
    }
  }
  const total = dist[n - 1]
  if (total < 1e-5) return

  const mid = Math.floor(n / 2)
  const phase = noise(ox[mid] * 5.1, oy[mid] * 5.1, oz[mid] * 5.1) * Math.PI
  const freq = 34 + noise(ox[mid] * 5.1 + 8.4, oy[mid] * 5.1, oz[mid] * 5.1) * 7

  for (let i = 1; i < n - 1; i++) {
    const k = knots[i]
    if (k.elevation <= 0) continue
    const along = dist[i] / total
    const ends = smoothstep(0, 0.08, along) * smoothstep(1, 0.88, along)
    const mountain = smoothstep(0.005, 0.022, k.elevation)
    const amp = lerp(0.014, 0.0024, mountain) * ends
    if (amp < 1e-6) continue

    const meander = Math.sin(dist[i] * freq + phase)

    let tx = ox[i + 1] - ox[i - 1]
    let ty = oy[i + 1] - oy[i - 1]
    let tz = oz[i + 1] - oz[i - 1]
    const pd = tx * ox[i] + ty * oy[i] + tz * oz[i]
    tx -= ox[i] * pd
    ty -= oy[i] * pd
    tz -= oz[i] * pd
    const tl = Math.hypot(tx, ty, tz)
    if (tl < 1e-8) continue
    tx /= tl
    ty /= tl
    tz /= tl
    const sx = oy[i] * tz - oz[i] * ty
    const sy = oz[i] * tx - ox[i] * tz
    const sz = ox[i] * ty - oy[i] * tx
    const sl = Math.hypot(sx, sy, sz) || 1
    const off = meander * amp
    let x = ox[i] + (sx / sl) * off
    let y = oy[i] + (sy / sl) * off
    let z = oz[i] + (sz / sl) * off
    const len = Math.hypot(x, y, z) || 1
    k.x = x / len
    k.y = y / len
    k.z = z / len
  }
}

export function generateDrainages(params: GlobeParams): BufferGeometry {
  const key = riverKey(params)
  const cached = cache.get(key)
  if (cached) return cached

  const samplers = createClimateSamplers(params)
  const noise = createFbm(hashSeed(params.seed, 0x51))
  const cells: Cell[] = new Array(LON_N * LAT_N)
  for (let j = 0; j < LAT_N; j++) {
    const lat = -90 + (j / (LAT_N - 1)) * 180
    for (let i = 0; i < LON_N; i++) {
      const lon = -180 + (i / LON_N) * 360
      const [x, y, z] = latLonToDirection(lat, lon)
      const probe = probeSurface(params, x, y, z, samplers)
      cells[cellIndex(i, j)] = {
        i,
        j,
        x,
        y,
        z,
        elevation: probe.elevation,
        humidity: probe.humidity,
        land:
          probe.elevation > 0 &&
          !probe.lake &&
          iceCover(probe.temperature) < 0.45,
      }
    }
  }

  const flowTo = floodToSea(cells)
  const n = cells.length
  const acc = new Float32Array(n)
  for (let id = 0; id < n; id++) {
    if (!cells[id].land || flowTo[id] < 0) continue
    const contrib =
      1 +
      Math.max(cells[id].elevation, 0) * 40 +
      Math.max(cells[id].humidity, 0) * 0.5
    let cur = id
    for (let step = 0; step < n; step++) {
      acc[cur] += contrib
      const next = flowTo[cur]
      if (next < 0 || !cells[next].land) break
      cur = next
    }
  }

  const indegree = new Int32Array(n)
  for (let id = 0; id < n; id++) {
    if (!cells[id].land || acc[id] < ACC_MIN) continue
    const next = flowTo[id]
    if (next >= 0 && cells[next].land && acc[next] >= ACC_MIN) indegree[next]++
  }

  const starts: number[] = []
  for (let id = 0; id < n; id++) {
    if (!cells[id].land || acc[id] < ACC_MIN || flowTo[id] < 0) continue
    if (indegree[id] !== 1) starts.push(id)
  }

  const geometry = buildRibbons(
    cells,
    flowTo,
    acc,
    indegree,
    starts,
    params,
    samplers,
    noise,
  )
  cache.set(key, geometry)
  return geometry
}

function knotFrom(
  dir: { x: number; y: number; z: number },
  elevation: number,
  amount: number,
): Knot {
  return { x: dir.x, y: dir.y, z: dir.z, elevation, acc: amount }
}

function tracePath(
  start: number,
  cells: Cell[],
  flowTo: Int32Array,
  acc: Float32Array,
  indegree: Int32Array,
  params: GlobeParams,
  samplers: ClimateSamplers,
): Knot[] {
  const path: Knot[] = [
    knotFrom(cells[start], Math.max(cells[start].elevation, 0), acc[start]),
  ]
  let cur = start
  for (let step = 0; step < cells.length; step++) {
    const next = flowTo[cur]
    if (next < 0) break
    if (!cells[next].land) {
      path.push(
        ...extendToOcean(cells[cur], cells[next], acc[cur], params, samplers),
      )
      break
    }
    path.push(
      knotFrom(cells[next], Math.max(cells[next].elevation, 0), acc[next]),
    )
    if (acc[next] < ACC_MIN) break
    if (next !== start && indegree[next] >= 2) break
    cur = next
  }
  return path
}

function smoothPath(
  path: Knot[],
  taperStart: boolean,
  noise: NoiseFunction3D,
): Knot[] {
  if (path.length < 2) return path
  let knots = path
  for (let i = 0; i < CHAOS; i++) knots = chaikin(knots)
  knots = densify(knots)
  wigglePath(knots, noise)
  knots = chaikin(knots)
  knots = chaikin(knots)
  knots = densify(knots)
  for (let i = 1; i < knots.length; i++) {
    knots[i].elevation = Math.min(
      knots[i].elevation,
      knots[i - 1].elevation - 0.000015,
    )
  }
  knots[knots.length - 1].elevation = Math.min(
    knots[knots.length - 1].elevation,
    0,
  )
  if (taperStart) knots[0].acc = Math.min(knots[0].acc, ACC_MIN * 0.35)
  return knots
}

function buildRibbons(
  cells: Cell[],
  flowTo: Int32Array,
  acc: Float32Array,
  indegree: Int32Array,
  starts: number[],
  params: GlobeParams,
  samplers: ClimateSamplers,
  noise: NoiseFunction3D,
): BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const across: number[] = []
  const flows: number[] = []
  const sizes: number[] = []
  const indices: number[] = []

  const radial = new Vector3()
  const tangent = new Vector3()
  const side = new Vector3()
  const prev = new Vector3()
  const next = new Vector3()
  const pos = new Vector3()

  for (const start of starts) {
    const raw = tracePath(
      start,
      cells,
      flowTo,
      acc,
      indegree,
      params,
      samplers,
    )
    if (raw.length < 2) continue
    const knots = smoothPath(raw, indegree[start] === 0, noise)
    if (knots.length < 2) continue

    const lengths = new Float32Array(knots.length)
    let total = 0
    for (let i = 1; i < knots.length; i++) {
      const a = knots[i - 1]
      const b = knots[i]
      total += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
      lengths[i] = total
    }
    const inv = total > 1e-6 ? 1 / total : 0
    const base = positions.length / 3

    for (let i = 0; i < knots.length; i++) {
      const k = knots[i]
      radial.set(k.x, k.y, k.z)
      const a = knots[Math.max(0, i - 1)]
      const b = knots[Math.min(knots.length - 1, i + 1)]
      prev.set(a.x, a.y, a.z)
      next.set(b.x, b.y, b.z)
      tangent.copy(next).sub(prev)
      tangent.addScaledVector(radial, -tangent.dot(radial))
      if (tangent.lengthSq() < 1e-10) {
        tangent.set(-k.z, 0, k.x)
        if (tangent.lengthSq() < 1e-10) tangent.set(1, 0, 0)
      }
      tangent.normalize()
      side.copy(radial).cross(tangent).normalize()
      const flow = lengths[i] * inv
      const fat = clamp(
        1 + noise(k.x * 12.5, k.y * 12.5, k.z * 12.5) * 0.25,
        0.75,
        1.25,
      )
      const w = widthFor(k.acc) * fat
      const size = clamp(k.acc / 80, 0, 1)
      const liftBase = k.elevation <= 0.00005 ? 0.0005 : LIFT
      const r = 1 + Math.max(k.elevation, 0) + liftBase

      for (const u of [-1, 0, 1]) {
        const lift = liftBase * (1.15 - 0.28 * Math.abs(u))
        pos.copy(radial).multiplyScalar(r - liftBase + lift)
        pos.addScaledVector(side, w * u)
        positions.push(pos.x, pos.y, pos.z)
        normals.push(radial.x, radial.y, radial.z)
        across.push(u)
        flows.push(flow)
        sizes.push(size)
      }
    }

    for (let i = 0; i < knots.length - 1; i++) {
      const a = base + i * 3
      const b = base + (i + 1) * 3
      indices.push(a, a + 1, b, a + 1, b + 1, b)
      indices.push(a + 1, a + 2, b + 1, a + 2, b + 2, b + 1)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(positions), 3),
  )
  geometry.setAttribute(
    'normal',
    new BufferAttribute(new Float32Array(normals), 3),
  )
  geometry.setAttribute(
    'aAcross',
    new BufferAttribute(new Float32Array(across), 1),
  )
  geometry.setAttribute(
    'aFlow',
    new BufferAttribute(new Float32Array(flows), 1),
  )
  geometry.setAttribute(
    'aSize',
    new BufferAttribute(new Float32Array(sizes), 1),
  )
  if (indices.length > 0) {
    geometry.setIndex(indices)
  }
  geometry.computeBoundingSphere()
  return geometry
}

/** Every land cell drains toward the coast, spilling out of pits. */
function floodToSea(cells: Cell[]): Int32Array {
  const n = cells.length
  const parent = new Int32Array(n).fill(-1)
  const filled = new Uint8Array(n)
  const spill = new Float32Array(n)
  spill.fill(Infinity)
  const heap: number[] = []

  function push(id: number, level: number, from: number): void {
    if (level >= spill[id]) return
    spill[id] = level
    parent[id] = from
    heap.push(id)
  }

  for (let id = 0; id < n; id++) {
    if (!cells[id].land) continue
    const ring = neighbors(cells[id].i, cells[id].j)
    let bestFrom = -1
    let bestLevel = Infinity
    for (const nid of ring) {
      if (cells[nid].land) continue
      const level = Math.max(cells[id].elevation, cells[nid].elevation)
      if (level < bestLevel) {
        bestLevel = level
        bestFrom = nid
      }
    }
    if (bestFrom >= 0) push(id, bestLevel, bestFrom)
  }

  while (heap.length > 0) {
    let bestI = -1
    let bestS = Infinity
    for (let i = 0; i < heap.length; i++) {
      const id = heap[i]
      if (filled[id]) continue
      if (spill[id] < bestS) {
        bestS = spill[id]
        bestI = i
      }
    }
    if (bestI < 0) break
    const id = heap[bestI]
    heap[bestI] = heap[heap.length - 1]
    heap.pop()
    if (filled[id]) continue
    filled[id] = 1
    for (const nid of neighbors(cells[id].i, cells[id].j)) {
      if (!cells[nid].land || filled[nid]) continue
      push(nid, Math.max(cells[nid].elevation, spill[id]), id)
    }
  }

  return parent
}
