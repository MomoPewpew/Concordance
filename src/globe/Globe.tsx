import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import type { OverlayMode } from '../data/overlay'
import type { Article, World } from '../data/types'
import { GlobeControls } from './GlobeControls'
import { GlobeScene } from './GlobeScene'
import { Starfield } from './Starfield'

type GlobeProps = {
  world: World
  articles: Article[]
  selectedArticleId: string | null
  overlay: OverlayMode
  showSpinAxis: boolean
  dayAngle: number
  evenLight: boolean
  onPickSurface: (x: number, y: number, z: number) => void
  onSelectPin: (articleId: string) => void
}

export function Globe({
  world,
  articles,
  selectedArticleId,
  overlay,
  showSpinAxis,
  dayAngle,
  evenLight,
  onPickSurface,
  onSelectPin,
}: GlobeProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.32, 2.35], fov: 42, near: 0.01, far: 500 }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.08,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#02010a']} />
      <Starfield />
      <GlobeScene
        world={world}
        articles={articles}
        selectedArticleId={selectedArticleId}
        overlay={overlay}
        showSpinAxis={showSpinAxis}
        dayAngle={dayAngle}
        evenLight={evenLight}
      />
      <GlobeControls
        onPickSurface={onPickSurface}
        onSelectPin={onSelectPin}
      />
    </Canvas>
  )
}
