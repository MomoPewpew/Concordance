import { useMemo } from 'react'
import type { GlobeParams } from '../data/types'
import { generateFlowStrokes } from '../worldgen/flow'

type FlowStrokesProps = {
  params: GlobeParams
}

export function FlowStrokes({ params }: FlowStrokesProps) {
  const { wind, currents } = useMemo(() => generateFlowStrokes(params), [params])

  return (
    <group name="flow">
      <lineSegments geometry={currents} raycast={() => {}}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.72}
          depthWrite={false}
        />
      </lineSegments>
      <lineSegments geometry={wind} raycast={() => {}}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  )
}
