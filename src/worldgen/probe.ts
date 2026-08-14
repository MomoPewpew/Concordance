import type { GlobeParams } from '../data/types'
import type { BiomeId } from './biomes'
import { pickBiome } from './biomes'
import {
  createClimateSamplers,
  sampleClimate,
  type ClimateSamplers,
} from './climate'
import { applyLapseRate, heightFromClimate } from './height'
import { clamp } from './noise'
import { isInlandSea, sampleLakeNoise } from './water'

export type SurfaceProbe = {
  lat: number
  lon: number
  elevation: number
  biome: BiomeId
  temperature: number
  humidity: number
  continentalness: number
  erosion: number
  lake: boolean
}

export function directionToLatLon(
  x: number,
  y: number,
  z: number,
): { lat: number; lon: number } {
  const n = Math.hypot(x, y, z) || 1
  const ny = clamp(y / n, -1, 1)
  return {
    lat: (Math.asin(ny) * 180) / Math.PI,
    lon: (Math.atan2(x / n, z / n) * 180) / Math.PI,
  }
}

export function latLonToDirection(
  lat: number,
  lon: number,
): [number, number, number] {
  const latR = (lat * Math.PI) / 180
  const lonR = (lon * Math.PI) / 180
  const c = Math.cos(latR)
  return [c * Math.sin(lonR), Math.sin(latR), c * Math.cos(lonR)]
}

export function probeSurface(
  params: GlobeParams,
  x: number,
  y: number,
  z: number,
  samplers: ClimateSamplers = createClimateSamplers(params.seed),
): SurfaceProbe {
  const n = Math.hypot(x, y, z) || 1
  const dx = x / n
  const dy = y / n
  const dz = z / n
  const climate = sampleClimate(dx, dy, dz, params, samplers)
  const height = heightFromClimate(climate)
  const elevation = height * params.heightScale
  const lake = isInlandSea(
    climate,
    height,
    params,
    sampleLakeNoise(samplers.lake, dx, dy, dz),
  )
  const temperature = applyLapseRate(climate.temperature, elevation)
  const { lat, lon } = directionToLatLon(dx, dy, dz)
  return {
    lat,
    lon,
    elevation,
    biome: pickBiome(climate, height, temperature, lake),
    temperature,
    humidity: climate.humidity,
    continentalness: climate.continentalness,
    erosion: climate.erosion,
    lake,
  }
}
