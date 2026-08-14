import type { FeatureKind, GlobeParams } from '../data/types'
import { BIOME_SRGB } from './biomes'
import { createClimateSamplers } from './climate'
import { latLonToDirection, probeSurface } from './probe'

export const MINIMAP_WIDTH = 240
export const MINIMAP_HEIGHT = 72

const minimapCache = new Map<string, ImageData>()

function minimapKey(params: GlobeParams): string {
  return JSON.stringify(params, (key, value) =>
    key === 'axialTilt' || key === 'resolution' ? undefined : value,
  )
}

export function paintMinimap(params: GlobeParams): ImageData {
  const key = minimapKey(params)
  const cached = minimapCache.get(key)
  if (cached) return cached

  const samplers = createClimateSamplers(params.seed)
  const pixels = new Uint8ClampedArray(MINIMAP_WIDTH * MINIMAP_HEIGHT * 4)
  for (let y = 0; y < MINIMAP_HEIGHT; y++) {
    const lat = 90 - ((y + 0.5) / MINIMAP_HEIGHT) * 180
    for (let x = 0; x < MINIMAP_WIDTH; x++) {
      const lon = -180 + ((x + 0.5) / MINIMAP_WIDTH) * 360
      const [dx, dy, dz] = latLonToDirection(lat, lon)
      const probe = probeSurface(params, dx, dy, dz, samplers)
      const [r, g, b] = BIOME_SRGB[probe.biome]
      const i = (y * MINIMAP_WIDTH + x) * 4
      pixels[i] = Math.round(r * 255)
      pixels[i + 1] = Math.round(g * 255)
      pixels[i + 2] = Math.round(b * 255)
      pixels[i + 3] = 255
    }
  }

  const image = new ImageData(pixels, MINIMAP_WIDTH, MINIMAP_HEIGHT)
  minimapCache.set(key, image)
  return image
}

export function lonToX(lon: number, width: number): number {
  return ((lon + 180) / 360) * width
}

export function latToY(lat: number, height: number): number {
  return ((90 - lat) / 180) * height
}

export function xyToLatLon(
  x: number,
  y: number,
  width: number,
  height: number,
): { lat: number; lon: number } {
  return {
    lon: (x / width) * 360 - 180,
    lat: 90 - (y / height) * 180,
  }
}

export function pinColor(
  feature: FeatureKind | undefined,
  selected: boolean,
): string {
  if (selected) return '#ffe08a'
  if (feature === 'peak') return '#f0d2a8'
  if (feature === 'basin') return '#c4b5fd'
  if (feature === 'island') return '#86efac'
  if (feature === 'lake') return '#5eead4'
  return '#7dd3fc'
}
