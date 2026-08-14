import { useMemo } from 'react'
import type { World } from '../data/types'
import { Atmosphere } from './Atmosphere'
import { Clouds } from './Clouds'
import { SUN_DIRECTION } from './lighting'
import { Ocean } from './Ocean'
import { OrbitAxis, SpinAxis } from './PlanetAxes'
import { Precipitation } from './Precipitation'
import { SeaLevel } from './SeaLevel'
import { Terrain } from './Terrain'

type GlobeSceneProps = {
  world: World
  showSpinAxis: boolean
}

export function GlobeScene({ world, showSpinAxis }: GlobeSceneProps) {
  const sunPos = useMemo(
    () => SUN_DIRECTION.clone().multiplyScalar(8),
    [],
  )
  const tiltRad = -(world.globe.axialTilt * Math.PI) / 180

  return (
    <>
      <hemisphereLight args={['#c5d8ff', '#1a1424', 0.45]} />
      <directionalLight position={sunPos} intensity={1.35} color="#fff4e0" />
      <group rotation={[0, 0, tiltRad]} name="planet">
        <SeaLevel />
        <Ocean />
        <Terrain params={world.globe} />
        <Precipitation params={world.globe} />
        <Clouds seed={world.globe.seed} />
        <Atmosphere />
        {showSpinAxis && <SpinAxis />}
      </group>
      {showSpinAxis && <OrbitAxis />}
    </>
  )
}
