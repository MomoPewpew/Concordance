import type { NoiseFunction3D } from 'simplex-noise'
import type { GlobeParams } from '../data/types'
import { clamp, createFbm, fbm3, hashSeed, lerp } from './noise'

export type ClimateSamplers = {
  continentalness: NoiseFunction3D
  erosion: NoiseFunction3D
  weirdness: NoiseFunction3D
  temperature: NoiseFunction3D
  humidity: NoiseFunction3D
  warp: NoiseFunction3D
}

export type ClimateSample = {
  continentalness: number
  erosion: number
  weirdness: number
  temperature: number
  humidity: number
}

export function createClimateSamplers(seed: number): ClimateSamplers {
  return {
    continentalness: createFbm(hashSeed(seed, 0x11)),
    erosion: createFbm(hashSeed(seed, 0x22)),
    weirdness: createFbm(hashSeed(seed, 0x33)),
    temperature: createFbm(hashSeed(seed, 0x44)),
    humidity: createFbm(hashSeed(seed, 0x55)),
    warp: createFbm(hashSeed(seed, 0x66)),
  }
}

export function sampleClimate(
  x: number,
  y: number,
  z: number,
  params: GlobeParams,
  samplers: ClimateSamplers,
): ClimateSample {
  const warpAmp = 0.14
  const ws = 2.35
  const wx = samplers.warp(x * ws, y * ws, z * ws) * warpAmp
  const wy = samplers.warp(x * ws + 40, y * ws - 11, z * ws + 7) * warpAmp
  const wz = samplers.warp(x * ws - 18, y * ws + 23, z * ws - 5) * warpAmp
  const px = x + wx
  const py = y + wy
  const pz = z + wz

  const cRaw =
    fbm3(samplers.continentalness, px, py, pz, params.continentalness) +
    params.oceanBias
  const c = clamp(cRaw * 1.15, -1.15, 1)
  const e = fbm3(samplers.erosion, px, py, pz, params.erosion)
  const w = fbm3(samplers.weirdness, px, py, pz, params.weirdness)
  const tNoise = fbm3(samplers.temperature, px, py, pz, params.temperature)
  const hNoise = fbm3(samplers.humidity, px, py, pz, params.humidity)

  const latitudeTemp = 1 - Math.abs(y)
  const baseTemp = latitudeTemp * 2 - 1
  const temperature = clamp(lerp(baseTemp, tNoise, 0.3), -1, 1)

  const coastalWet = Math.max(-c, 0) * 0.2
  const inlandDry = Math.max(c, 0) * 0.28
  const humidity = clamp(hNoise * 0.82 + coastalWet - inlandDry, -1, 1)

  return {
    continentalness: c,
    erosion: e,
    weirdness: w,
    temperature,
    humidity,
  }
}
