import { useEffect, useMemo } from 'react'
import { ShaderMaterial } from 'three'
import type { OverlayMode } from '../data/overlay'
import type { GlobeParams } from '../data/types'
import {
  terrainFragmentShader,
  terrainVertexShader,
} from '../shaders/globeShaders'
import { Lakes } from './Lakes'
import { ROCK_COLOR, SAND_COLOR, SNOW_COLOR, STAR_DIRECTION } from './lighting'
import { emptyCubeMap, useBakedMaps } from './useBakedMaps'
import { useFillLight } from './useFillLight'
import { useOverlay } from './useOverlay'
import { useTerrainTiles } from './useTerrainTiles'

type TerrainTilesProps = {
  params: GlobeParams
  evenLight: boolean
  overlay: OverlayMode
  lite?: boolean
  showLakes?: boolean
}

export function TerrainTiles({
  params,
  evenLight,
  overlay,
  lite = false,
  showLakes = true,
}: TerrainTilesProps) {
  const { tiles, groupRef } = useTerrainTiles(params, lite)
  const baked = useBakedMaps(params)

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
          uOverlay: { value: 0 },
          uHeightScale: { value: 0.08 },
          uSeed: { value: 0 },
          uMaps: { value: emptyCubeMap() },
          uHasMaps: { value: 0 },
          uInlandSeas: { value: 0 },
        },
        vertexColors: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    [],
  )

  useEffect(() => {
    material.uniforms.uHeightScale.value = params.heightScale
    material.uniforms.uSeed.value = (params.seed % 10000) * 0.017
    material.uniforms.uInlandSeas.value = params.inlandSeas ?? 0
  }, [material, params.heightScale, params.seed, params.inlandSeas])

  useEffect(() => {
    material.uniforms.uMaps.value = baked ?? emptyCubeMap()
    material.uniforms.uHasMaps.value = baked ? 1 : 0
  }, [material, baked])

  useFillLight(material, evenLight)
  useOverlay(material, overlay)

  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  return (
    <group ref={groupRef} name="terrain-tiles">
      {tiles.map((tile) => (
        <mesh
          key={tile.id}
          geometry={tile.terrain}
          material={material}
          name={`terrain-${tile.id}`}
        />
      ))}
      {showLakes && <Lakes tiles={tiles} evenLight={evenLight} />}
    </group>
  )
}
