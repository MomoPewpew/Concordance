import type { GlobeParams } from '../data/types'
import { BIOME_SRGB, pickBiome } from './biomes'
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

export function bakeCubeFace(
  params: GlobeParams,
  face: number,
  size: number,
  samplers: ClimateSamplers = createClimateSamplers(params.seed),
): Uint8Array {
  const pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    const v = (2 * (y + 0.5)) / size - 1
    for (let x = 0; x < size; x++) {
      const u = (2 * (x + 0.5)) / size - 1
      const [dx, dy, dz] = cubeFaceDir(face, u, v)
      const climate = sampleClimate(dx, dy, dz, params, samplers)
      const height = heightFromClimate(climate)
      const elevation = height * params.heightScale
      const temperature = applyLapseRate(climate.temperature, elevation)
      const biome = pickBiome(climate, height, temperature, false)
      const [r, g, b] = BIOME_SRGB[biome]
      const i = (y * size + x) * 4
      pixels[i] = toByte(r)
      pixels[i + 1] = toByte(g)
      pixels[i + 2] = toByte(b)
      pixels[i + 3] = toByte(elevation * 6 + 0.5)
    }
  }
  return pixels
}

export function bakeCubeMaps(
  params: GlobeParams,
  size = BAKE_SIZE,
): Uint8Array[] {
  const samplers = createClimateSamplers(params.seed)
  return [0, 1, 2, 3, 4, 5].map((face) =>
    bakeCubeFace(params, face, size, samplers),
  )
}
