import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { ShaderMaterial, Vector3 } from 'three'
import {
  cloudFragmentShader,
  cloudVertexShader,
} from '../shaders/globeShaders'
import { CLOUD_COLOR, STAR_DIRECTION } from './lighting'
import { emptyCubeMap, type BakedMaps } from './useBakedMaps'
import { useFillLight } from './useFillLight'

type CloudLayerProps = {
  seed: number
  speed: number
  noiseScale: number
  coverage: number
  softness: number
  opacity: number
  stretch: number
  warp: number
  radius: number
  offsetSalt: number
  evenLight: boolean
  valley: number
  baked: BakedMaps | null
}

function seedOffset(seed: number, salt: number): Vector3 {
  const a = (seed ^ (salt * 0x9e3779b9)) >>> 0
  return new Vector3(
    ((a & 1023) / 1023) * 40,
    (((a >>> 10) & 1023) / 1023) * 40,
    (((a >>> 20) & 1023) / 1023) * 40,
  )
}

function CloudLayer({
  seed,
  speed,
  noiseScale,
  coverage,
  softness,
  opacity,
  stretch,
  warp,
  radius,
  offsetSalt,
  evenLight,
  valley,
  baked,
}: CloudLayerProps) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: cloudVertexShader,
        fragmentShader: cloudFragmentShader,
        uniforms: {
          uLightDir: { value: STAR_DIRECTION.clone() },
          uColor: { value: CLOUD_COLOR.clone() },
          uOffset: { value: seedOffset(seed, offsetSalt) },
          uTime: { value: 0 },
          uSpeed: { value: speed },
          uScale: { value: noiseScale },
          uCoverage: { value: coverage },
          uSoftness: { value: softness },
          uOpacity: { value: opacity },
          uStretch: { value: stretch },
          uWarp: { value: warp },
          uFill: { value: 0 },
          uMaps: { value: emptyCubeMap() },
          uHasMaps: { value: 0 },
          uValley: { value: valley },
        },
        transparent: true,
        depthWrite: false,
      }),
    [
      cloudFragmentShader,
      cloudVertexShader,
      coverage,
      noiseScale,
      offsetSalt,
      opacity,
      seed,
      softness,
      speed,
      stretch,
      valley,
      warp,
    ],
  )

  useEffect(() => {
    material.uniforms.uMaps.value = baked?.albedo ?? emptyCubeMap()
    material.uniforms.uHasMaps.value = baked ? 1 : 0
    material.uniforms.uValley.value = valley
  }, [baked, material, valley])

  useFillLight(material, evenLight)

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh
      material={material}
      scale={radius}
      renderOrder={2}
      name="cloud-layer"
    >
      <sphereGeometry args={[1, 96, 96]} />
    </mesh>
  )
}

type CloudsProps = {
  seed: number
  evenLight: boolean
  baked: BakedMaps | null
}

export function Clouds({ seed, evenLight, baked }: CloudsProps) {
  return (
    <group name="homosphere-clouds">
      <CloudLayer
        seed={seed}
        radius={1.02}
        speed={0.012}
        noiseScale={3.1}
        coverage={0.52}
        softness={0.16}
        opacity={0.52}
        stretch={1}
        warp={0.55}
        offsetSalt={1}
        evenLight={evenLight}
        valley={1}
        baked={baked}
      />
      <CloudLayer
        seed={seed}
        radius={1.034}
        speed={0.028}
        noiseScale={5.4}
        coverage={0.64}
        softness={0.12}
        opacity={0.28}
        stretch={2.15}
        warp={0.8}
        offsetSalt={7}
        evenLight={evenLight}
        valley={0.38}
        baked={baked}
      />
    </group>
  )
}
