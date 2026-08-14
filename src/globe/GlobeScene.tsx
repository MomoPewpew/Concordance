import { useMemo } from 'react'
import type { World } from '../data/types'
import { Atmosphere } from './Atmosphere'
import { Clouds } from './Clouds'
import { STAR_DIRECTION } from './lighting'
import { Ocean } from './Ocean'
import { OrbitAxis, SpinAxis } from './PlanetAxes'
import { Precipitation } from './Precipitation'
import { SeaLevel } from './SeaLevel'
import { Star } from './Star'
import { Terrain } from './Terrain'

type GlobeSceneProps = {
  world: World
  showSpinAxis: boolean
  dayAngle: number
  evenLight: boolean
}

export function GlobeScene({
  world,
  showSpinAxis,
  dayAngle,
  evenLight,
}: GlobeSceneProps) {
  const starPos = useMemo(
    () => STAR_DIRECTION.clone().multiplyScalar(8),
    [],
  )
  const tiltRad = -(world.globe.axialTilt * Math.PI) / 180
  const dayRad = (dayAngle * Math.PI) / 180

  return (
    <>
      <hemisphereLight args={['#c5d8ff', '#1a1424', 0.45]} />
      <directionalLight position={starPos} intensity={1.35} color="#fff4e0" />
      <Star />
      <group rotation={[0, 0, tiltRad]} name="planet">
        <group rotation={[0, dayRad, 0]} name="daylight">
          <SeaLevel />
          <Ocean evenLight={evenLight} />
          <Terrain params={world.globe} evenLight={evenLight} />
          <Precipitation params={world.globe} evenLight={evenLight} />
          <Clouds seed={world.globe.seed} evenLight={evenLight} />
          <Atmosphere evenLight={evenLight} />
        </group>
        {showSpinAxis && <SpinAxis />}
      </group>
      {showSpinAxis && <OrbitAxis />}
    </>
  )
}
