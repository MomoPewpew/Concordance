import { useEffect, useMemo } from 'react'
import { ShaderMaterial } from 'three'
import {
  oceanFragmentShader,
  oceanVertexShader,
} from '../shaders/globeShaders'
import { LAKE_DEEP, LAKE_SHALLOW, STAR_DIRECTION } from './lighting'
import { useFillLight } from './useFillLight'
import type { TileView } from './useTerrainTiles'

type LakesProps = {
  tiles: TileView[]
  evenLight: boolean
}

export function Lakes({ tiles, evenLight }: LakesProps) {
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

  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  return (
    <>
      {tiles.map((tile) =>
        tile.lakes ? (
          <mesh
            key={tile.id}
            geometry={tile.lakes}
            material={material}
            name={`lakes-${tile.id}`}
            renderOrder={1}
          />
        ) : null,
      )}
    </>
  )
}
