import { latLonToDirection } from '../worldgen/probe'
import { pinColor } from '../worldgen/minimap'
import type { FeatureKind } from '../data/types'

type PinMarkerProps = {
  articleId: string
  lat: number
  lon: number
  selected: boolean
  feature?: FeatureKind
}

export function PinMarker({
  articleId,
  lat,
  lon,
  selected,
  feature,
}: PinMarkerProps) {
  const [x, y, z] = latLonToDirection(lat, lon)
  const r = 1.018

  return (
    <group position={[x * r, y * r, z * r]} name="pin">
      <mesh name="pin-head" userData={{ articleId }}>
        <sphereGeometry args={[selected ? 0.014 : 0.01, 12, 12]} />
        <meshBasicMaterial
          color={pinColor(feature, selected)}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
