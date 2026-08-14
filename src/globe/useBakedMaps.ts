import { useEffect, useRef, useState } from 'react'
import {
  CubeTexture,
  DataTexture,
  LinearFilter,
  NoColorSpace,
  RGBAFormat,
  UnsignedByteType,
} from 'three'
import type { GlobeParams } from '../data/types'
import { BAKE_SIZE, bakeKey } from '../worldgen/bakeMaps'

function cubeFromFaces(size: number, faces: Uint8Array[]): CubeTexture {
  const images = faces.map((face) => {
    const data = new Uint8Array(face)
    const tex = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType)
    tex.colorSpace = NoColorSpace
    tex.needsUpdate = true
    return tex
  })
  const cube = new CubeTexture(images)
  cube.format = RGBAFormat
  cube.type = UnsignedByteType
  cube.colorSpace = NoColorSpace
  cube.minFilter = LinearFilter
  cube.magFilter = LinearFilter
  cube.generateMipmaps = false
  cube.flipY = false
  cube.needsUpdate = true
  return cube
}

function dummyCube(): CubeTexture {
  const faces = Array.from(
    { length: 6 },
    () => new Uint8Array([128, 128, 128, 255]),
  )
  return cubeFromFaces(1, faces)
}

let placeholder: CubeTexture | null = null

export function emptyCubeMap(): CubeTexture {
  placeholder ??= dummyCube()
  return placeholder
}

export function useBakedMaps(params: GlobeParams): CubeTexture | null {
  const [texture, setTexture] = useState<CubeTexture | null>(null)
  const key = bakeKey(params)
  const paramsRef = useRef(params)
  paramsRef.current = params

  useEffect(() => {
    const worker = new Worker(
      new URL('../worldgen/bakeWorker.ts', import.meta.url),
      { type: 'module' },
    )
    let cancelled = false
    setTexture(null)
    worker.onmessage = (
      event: MessageEvent<{ size: number; faces: Uint8Array[] }>,
    ) => {
      if (cancelled) return
      setTexture(cubeFromFaces(event.data.size, event.data.faces))
    }
    worker.postMessage({
      type: 'bake',
      params: paramsRef.current,
      size: BAKE_SIZE,
    })
    return () => {
      cancelled = true
      worker.terminate()
    }
  }, [key])

  useEffect(() => {
    return () => {
      texture?.dispose()
    }
  }, [texture])

  return texture
}
