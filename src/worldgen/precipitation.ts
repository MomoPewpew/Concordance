import { BufferAttribute, BufferGeometry } from 'three'
import type { GlobeParams } from '../data/types'
import { createClimateSamplers, sampleClimate } from './climate'
import { applyLapseRate, heightFromClimate } from './height'
import { clamp, hashSeed, mulberry32 } from './noise'

const PARTICLE_COUNT = 18000
const MAX_ATTEMPTS = PARTICLE_COUNT * 10

function randomOnSphere(rng: () => number): [number, number, number] {
  const theta = 2 * Math.PI * rng()
  const phi = Math.acos(2 * rng() - 1)
  const sinPhi = Math.sin(phi)
  return [sinPhi * Math.cos(theta), Math.cos(phi), sinPhi * Math.sin(theta)]
}

/** Rain over humid air, snow when cold. Dry biomes stay clear. */
export function precipAt(
  humidity: number,
  temperature: number,
): { intensity: number; snow: boolean } | null {
  const snow = temperature < -0.16
  if (snow) {
    const intensity = clamp(0.28 + Math.max(humidity, 0) * 0.45 + (-temperature) * 0.25, 0.2, 1)
    return { intensity, snow: true }
  }
  if (humidity < 0.02) return null
  const intensity = clamp((humidity - 0.02) / 0.65, 0, 1)
  if (intensity < 0.18) return null
  return { intensity, snow: false }
}

export function generatePrecipitation(params: GlobeParams): BufferGeometry {
  const rng = mulberry32(hashSeed(params.seed, 0x77))
  const samplers = createClimateSamplers(params)

  const dirs: number[] = []
  const phases: number[] = []
  const speeds: number[] = []
  const kinds: number[] = []
  const intensities: number[] = []

  let attempts = 0
  while (dirs.length / 3 < PARTICLE_COUNT && attempts < MAX_ATTEMPTS) {
    attempts += 1
    const [x, y, z] = randomOnSphere(rng)
    const climate = sampleClimate(x, y, z, params, samplers)
    const height = heightFromClimate(climate)
    const elevation = height * params.heightScale
    const temperature = applyLapseRate(climate.temperature, elevation)
    const precip = precipAt(climate.humidity, temperature)
    if (!precip) continue

    dirs.push(x, y, z)
    phases.push(rng())
    kinds.push(precip.snow ? 1 : 0)
    intensities.push(precip.intensity)
    speeds.push(
      precip.snow
        ? 0.07 + rng() * 0.05
        : 0.22 + rng() * 0.18 + precip.intensity * 0.08,
    )
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(dirs), 3))
  geometry.setAttribute('aPhase', new BufferAttribute(new Float32Array(phases), 1))
  geometry.setAttribute('aSpeed', new BufferAttribute(new Float32Array(speeds), 1))
  geometry.setAttribute('aKind', new BufferAttribute(new Float32Array(kinds), 1))
  geometry.setAttribute(
    'aIntensity',
    new BufferAttribute(new Float32Array(intensities), 1),
  )
  geometry.computeBoundingSphere()
  if (geometry.boundingSphere) geometry.boundingSphere.radius = 1.06
  return geometry
}
