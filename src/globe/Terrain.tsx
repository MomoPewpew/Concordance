import { useMemo } from 'react'
import { ShaderMaterial } from 'three'
import type { GlobeParams } from '../data/types'
import {
  terrainFragmentShader,
  terrainVertexShader,
} from '../shaders/globeShaders'
import { generateTerrain } from '../worldgen/generateTerrain'
import { ROCK_COLOR, SAND_COLOR, SNOW_COLOR, STAR_DIRECTION } from './lighting'
import { useFillLight } from './useFillLight'

type TerrainProps = {
  params: GlobeParams
  evenLight: boolean
}

export function Terrain({ params, evenLight }: TerrainProps) {
  const geometry = useMemo(() => generateTerrain(params), [params])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: terrainVertexShader,
        fragmentShader: terrainFragmentShader,
        uniforms: {
          uLightDir: { value: STAR_DIRECTION.clone() },
          uRockColor: { value: ROCK_COLOR.clone() },
          uSandColor: { value: SAND_COLOR.clone() },
          uSnowColor: { value: SNOW_COLOR.clone() },
          uFill: { value: 0 },
        },
        vertexColors: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    [],
  )

  useFillLight(material, evenLight)

  return <mesh geometry={geometry} material={material} name="terrain" />
}
