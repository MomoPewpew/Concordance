import { useMemo } from 'react'
import { ShaderMaterial } from 'three'
import type { GlobeParams } from '../data/types'
import {
  oceanFragmentShader,
  oceanVertexShader,
} from '../shaders/globeShaders'
import { generateLakes } from '../worldgen/generateTerrain'
import { LAKE_DEEP, LAKE_SHALLOW, STAR_DIRECTION } from './lighting'
import { useFillLight } from './useFillLight'

type LakesProps = {
  params: GlobeParams
  evenLight: boolean
}

export function Lakes({ params, evenLight }: LakesProps) {
  const geometry = useMemo(() => generateLakes(params), [params])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: oceanVertexShader,
        fragmentShader: oceanFragmentShader,
        uniforms: {
          uLightDir: { value: STAR_DIRECTION.clone() },
          uDeepColor: { value: LAKE_DEEP.clone() },
          uShallowColor: { value: LAKE_SHALLOW.clone() },
          uFill: { value: 0 },
        },
      }),
    [],
  )

  useFillLight(material, evenLight)

  if (!geometry) return null

  return (
    <mesh
      geometry={geometry}
      material={material}
      name="lakes"
      renderOrder={1}
    />
  )
}
