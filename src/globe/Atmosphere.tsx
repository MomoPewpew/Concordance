import { useMemo } from 'react'
import { AdditiveBlending, BackSide, ShaderMaterial } from 'three'
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
} from '../shaders/globeShaders'
import { ATMOSPHERE_COLOR, STAR_DIRECTION } from './lighting'
import { useFillLight } from './useFillLight'

type AtmosphereProps = {
  evenLight: boolean
}

export function Atmosphere({ evenLight }: AtmosphereProps) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        uniforms: {
          uColor: { value: ATMOSPHERE_COLOR.clone() },
          uIntensity: { value: 0.85 },
          uLightDir: { value: STAR_DIRECTION.clone() },
          uFill: { value: 0 },
        },
        side: BackSide,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )

  useFillLight(material, evenLight)

  return (
    <mesh material={material} scale={1.085} name="atmosphere" renderOrder={4}>
      <sphereGeometry args={[1, 64, 64]} />
    </mesh>
  )
}
