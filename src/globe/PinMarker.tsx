import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { Group, Vector3 } from 'three'
import type { FeatureKind } from '../data/types'
import { pinColor } from '../worldgen/minimap'
import { latLonToDirection } from '../worldgen/probe'

type PinMarkerProps = {
  articleId: string
  lat: number
  lon: number
  selected: boolean
  title?: string
  feature?: FeatureKind
}

export function PinMarker({
  articleId,
  lat,
  lon,
  selected,
  title,
  feature,
}: PinMarkerProps) {
  const [x, y, z] = latLonToDirection(lat, lon)
  const r = 1.018
  const groupRef = useRef<Group>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const worldPos = useRef(new Vector3())
  const camera = useThree((s) => s.camera)

  useFrame(() => {
    const el = labelRef.current
    const group = groupRef.current
    if (!el || !group) return
    const dist = camera.position.length()
    const far = dist > 2.42 ? 0 : dist > 2.08 ? (2.42 - dist) / 0.34 : 1
    const near = dist < 1.22 ? 0 : dist < 1.48 ? (dist - 1.22) / 0.26 : 1
    group.getWorldPosition(worldPos.current)
    const facing =
      worldPos.current.dot(camera.position) /
      (worldPos.current.length() * dist + 1e-6)
    const front = facing < 0.08 ? 0 : facing < 0.22 ? (facing - 0.08) / 0.14 : 1
    el.style.opacity = String(far * near * front * (selected ? 1 : 0.86))
  })

  return (
    <group ref={groupRef} position={[x * r, y * r, z * r]} name="pin">
      <mesh name="pin-head" userData={{ articleId }}>
        <sphereGeometry args={[selected ? 0.014 : 0.01, 12, 12]} />
        <meshBasicMaterial
          color={pinColor(feature, selected)}
          toneMapped={false}
        />
      </mesh>
      {title ? (
        <Html
          center
          sprite
          pointerEvents="none"
          zIndexRange={[2, 0]}
        >
          <div
            ref={labelRef}
            className={
              selected ? 'globe-label globe-label-selected' : 'globe-label'
            }
          >
            {title}
          </div>
        </Html>
      ) : null}
    </group>
  )
}

