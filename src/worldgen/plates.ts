import type { GlobeParams } from '../data/types'
import { clamp, hashSeed, lerp, mulberry32, smoothstep } from './noise'

export type Plate = {
  x: number
  y: number
  z: number
  continental: boolean
  ax: number
  ay: number
  az: number
  rate: number
}

export type PlateField = {
  plates: Plate[]
}

export type TectonicSample = {
  /** 0 = ocean crust, 1 = continental crust (eased at coasts). */
  land: number
  /** 0–1 mountain-belt envelope from closing boundaries. */
  orogeny: number
  /** 0–1 opening-boundary envelope (rift or mid-ocean rise). */
  divergent: number
}

const AREA_PROBES = 2048
const cache = new Map<string, PlateField>()

function plateKey(params: GlobeParams): string {
  return `${params.seed}|${params.oceanBias}|${params.continentalness.scale}`
}

function plateCount(params: GlobeParams): number {
  const t = clamp(
    (params.continentalness.scale - 0.55) / (2.15 - 0.55),
    0,
    1,
  )
  return Math.round(lerp(8, 16, t))
}

function landFraction(oceanBias: number): number {
  const oceanAmount = clamp((0.18 - oceanBias) / (0.18 + 0.48), 0, 1)
  return lerp(0.48, 0.2, oceanAmount)
}

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

function randomDir(rng: () => number): [number, number, number] {
  const z = rng() * 2 - 1
  const t = rng() * Math.PI * 2
  const r = Math.sqrt(Math.max(1 - z * z, 0))
  return [Math.cos(t) * r, z, Math.sin(t) * r]
}

function jitterOnSphere(
  x: number,
  y: number,
  z: number,
  rng: () => number,
  amp: number,
): [number, number, number] {
  const [jx, jy, jz] = randomDir(rng)
  const d = jx * x + jy * y + jz * z
  let tx = jx - x * d
  let ty = jy - y * d
  let tz = jz - z * d
  const tl = Math.hypot(tx, ty, tz) || 1
  const s = (rng() * 2 - 1) * amp
  tx = x + (tx / tl) * s
  ty = y + (ty / tl) * s
  tz = z + (tz / tl) * s
  const n = Math.hypot(tx, ty, tz) || 1
  return [tx / n, ty / n, tz / n]
}

function nearestIndex(
  plates: Plate[],
  x: number,
  y: number,
  z: number,
): number {
  let best = 0
  let bestDot = -2
  for (let i = 0; i < plates.length; i++) {
    const d = plates[i].x * x + plates[i].y * y + plates[i].z * z
    if (d > bestDot) {
      bestDot = d
      best = i
    }
  }
  return best
}

function assignCrust(plates: Plate[], oceanBias: number, rng: () => number): void {
  const counts = new Float32Array(plates.length)
  for (const [x, y, z] of fibonacciSphere(AREA_PROBES)) {
    counts[nearestIndex(plates, x, y, z)] += 1
  }
  const order = plates
    .map((_, i) => i)
    .sort((a, b) => counts[b] - counts[a] || rng() - 0.5)
  const target = landFraction(oceanBias) * AREA_PROBES
  let acc = 0
  for (const i of order) {
    if (acc < target) {
      plates[i].continental = true
      acc += counts[i]
    } else {
      plates[i].continental = false
    }
  }
  if (!plates.some((p) => p.continental)) plates[order[0]].continental = true
  if (!plates.some((p) => !p.continental)) {
    plates[order[order.length - 1]].continental = false
  }
}

export function createPlates(params: GlobeParams): PlateField {
  const key = plateKey(params)
  const cached = cache.get(key)
  if (cached) return cached

  const rng = mulberry32(hashSeed(params.seed, 0x71))
  const count = plateCount(params)
  const sites = fibonacciSphere(count)
  const plates: Plate[] = sites.map(([x, y, z]) => {
    const [sx, sy, sz] = jitterOnSphere(x, y, z, rng, 0.24)
    const [ax, ay, az] = randomDir(rng)
    return {
      x: sx,
      y: sy,
      z: sz,
      continental: false,
      ax,
      ay,
      az,
      rate: 0.18 + rng() * 1.05,
    }
  })
  assignCrust(plates, params.oceanBias, rng)

  const field = { plates }
  cache.set(key, field)
  return field
}

function velocity(plate: Plate, x: number, y: number, z: number): [number, number, number] {
  return [
    (plate.ay * z - plate.az * y) * plate.rate,
    (plate.az * x - plate.ax * z) * plate.rate,
    (plate.ax * y - plate.ay * x) * plate.rate,
  ]
}

export function sampleTectonics(
  x: number,
  y: number,
  z: number,
  field: PlateField,
): TectonicSample {
  const plates = field.plates
  let best = 0
  let second = 0
  let bestDot = -2
  let secondDot = -2
  for (let i = 0; i < plates.length; i++) {
    const d = plates[i].x * x + plates[i].y * y + plates[i].z * z
    if (d > bestDot) {
      second = best
      secondDot = bestDot
      best = i
      bestDot = d
    } else if (d > secondDot) {
      second = i
      secondDot = d
    }
  }

  const a = plates[best]
  const b = plates[second]
  if (best === second) {
    const land = a.continental ? 1 : 0
    return { land, orogeny: 0, divergent: 0 }
  }
  const nx = a.x - b.x
  const ny = a.y - b.y
  const nz = a.z - b.z
  const nl = Math.hypot(nx, ny, nz) || 1
  const nd = clamp((x * nx + y * ny + z * nz) / nl, -1, 1)
  const edgeDist = Math.abs(Math.asin(nd))
  const signedAng = Math.asin(nd)

  let land: number
  if (a.continental && b.continental) land = 1
  else if (!a.continental && !b.continental) land = 0
  else {
    const towardCont = a.continental ? signedAng : -signedAng
    land = smoothstep(-0.045, 0.06, towardCont)
  }

  const bx = b.x - a.x
  const by = b.y - a.y
  const bz = b.z - a.z
  const pd = bx * x + by * y + bz * z
  let tx = bx - x * pd
  let ty = by - y * pd
  let tz = bz - z * pd
  const tl = Math.hypot(tx, ty, tz) || 1
  tx /= tl
  ty /= tl
  tz /= tl

  const [vax, vay, vaz] = velocity(a, x, y, z)
  const [vbx, vby, vbz] = velocity(b, x, y, z)
  const closing = (vax - vbx) * tx + (vay - vby) * ty + (vaz - vbz) * tz
  const conv = Math.max(closing, 0)
  const div = Math.max(-closing, 0)
  const sx = y * tz - z * ty
  const sy = z * tx - x * tz
  const sz = x * ty - y * tx
  const sl = Math.hypot(sx, sy, sz) || 1
  const slide = Math.abs(
    ((vax - vbx) * sx + (vay - vby) * sy + (vaz - vbz) * sz) / sl,
  )
  const colliding = conv > 0.13 && conv > slide * 1.2
  const opening = div > 0.13 && div > slide * 1.2
  const towardCont = a.continental ? signedAng : -signedAng

  let orogeny = 0
  if (colliding) {
    const amp = smoothstep(0.13, 0.42, conv)
    if (a.continental && b.continental) {
      const suture = Math.exp((-edgeDist * edgeDist) / 0.012)
      orogeny = suture * amp
    } else if (a.continental !== b.continental) {
      const inland = Math.exp(-((towardCont - 0.085) * (towardCont - 0.085)) / 0.009)
      orogeny = inland * amp * smoothstep(0.04, 0.12, towardCont)
    } else {
      orogeny = Math.exp((-edgeDist * edgeDist) / 0.008) * amp * 0.22
    }
  }

  const belt = Math.exp((-edgeDist * edgeDist) / 0.011)
  const divergent = opening ? belt * smoothstep(0.13, 0.4, div) : 0

  return { land, orogeny, divergent }
}
