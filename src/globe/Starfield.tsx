import { useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'

export function Starfield() {
  const geometry = useMemo(() => {
    const count = 5000
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = 2 * Math.PI * Math.random()
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 60 + Math.random() * 40
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi)
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    return geo
  }, [])

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color="#d6e0ff"
        size={0.42}
        sizeAttenuation
        transparent
        opacity={0.92}
        depthWrite={false}
      />
    </points>
  )
}
