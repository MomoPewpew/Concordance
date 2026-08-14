import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AdditiveBlending, ShaderMaterial } from 'three'
import type { GlobeParams } from '../data/types'
import {
  precipFragmentShader,
  precipVertexShader,
} from '../shaders/globeShaders'
import { generatePrecipitation } from '../worldgen/precipitation'
import { RAIN_COLOR, SNOW_COLOR, STAR_DIRECTION } from './lighting'
import { useFillLight } from './useFillLight'

type PrecipitationProps = {
  params: GlobeParams
  evenLight: boolean
}

export function Precipitation({ params, evenLight }: PrecipitationProps) {
  const geometry = useMemo(() => generatePrecipitation(params), [params])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: precipVertexShader,
        fragmentShader: precipFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uInner: { value: 1.006 },
          uOuter: { value: 1.024 },
          uRainColor: { value: RAIN_COLOR.clone() },
          uSnowColor: { value: SNOW_COLOR.clone() },
          uLightDir: { value: STAR_DIRECTION.clone() },
          uFill: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )

  useFillLight(material, evenLight)

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
  })

  useEffect(
    () => () => {
      geometry.dispose()
    },
    [geometry],
  )

  if (geometry.getAttribute('position').count === 0) return null

  return (
    <points
      geometry={geometry}
      material={material}
      renderOrder={1}
      name="precipitation"
    />
  )
}
