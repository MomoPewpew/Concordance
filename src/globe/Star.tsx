import { Billboard } from '@react-three/drei'
import { useMemo } from 'react'
import { AdditiveBlending } from 'three'
import { STAR_DIRECTION } from './lighting'

export const STAR_DISTANCE = 14

export function Star() {
  const position = useMemo(
    () => STAR_DIRECTION.clone().multiplyScalar(STAR_DISTANCE),
    [],
  )

  return (
    <group position={position} name="star">
      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color="#fff4c8" toneMapped={false} />
      </mesh>
      <Billboard>
        <mesh renderOrder={-1}>
          <circleGeometry args={[0.55, 32]} />
          <meshBasicMaterial
            color="#ffc978"
            transparent
            opacity={0.45}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh renderOrder={-1}>
          <circleGeometry args={[1.4, 32]} />
          <meshBasicMaterial
            color="#ff8a3a"
            transparent
            opacity={0.16}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </Billboard>
    </group>
  )
}
