import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { DoubleSide, ShaderMaterial } from 'three'
import type { GlobeParams } from '../data/types'
import {
  riverFragmentShader,
  riverVertexShader,
} from '../shaders/globeShaders'
import { generateDrainages } from '../worldgen/rivers'
import { RIVER_DEEP, RIVER_SHALLOW, STAR_DIRECTION } from './lighting'
import { useFillLight } from './useFillLight'

type DrainagesProps = {
  params: GlobeParams
  evenLight: boolean
}

export function Drainages({ params, evenLight }: DrainagesProps) {
  const geometry = useMemo(() => generateDrainages(params), [params])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: riverVertexShader,
        fragmentShader: riverFragmentShader,
        uniforms: {
          uLightDir: { value: STAR_DIRECTION.clone() },
          uDeepColor: { value: RIVER_DEEP.clone() },
          uShallowColor: { value: RIVER_SHALLOW.clone() },
          uFill: { value: 0 },
          uTime: { value: 0 },
        },
        side: DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [riverFragmentShader, riverVertexShader],
  )

  useFillLight(material, evenLight)

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
  })

  useEffect(
    () => () => {
      material.dispose()
    },
    [material],
  )

  const count = geometry.getAttribute('position')?.count ?? 0
  if (count < 6) return null

  return (
    <mesh
      geometry={geometry}
      material={material}
      name="drainages"
      renderOrder={2}
    />
  )
}
