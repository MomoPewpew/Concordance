import { useMemo } from 'react'
import type { OverlayMode } from '../data/overlay'
import type { Article, World } from '../data/types'
import { Atmosphere } from './Atmosphere'
import { Clouds } from './Clouds'
import { Drainages } from './Drainages'
import { FlowStrokes } from './FlowStrokes'
import { STAR_DIRECTION } from './lighting'
import { Ocean } from './Ocean'
import { OrbitAxis, SpinAxis } from './PlanetAxes'
import { PickSphere } from './PickSphere'
import { PinMarker } from './PinMarker'
import { Precipitation } from './Precipitation'
import { Star } from './Star'
import { TerrainTiles } from './Terrain'
import { useBakedMaps } from './useBakedMaps'

type GlobeSceneProps = {
  world: World
  articles: Article[]
  selectedArticleId: string | null
  overlay: OverlayMode
  showSpinAxis: boolean
  showFlow: boolean
  dayAngle: number
  evenLight: boolean
  lite?: boolean
}

export function GlobeScene({
  world,
  articles,
  selectedArticleId,
  overlay,
  showSpinAxis,
  showFlow,
  dayAngle,
  evenLight,
  lite = false,
}: GlobeSceneProps) {
  const baked = useBakedMaps(world.globe)
  const starPos = useMemo(
    () => STAR_DIRECTION.clone().multiplyScalar(8),
    [],
  )
  const tiltRad = -(world.globe.axialTilt * Math.PI) / 180
  const dayRad = (dayAngle * Math.PI) / 180
  const climateMap = overlay !== 'none'
  const fill = evenLight || climateMap
  const flatten = 1 - (world.globe.flattening ?? 0)

  return (
    <>
      <hemisphereLight args={['#c5d8ff', '#1a1424', 0.45]} />
      <directionalLight position={starPos} intensity={1.35} color="#fff4e0" />
      <Star />
      <group rotation={[0, 0, tiltRad]} scale={[1, flatten, 1]} name="planet">
        <group rotation={[0, dayRad, 0]} name="daylight">
          <PickSphere />
          {!climateMap && <Ocean evenLight={fill} />}
          <TerrainTiles
            params={world.globe}
            evenLight={fill}
            overlay={overlay}
            baked={baked}
            lite={lite}
            showLakes={!climateMap}
          />
          {!climateMap && !lite && (
            <Precipitation params={world.globe} evenLight={fill} />
          )}
          {!climateMap && !lite && <Drainages params={world.globe} />}
          {!climateMap && (
            <Clouds
              seed={world.globe.seed}
              evenLight={fill}
              baked={baked}
            />
          )}
          {!climateMap && showFlow && <FlowStrokes params={world.globe} />}
          <Atmosphere evenLight={fill} />
          {articles.map((article) =>
            article.pin ? (
              <PinMarker
                key={article.id}
                articleId={article.id}
                lat={article.pin.lat}
                lon={article.pin.lon}
                selected={article.id === selectedArticleId}
                title={article.feature ? article.title : undefined}
                feature={article.feature}
              />
            ) : null,
          )}
        </group>
        {showSpinAxis && <SpinAxis />}
      </group>
      {showSpinAxis && <OrbitAxis />}
    </>
  )
}
