import { useMemo } from 'react'
import { ShaderMaterial } from 'three'
import {
  oceanFragmentShader,
  oceanVertexShader,
} from '../shaders/globeShaders'
import { OCEAN_DEEP, OCEAN_SHALLOW, STAR_DIRECTION } from './lighting'

export function Ocean() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: oceanVertexShader,
        fragmentShader: oceanFragmentShader,
        uniforms: {
          uLightDir: { value: STAR_DIRECTION.clone() },
          uDeepColor: { value: OCEAN_DEEP.clone() },
          uShallowColor: { value: OCEAN_SHALLOW.clone() },
        },
      }),
    [],
  )

  return (
    <mesh material={material} name="ocean">
      <sphereGeometry args={[1, 96, 96]} />
    </mesh>
  )
}
