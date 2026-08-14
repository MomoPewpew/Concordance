import type { GlobeParams } from '../data/types'
import { blendBiomeSrgb } from './biomes'
import {
  createClimateSamplers,
  sampleClimate,
  type ClimateSamplers,
} from './climate'
import { applyLapseRate, heightFromClimate } from './height'
import { clamp } from './noise'

export const BAKE_SIZE = 512

/**
 * OpenGL cubemap face directions. u,v in [-1, 1] match GPU s,t after a
 * flipY=false DataTexture upload (row 0 is t=0, the bottom of the face).
 */
export function cubeFaceDir(
  face: number,
  u: number,
  v: number,
): [number, number, number] {
  let x = 0
  let y = 0
  let z = 0
  if (face === 0) {
    x = 1
    y = -v
    z = -u
  } else if (face === 1) {
    x = -1
    y = -v
    z = u
  } else if (face === 2) {
    x = u
    y = 1
    z = v
  } else if (face === 3) {
    x = u
    y = -1
    z = -v
  } else if (face === 4) {
    x = u
    y = -v
    z = 1
  } else {
    x = -u
    y = -v
    z = -1
  }
  const n = Math.hypot(x, y, z) || 1
  return [x / n, y / n, z / n]
}

export function bakeKey(params: GlobeParams): string {
  return JSON.stringify(params, (key, value) =>
    key === 'axialTilt' || key === 'flattening' || key === 'resolution'
      ? undefined
      : value,
  )
}

function toByte(v: number): number {
  return Math.round(clamp(v, 0, 1) * 255)
}

function displaced(
  dir: [number, number, number],
  elevation: number,
): [number, number, number] {
  const r = 1 + elevation
  return [dir[0] * r, dir[1] * r, dir[2] * r]
}

export function bakeCubeFace(
  params: GlobeParams,
  face: number,
  size: number,
  samplers: ClimateSamplers = createClimateSamplers(params),
): { albedo: Uint8Array; normals: Uint8Array } {
  const albedo = new Uint8Array(size * size * 4)
  const normals = new Uint8Array(size * size * 4)
  const elev = new Float32Array(size * size)
  const dirs: Array<[number, number, number]> = new Array(size * size)

  for (let y = 0; y < size; y++) {
    const v = (2 * (y + 0.5)) / size - 1
    for (let x = 0; x < size; x++) {
      const u = (2 * (x + 0.5)) / size - 1
      const dir = cubeFaceDir(face, u, v)
      const climate = sampleClimate(dir[0], dir[1], dir[2], params, samplers)
      const height = heightFromClimate(climate)
      const elevation = height * params.heightScale
      const temperature = applyLapseRate(climate.temperature, elevation)
      const [r, g, b] = blendBiomeSrgb(
        climate.continentalness,
        climate.humidity,
        climate.erosion,
        height,
        temperature,
      )
      const i = y * size + x
      const p = i * 4
      albedo[p] = toByte(r)
      albedo[p + 1] = toByte(g)
      albedo[p + 2] = toByte(b)
      albedo[p + 3] = toByte(elevation * 6 + 0.5)
      elev[i] = elevation
      dirs[i] = dir
    }
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      const xL = Math.max(x - 1, 0)
      const xR = Math.min(x + 1, size - 1)
      const yD = Math.max(y - 1, 0)
      const yU = Math.min(y + 1, size - 1)
      const pL = displaced(dirs[y * size + xL], elev[y * size + xL])
      const pR = displaced(dirs[y * size + xR], elev[y * size + xR])
      const pD = displaced(dirs[yD * size + x], elev[yD * size + x])
      const pU = displaced(dirs[yU * size + x], elev[yU * size + x])
      let nx = (pR[1] - pL[1]) * (pU[2] - pD[2]) - (pR[2] - pL[2]) * (pU[1] - pD[1])
      let ny = (pR[2] - pL[2]) * (pU[0] - pD[0]) - (pR[0] - pL[0]) * (pU[2] - pD[2])
      let nz = (pR[0] - pL[0]) * (pU[1] - pD[1]) - (pR[1] - pL[1]) * (pU[0] - pD[0])
      const dir = dirs[i]
      if (nx * dir[0] + ny * dir[1] + nz * dir[2] < 0) {
        nx = -nx
        ny = -ny
        nz = -nz
      }
      const len = Math.hypot(nx, ny, nz) || 1
      const p = i * 4
      normals[p] = toByte(nx / len * 0.5 + 0.5)
      normals[p + 1] = toByte(ny / len * 0.5 + 0.5)
      normals[p + 2] = toByte(nz / len * 0.5 + 0.5)
      normals[p + 3] = 255
    }
  }

  return { albedo, normals }
}

export function bakeCubeMaps(
  params: GlobeParams,
  size = BAKE_SIZE,
): { albedo: Uint8Array[]; normals: Uint8Array[] } {
  const samplers = createClimateSamplers(params)
  const albedo: Uint8Array[] = []
  const normals: Uint8Array[] = []
  for (let face = 0; face < 6; face++) {
    const baked = bakeCubeFace(params, face, size, samplers)
    albedo.push(baked.albedo)
    normals.push(baked.normals)
  }
  return { albedo, normals }
}
