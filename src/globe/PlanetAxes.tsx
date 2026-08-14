import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import { Quaternion, Vector3 } from 'three'
import {
  ORBIT_AXIS,
  ORBIT_AXIS_COLOR,
  PLANET_SPIN_AXIS,
  SPIN_AXIS_COLOR,
} from './axes'

const UP = new Vector3(0, 1, 0)

type AxisArrowProps = {
  direction: Vector3
  length: number
  color: string
  dashed?: boolean
  lineWidth: number
}

function AxisArrow({
  direction,
  length,
  color,
  dashed = false,
  lineWidth,
}: AxisArrowProps) {
  const quaternion = useMemo(
    () => new Quaternion().setFromUnitVectors(UP, direction.clone().normalize()),
    [direction],
  )

  const points = useMemo(
    () =>
      [
        [0, -length, 0],
        [0, length, 0],
      ] as [number, number, number][],
    [length],
  )

  const coneArgs: [number, number, number] = [0.03, 0.1, 16]

  return (
    <group quaternion={quaternion}>
      <Line
        points={points}
        color={color}
        lineWidth={lineWidth}
        dashed={dashed}
        dashSize={0.055}
        gapSize={0.04}
        depthTest={false}
        renderOrder={10}
      />
      <mesh position={[0, length, 0]} renderOrder={11}>
        <coneGeometry args={coneArgs} />
        <meshBasicMaterial color={color} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh
        position={[0, -length, 0]}
        rotation={[Math.PI, 0, 0]}
        renderOrder={11}
      >
        <coneGeometry args={coneArgs} />
        <meshBasicMaterial color={color} depthTest={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Local +Y through the poles. Parent the planet group so tilt carries it. */
export function SpinAxis() {
  return (
    <AxisArrow
      direction={PLANET_SPIN_AXIS}
      length={1.48}
      color={SPIN_AXIS_COLOR}
      lineWidth={2.5}
    />
  )
}

/** World +Y, normal to the orbital plane. Stays fixed when the planet tilts. */
export function OrbitAxis() {
  return (
    <AxisArrow
      direction={ORBIT_AXIS}
      length={1.72}
      color={ORBIT_AXIS_COLOR}
      dashed
      lineWidth={1.75}
    />
  )
}
