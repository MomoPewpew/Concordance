import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Spherical, Vector3 } from 'three'
import { clamp, smoothstep } from '../worldgen/noise'

const SURFACE_RADIUS = 1
const MIN_ALTITUDE = 0.17
const MAX_ALTITUDE = 4
const MAX_PITCH = (62 * Math.PI) / 180
const PITCH_NEAR = 0.22
const PITCH_FAR = 1.85
const POLE_EPS = 0.04
const ROTATE_SPEED = 0.45
const ZOOM_SPEED = 0.7
const DAMPING = 0.08

function pitchFromAltitude(altitude: number): number {
  const t = 1 - smoothstep(PITCH_NEAR, PITCH_FAR, altitude)
  return t * t * MAX_PITCH
}

export function GlobeControls() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)

  const theta = useRef(0)
  const phi = useRef(Math.PI / 2)
  const altitude = useRef(1.35)
  const goalTheta = useRef(0)
  const goalPhi = useRef(Math.PI / 2)
  const goalAltitude = useRef(1.35)
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const primed = useRef(false)

  const P = useRef(new Vector3())
  const zenith = useRef(new Vector3())
  const right = useRef(new Vector3())
  const tangentUp = useRef(new Vector3())
  const worldUp = useRef(new Vector3(0, 1, 0))
  const spherical = useRef(new Spherical())

  useEffect(() => {
    spherical.current.setFromVector3(camera.position)
    theta.current = spherical.current.theta
    phi.current = spherical.current.phi
    altitude.current = Math.max(
      spherical.current.radius - SURFACE_RADIUS,
      MIN_ALTITUDE,
    )
    goalTheta.current = theta.current
    goalPhi.current = phi.current
    goalAltitude.current = altitude.current
    primed.current = true
  }, [camera])

  useEffect(() => {
    const el = gl.domElement

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      dragging.current = true
      last.current.x = event.clientX
      last.current.y = event.clientY
      el.setPointerCapture(event.pointerId)
      el.style.cursor = 'grabbing'
    }

    const onPointerUp = (event: PointerEvent) => {
      dragging.current = false
      if (el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId)
      }
      el.style.cursor = 'grab'
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging.current) return
      const dx = event.clientX - last.current.x
      const dy = event.clientY - last.current.y
      last.current.x = event.clientX
      last.current.y = event.clientY
      const scale = (2 * Math.PI * ROTATE_SPEED) / el.clientHeight
      goalTheta.current -= dx * scale
      goalPhi.current = clamp(
        goalPhi.current - dy * scale,
        POLE_EPS,
        Math.PI - POLE_EPS,
      )
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const factor = Math.exp(event.deltaY * 0.001 * ZOOM_SPEED)
      goalAltitude.current = clamp(
        goalAltitude.current * factor,
        MIN_ALTITUDE,
        MAX_ALTITUDE,
      )
    }

    el.style.cursor = 'grab'
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.style.cursor = ''
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('wheel', onWheel)
    }
  }, [gl])

  useFrame((_, delta) => {
    if (!primed.current) return
    const k = 1 - (1 - DAMPING) ** (delta * 60)

    theta.current += (goalTheta.current - theta.current) * k
    phi.current += (goalPhi.current - phi.current) * k
    altitude.current += (goalAltitude.current - altitude.current) * k

    zenith.current.setFromSphericalCoords(1, phi.current, theta.current)
    P.current.copy(zenith.current).multiplyScalar(SURFACE_RADIUS)

    right.current.crossVectors(worldUp.current, zenith.current)
    if (right.current.lengthSq() < 1e-10) {
      right.current.set(1, 0, 0)
    } else {
      right.current.normalize()
    }
    tangentUp.current.crossVectors(zenith.current, right.current).normalize()

    const alt = altitude.current
    const pitch = pitchFromAltitude(alt)
    const cosP = Math.cos(pitch)
    const sinP = Math.sin(pitch)

    camera.position
      .copy(P.current)
      .addScaledVector(zenith.current, alt * cosP)
      .addScaledVector(tangentUp.current, -alt * sinP)

    camera.up.copy(tangentUp.current)
    camera.lookAt(P.current)
  })

  return null
}
