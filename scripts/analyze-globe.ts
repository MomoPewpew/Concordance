import { sampleWorld } from '../src/data/sampleWorld.ts'
import { pickBiome } from '../src/worldgen/biomes.ts'
import { createClimateSamplers, sampleClimate } from '../src/worldgen/climate.ts'
import { applyLapseRate, heightFromClimate } from '../src/worldgen/height.ts'

const params = sampleWorld.globe
const samplers = createClimateSamplers(params)
const counts = new Map<string, number>()
let land = 0
let ocean = 0
let minH = Infinity
let maxH = -Infinity
const n = 12000

for (let i = 0; i < n; i++) {
  const u = Math.random()
  const v = Math.random()
  const theta = 2 * Math.PI * u
  const phi = Math.acos(2 * v - 1)
  const x = Math.sin(phi) * Math.cos(theta)
  const y = Math.cos(phi)
  const z = Math.sin(phi) * Math.sin(theta)
  const climate = sampleClimate(x, y, z, params, samplers)
  const height = heightFromClimate(climate)
  const elevation = height * params.heightScale
  const temperature = applyLapseRate(climate.temperature, elevation)
  const biome = pickBiome(climate, height, temperature)
  counts.set(biome, (counts.get(biome) ?? 0) + 1)
  if (height > 0) land++
  else ocean++
  minH = Math.min(minH, height)
  maxH = Math.max(maxH, height)
}

console.log('land%', ((land / n) * 100).toFixed(1))
console.log('ocean%', ((ocean / n) * 100).toFixed(1))
console.log('height', minH.toFixed(3), maxH.toFixed(3))
console.log('displacement', (minH * params.heightScale).toFixed(4), (maxH * params.heightScale).toFixed(4))
;[...counts.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(k, ((v / n) * 100).toFixed(1) + '%'))
