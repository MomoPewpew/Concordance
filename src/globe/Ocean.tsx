import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { ShaderMaterial } from 'three'
import {
  oceanFragmentShader,
  oceanVertexShader,
} from '../shaders/globeShaders'
import { OCEAN_DEEP, OCEAN_SHALLOW, STAR_DIRECTION } from './lighting'
import { useFillLight } from './useFillLight'

type OceanProps = {
  evenLight: boolean
}

export function Ocean({ evenLight }: OceanProps) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: oceanVertexShader,
        fragmentShader: oceanFragmentShader,
        uniforms: {
          uLightDir: { value: STAR_DIRECTION.clone() },
          uDeepColor: { value: OCEAN_DEEP.clone() },
          uShallowColor: { value: OCEAN_SHALLOW.clone() },
          uFill: { value: 0 },
          uTime: { value: 0 },
        },
      }),
    [oceanFragmentShader, oceanVertexShader],
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

  return (
    <mesh material={material} name="ocean">
      <sphereGeometry args={[1, 96, 96]} />
    </mesh>
  )
}
