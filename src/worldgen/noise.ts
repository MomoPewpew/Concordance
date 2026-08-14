import { createNoise3D, type NoiseFunction3D } from 'simplex-noise'
import type { NoiseLayer } from '../data/types'

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashSeed(seed: number, salt: number): number {
  return Math.imul(seed ^ salt, 0x9e3779b9) >>> 0
}

export function createFbm(seed: number): NoiseFunction3D {
  return createNoise3D(mulberry32(seed))
}

export function fbm3(
  noise: NoiseFunction3D,
  x: number,
  y: number,
  z: number,
  layer: NoiseLayer,
): number {
  let value = 0
  let amplitude = 1
  let frequency = 1
  let max = 0
  const ox = layer.offset[0]
  const oy = layer.offset[1]
  const oz = layer.offset[2]
  for (let i = 0; i < layer.octaves; i++) {
    const sx = (x + ox) * layer.scale * frequency
    const sy = (y + oy) * layer.scale * frequency
    const sz = (z + oz) * layer.scale * frequency
    value += amplitude * noise(sx, sy, sz)
    max += amplitude
    amplitude *= layer.persistence
    frequency *= layer.lacunarity
  }
  return max > 0 ? value / max : 0
}

export function ridged(n: number): number {
  return 1 - Math.abs(n)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function remap(
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const t = (v - inMin) / (inMax - inMin)
  return outMin + clamp(t, 0, 1) * (outMax - outMin)
}

export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
