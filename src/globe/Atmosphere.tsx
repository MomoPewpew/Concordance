import { useMemo } from 'react'
import { AdditiveBlending, BackSide, ShaderMaterial } from 'three'
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
} from '../shaders/globeShaders'
import { ATMOSPHERE_COLOR, SUN_DIRECTION } from './lighting'

export function Atmosphere() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        uniforms: {
          uColor: { value: ATMOSPHERE_COLOR.clone() },
          uIntensity: { value: 0.85 },
          uLightDir: { value: SUN_DIRECTION.clone() },
        },
        side: BackSide,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )

  return (
    <mesh material={material} scale={1.085} name="atmosphere" renderOrder={4}>
      <sphereGeometry args={[1, 64, 64]} />
    </mesh>
  )
}
