import { useMemo } from 'react'
import type { GlobeParams } from '../data/types'
import { generateDrainages } from '../worldgen/rivers'

type DrainagesProps = {
  params: GlobeParams
}

export function Drainages({ params }: DrainagesProps) {
  const geometry = useMemo(() => generateDrainages(params), [params])

  return (
    <lineSegments geometry={geometry} raycast={() => {}} name="drainages">
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.78}
        depthWrite={false}
      />
    </lineSegments>
  )
}
