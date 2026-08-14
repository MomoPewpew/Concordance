import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import type { OverlayMode } from '../data/overlay'
import type { Article, LookTarget, World } from '../data/types'
import { GlobeControls } from './GlobeControls'
import { GlobeScene } from './GlobeScene'
import { Starfield } from './Starfield'

type GlobeProps = {
  world: World
  articles: Article[]
  selectedArticleId: string | null
  overlay: OverlayMode
  showSpinAxis: boolean
  showFlow: boolean
  dayAngle: number
  evenLight: boolean
  lite?: boolean
  interactive?: boolean
  label?: string
  lookTarget?: LookTarget | null
  onViewChange?: (lat: number, lon: number) => void
  onPickSurface?: (x: number, y: number, z: number) => void
  onSelectPin?: (articleId: string) => void
}

export function Globe({
  world,
  articles,
  selectedArticleId,
  overlay,
  showSpinAxis,
  showFlow,
  dayAngle,
  evenLight,
  lite = false,
  interactive = true,
  label,
  lookTarget,
  onViewChange,
  onPickSurface,
  onSelectPin,
}: GlobeProps) {
  return (
    <div className="globe-pane">
      {label && <div className="globe-pane-label">{label}</div>}
      <Canvas
        camera={{ position: [0, 0.32, 2.35], fov: 42, near: 0.01, far: 500 }}
        dpr={[1, lite ? 1.25 : 2]}
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
          showFlow={showFlow}
          dayAngle={dayAngle}
          evenLight={evenLight}
          lite={lite}
        />
        <GlobeControls
          interactive={interactive}
          axialTilt={world.globe.axialTilt}
          dayAngle={dayAngle}
          lookTarget={lookTarget}
          onViewChange={onViewChange}
          onPickSurface={onPickSurface}
          onSelectPin={onSelectPin}
        />
      </Canvas>
    </div>
  )
}
