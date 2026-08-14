import type { NoiseFunction3D } from 'simplex-noise'
import type { GlobeParams } from '../data/types'
import { clamp, createFbm, fbm3, hashSeed, lerp } from './noise'
import { createPlates, sampleTectonics, type PlateField } from './plates'

export type ClimateSamplers = {
  continentalness: NoiseFunction3D
  erosion: NoiseFunction3D
  weirdness: NoiseFunction3D
  temperature: NoiseFunction3D
  humidity: NoiseFunction3D
  warp: NoiseFunction3D
  lake: NoiseFunction3D
  plates: PlateField
}

export type ClimateSample = {
  continentalness: number
  erosion: number
  weirdness: number
  ridgeFine: number
  orogeny: number
  divergent: number
  plateLand: number
  temperature: number
  humidity: number
}

export function createClimateSamplers(params: GlobeParams): ClimateSamplers {
  return {
    continentalness: createFbm(hashSeed(params.seed, 0x11)),
    erosion: createFbm(hashSeed(params.seed, 0x22)),
    weirdness: createFbm(hashSeed(params.seed, 0x33)),
    temperature: createFbm(hashSeed(params.seed, 0x44)),
    humidity: createFbm(hashSeed(params.seed, 0x55)),
    warp: createFbm(hashSeed(params.seed, 0x66)),
    lake: createFbm(hashSeed(params.seed, 0x99)),
    plates: createPlates(params),
  }
}

export function sampleClimate(
  x: number,
  y: number,
  z: number,
  params: GlobeParams,
  samplers: ClimateSamplers,
): ClimateSample {
  const warpAmp = 0.16
  const ws = 2.35
  const wx = samplers.warp(x * ws, y * ws, z * ws) * warpAmp
  const wy = samplers.warp(x * ws + 40, y * ws - 11, z * ws + 7) * warpAmp
  const wz = samplers.warp(x * ws - 18, y * ws + 23, z * ws - 5) * warpAmp
  const px = x + wx
  const py = y + wy
  const pz = z + wz
  const plen = Math.hypot(px, py, pz) || 1
  const tec = sampleTectonics(px / plen, py / plen, pz / plen, samplers.plates)

  const cNoise = fbm3(samplers.continentalness, px, py, pz, params.continentalness)
  const eNoise = fbm3(samplers.erosion, px, py, pz, params.erosion)
  const w = fbm3(samplers.weirdness, px, py, pz, params.weirdness)
  const wFine = fbm3(samplers.weirdness, px, py, pz, {
    ...params.weirdness,
    scale: params.weirdness.scale * 2.55,
    octaves: Math.max(1, params.weirdness.octaves - 1),
  })
  const tNoise = fbm3(samplers.temperature, px, py, pz, params.temperature)
  const hNoise = fbm3(samplers.humidity, px, py, pz, params.humidity)

  const cLand = clamp(cNoise * 0.52 + 0.3, -0.24, 0.95)
  const cOcean = clamp(cNoise * 0.22 - 0.62, -1.15, -0.12)
  const c = lerp(cOcean, cLand, tec.land)
  const e = clamp(lerp(eNoise, -0.8, tec.orogeny * 0.92), -1, 1)

  const latitudeTemp = 1 - Math.abs(y)
  const baseTemp = latitudeTemp * 2 - 1
  const temperature = clamp(lerp(baseTemp, tNoise, 0.3), -1, 1)

  const coastalWet = Math.max(-c, 0) * 0.22
  const inlandDry = Math.max(c, 0) * 0.14
  const humidity = clamp(hNoise * 0.9 + coastalWet - inlandDry, -1, 1)

  return {
    continentalness: c,
    erosion: e,
    weirdness: w,
    ridgeFine: wFine,
    orogeny: tec.orogeny,
    divergent: tec.divergent,
    plateLand: tec.land,
    temperature,
    humidity,
  }
}
