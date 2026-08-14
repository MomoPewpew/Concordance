import { DoubleSide } from 'three'

/** Invisible but raycastable unit sphere at sea level. */
export function PickSphere() {
  return (
    <mesh name="pick-sphere">
      <sphereGeometry args={[1, 48, 48]} />
      <meshBasicMaterial
        transparent
        opacity={0}
        depthWrite={false}
        depthTest={false}
        colorWrite={false}
        side={DoubleSide}
      />
    </mesh>
  )
}
