import { latLonToDirection } from '../worldgen/probe'

type PinMarkerProps = {
  articleId: string
  lat: number
  lon: number
  selected: boolean
}

export function PinMarker({ articleId, lat, lon, selected }: PinMarkerProps) {
  const [x, y, z] = latLonToDirection(lat, lon)
  const r = 1.018

  return (
    <group position={[x * r, y * r, z * r]} name="pin">
      <mesh name="pin-head" userData={{ articleId }}>
        <sphereGeometry args={[selected ? 0.014 : 0.01, 12, 12]} />
        <meshBasicMaterial
          color={selected ? '#ffe08a' : '#7dd3fc'}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
