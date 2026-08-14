import type { GlobeParams, World } from './types'
import { sampleWorld } from './sampleWorld'
import { clamp, lerp } from '../worldgen/noise'

export type RandomiserSettings = {
  /** Degrees of obliquity. 0 = spin aligned with orbit. */
  axialTilt: number
  /** 0 = more land, 1 = more ocean. */
  oceanAmount: number
  /** 0 = flatter, 1 = taller relief. */
  mountainHeight: number
  /** 0 = many small landmasses, 1 = few large continents. */
  continentSize: number
  /** 0 = worn/smooth, 1 = sharp ridges. */
  roughness: number
  /** 0 = broad climate bands, 1 = patchier biomes. */
  climateVariation: number
}

const OCEAN_BIAS = { land: 0.18, water: -0.48 }
const HEIGHT_SCALE = { min: 0.028, max: 0.13 }
const CONTINENT_SCALE = { large: 0.55, small: 2.15 }
const WEIRDNESS_SCALE = { min: 2.2, max: 5.5 }
const EROSION_SCALE = { min: 2.0, max: 4.2 }
const TEMP_SCALE = { min: 0.8, max: 2.6 }
const HUMIDITY_SCALE = { min: 1.2, max: 3.0 }

function inverseLerp(a: number, b: number, v: number): number {
  if (a === b) return 0
  return clamp((v - a) / (b - a), 0, 1)
}

export function settingsFromGlobe(globe: GlobeParams): RandomiserSettings {
  return {
    axialTilt: globe.axialTilt,
    oceanAmount: inverseLerp(OCEAN_BIAS.land, OCEAN_BIAS.water, globe.oceanBias),
    mountainHeight: inverseLerp(HEIGHT_SCALE.min, HEIGHT_SCALE.max, globe.heightScale),
    continentSize: inverseLerp(
      CONTINENT_SCALE.small,
      CONTINENT_SCALE.large,
      globe.continentalness.scale,
    ),
    roughness: inverseLerp(
      WEIRDNESS_SCALE.min,
      WEIRDNESS_SCALE.max,
      globe.weirdness.scale,
    ),
    climateVariation: inverseLerp(
      TEMP_SCALE.min,
      TEMP_SCALE.max,
      globe.temperature.scale,
    ),
  }
}

export function globeFromSettings(
  settings: RandomiserSettings,
  seed: number,
  base: GlobeParams = sampleWorld.globe,
): GlobeParams {
  return {
    ...base,
    seed,
    axialTilt: settings.axialTilt,
    oceanBias: lerp(OCEAN_BIAS.land, OCEAN_BIAS.water, settings.oceanAmount),
    heightScale: lerp(HEIGHT_SCALE.min, HEIGHT_SCALE.max, settings.mountainHeight),
    continentalness: {
      ...base.continentalness,
      scale: lerp(
        CONTINENT_SCALE.small,
        CONTINENT_SCALE.large,
        settings.continentSize,
      ),
    },
    weirdness: {
      ...base.weirdness,
      scale: lerp(WEIRDNESS_SCALE.min, WEIRDNESS_SCALE.max, settings.roughness),
    },
    erosion: {
      ...base.erosion,
      scale: lerp(EROSION_SCALE.min, EROSION_SCALE.max, settings.roughness),
    },
    temperature: {
      ...base.temperature,
      scale: lerp(TEMP_SCALE.min, TEMP_SCALE.max, settings.climateVariation),
    },
    humidity: {
      ...base.humidity,
      scale: lerp(HUMIDITY_SCALE.min, HUMIDITY_SCALE.max, settings.climateVariation),
    },
  }
}

export function createWorld(
  settings: RandomiserSettings,
  seed: number,
  universeId = sampleWorld.universeId,
): World {
  return {
    id: `world-${seed}`,
    universeId,
    name: `World ${seed}`,
    globe: globeFromSettings(settings, seed),
  }
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0
}

export const defaultRandomiserSettings: RandomiserSettings = settingsFromGlobe(
  sampleWorld.globe,
)
