import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import type { World } from '../data/types'
import { GlobeScene } from './GlobeScene'
import { Starfield } from './Starfield'

type GlobeProps = {
  world: World
  showSpinAxis: boolean
}

export function Globe({ world, showSpinAxis }: GlobeProps) {
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
      <GlobeScene world={world} showSpinAxis={showSpinAxis} />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={1.12}
        maxDistance={5}
        rotateSpeed={0.45}
        zoomSpeed={0.7}
      />
    </Canvas>
  )
}
