import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { BufferAttribute, BufferGeometry, Vector3, type Group } from 'three'
import type { GlobeParams } from '../data/types'
import {
  LOD0_RES,
  lodResolutions,
  maxTileRes,
} from '../worldgen/cubeSphere'
import { generateLod0Tiles, type TileMeshData } from '../worldgen/generateTile'
import type { TileRequest, TileResponse } from '../worldgen/meshWorker'

export type TileView = {
  id: number
  terrain: BufferGeometry
  lakes: BufferGeometry | null
}

type GpuMesh = {
  terrain: BufferGeometry
  lakes: BufferGeometry | null
}

type Slot = {
  id: number
  face: number
  ti: number
  tj: number
  center: [number, number, number]
  desiredLod: number
  shownRes: number
  byRes: Map<number, GpuMesh>
  lod0Since: number
}

type Job = {
  requestId: number
  tileId: number
  face: number
  ti: number
  tj: number
  res: number
}

const PICK_MS = 200
const EVICT_MS = 5000
const HYSTERESIS = 0.25

function meshKey(params: GlobeParams): string {
  return JSON.stringify(params, (key, value) =>
    key === 'axialTilt' || key === 'flattening' ? undefined : value,
  )
}

function toGpu(data: TileMeshData): GpuMesh {
  const terrain = new BufferGeometry()
  terrain.setAttribute('position', new BufferAttribute(data.positions, 3))
  terrain.setAttribute('elevation', new BufferAttribute(data.elevation, 1))
  terrain.setAttribute(
    'temperature',
    new BufferAttribute(data.temperature, 1),
  )
  terrain.setAttribute('aClimate', new BufferAttribute(data.aClimate, 3))
  terrain.setAttribute('aLake', new BufferAttribute(data.aLake, 1))
  terrain.setAttribute('aSkirt', new BufferAttribute(data.aSkirt, 1))
  terrain.setIndex(
    new BufferAttribute(data.indices.subarray(0, data.surfaceIndexCount), 1),
  )
  terrain.computeVertexNormals()
  const normals = terrain.getAttribute('normal')
  for (let i = 0; i < normals.count; i++) {
    const x = data.positions[i * 3]
    const y = data.positions[i * 3 + 1]
    const z = data.positions[i * 3 + 2]
    const len = Math.hypot(x, y, z) || 1
    const rx = x / len
    const ry = y / len
    const rz = z / len
    if (i >= data.surfaceCount) {
      normals.setXYZ(i, rx, ry, rz)
    } else {
      const nx = normals.getX(i) * 0.35 + rx * 0.65
      const ny = normals.getY(i) * 0.35 + ry * 0.65
      const nz = normals.getZ(i) * 0.35 + rz * 0.65
      const nlen = Math.hypot(nx, ny, nz) || 1
      normals.setXYZ(i, nx / nlen, ny / nlen, nz / nlen)
    }
  }
  normals.needsUpdate = true
  terrain.setIndex(new BufferAttribute(data.indices, 1))
  terrain.computeBoundingSphere()

  let lakes: BufferGeometry | null = null
  if (data.lakePositions && data.lakeIndices && data.lakeIndices.length > 0) {
    lakes = new BufferGeometry()
    lakes.setAttribute(
      'position',
      new BufferAttribute(data.lakePositions, 3),
    )
    lakes.setIndex(new BufferAttribute(data.lakeIndices, 1))
    lakes.computeVertexNormals()
    lakes.computeBoundingSphere()
  }
  return { terrain, lakes }
}

function disposeGpu(gpu: GpuMesh): void {
  gpu.terrain.dispose()
  gpu.lakes?.dispose()
}

function pickLod(
  dist: number,
  facing: number,
  current: number,
  maxLod: number,
): number {
  let lod = 0
  if (facing < -0.15 && dist > 1.2) lod = 0
  else if (dist < 0.55) lod = 2
  else if (dist < 1.8) lod = 1
  lod = Math.min(lod, maxLod)
  if (lod < current) {
    if (current >= 2 && dist < 0.55 + HYSTERESIS) return current
    if (current >= 1 && dist < 1.8 + HYSTERESIS) return current
  }
  return lod
}

function shownResFor(slot: Slot, desiredRes: number): number {
  let best = LOD0_RES
  for (const res of slot.byRes.keys()) {
    if (res <= desiredRes && res > best) best = res
  }
  return best
}

export function useTerrainTiles(
  params: GlobeParams,
  lite = false,
): { tiles: TileView[]; groupRef: RefObject<Group | null> } {
  const groupRef = useRef<Group>(null)
  const camera = useThree((s) => s.camera)
  const [tiles, setTiles] = useState<TileView[]>([])
  const key = meshKey(params)
  const slotsRef = useRef<Slot[]>([])
  const queueRef = useRef<Job[]>([])
  const inflightRef = useRef<Job | null>(null)
  const pendingRef = useRef(new Set<string>())
  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(1)
  const lastPickRef = useRef(0)
  const worldCam = useRef(new Vector3())
  const localCam = useRef(new Vector3())
  const paramsRef = useRef(params)
  const kickRef = useRef<(worker: Worker, levels: number[]) => void>(
    () => undefined,
  )
  paramsRef.current = params

  const publish = (slots: Slot[]) => {
    setTiles(
      slots.map((slot) => {
        const gpu = slot.byRes.get(slot.shownRes) ?? slot.byRes.get(LOD0_RES)
        return {
          id: slot.id,
          terrain: gpu!.terrain,
          lakes: gpu!.lakes,
        }
      }),
    )
  }

  const kick = (worker: Worker, levels: number[]) => {
    if (inflightRef.current || queueRef.current.length === 0) return
    const cam = localCam.current
    queueRef.current.sort((a, b) => {
      const sa = slotsRef.current[a.tileId]
      const sb = slotsRef.current[b.tileId]
      if (!sa || !sb) return 0
      const da = Math.hypot(
        cam.x - sa.center[0],
        cam.y - sa.center[1],
        cam.z - sa.center[2],
      )
      const db = Math.hypot(
        cam.x - sb.center[0],
        cam.y - sb.center[1],
        cam.z - sb.center[2],
      )
      return da - db || b.res - a.res
    })
    const job = queueRef.current.shift()
    if (!job) return
    const slot = slotsRef.current[job.tileId]
    if (!slot) {
      pendingRef.current.delete(`${job.tileId}:${job.res}`)
      kick(worker, levels)
      return
    }
    const desired = levels[Math.min(slot.desiredLod, levels.length - 1)]
    if (job.res !== desired || slot.byRes.has(job.res)) {
      pendingRef.current.delete(`${job.tileId}:${job.res}`)
      kick(worker, levels)
      return
    }
    inflightRef.current = job
    const message: TileRequest = {
      type: 'tile',
      requestId: job.requestId,
      params: paramsRef.current,
      face: job.face,
      ti: job.ti,
      tj: job.tj,
      res: job.res,
    }
    worker.postMessage(message)
  }
  kickRef.current = kick

  useLayoutEffect(() => {
    const globe = paramsRef.current
    const levels = lodResolutions(maxTileRes(globe.resolution))
    const lod0 = generateLod0Tiles(globe)
    const slots: Slot[] = lod0.map((data) => {
      const gpu = toGpu(data)
      const byRes = new Map<number, GpuMesh>()
      byRes.set(LOD0_RES, gpu)
      return {
        id: data.id,
        face: data.face,
        ti: data.ti,
        tj: data.tj,
        center: data.center,
        desiredLod: 0,
        shownRes: LOD0_RES,
        byRes,
        lod0Since: 0,
      }
    })
    slotsRef.current = slots
    queueRef.current = []
    inflightRef.current = null
    pendingRef.current.clear()
    publish(slots)

    const worker = new Worker(new URL('../worldgen/meshWorker.ts', import.meta.url), {
      type: 'module',
    })
    workerRef.current = worker
    worker.onmessage = (event: MessageEvent<TileResponse>) => {
      const job = inflightRef.current
      inflightRef.current = null
      if (!job || event.data.requestId !== job.requestId) {
        kickRef.current(worker, levels)
        return
      }
      pendingRef.current.delete(`${job.tileId}:${job.res}`)
      const slot = slotsRef.current[job.tileId]
      if (!slot || slot.byRes.has(job.res)) {
        kickRef.current(worker, levels)
        return
      }
      slot.byRes.set(job.res, toGpu(event.data.tile))
      const desiredRes = levels[Math.min(slot.desiredLod, levels.length - 1)]
      const next = shownResFor(slot, desiredRes)
      if (next !== slot.shownRes) {
        slot.shownRes = next
        publish(slotsRef.current)
      }
      kickRef.current(worker, levels)
    }

    return () => {
      worker.terminate()
      workerRef.current = null
      for (const slot of slotsRef.current) {
        for (const gpu of slot.byRes.values()) disposeGpu(gpu)
        slot.byRes.clear()
      }
      slotsRef.current = []
      queueRef.current = []
      inflightRef.current = null
    }
  }, [key])

  useFrame(() => {
    const group = groupRef.current
    const worker = workerRef.current
    const slots = slotsRef.current
    if (!group || !worker || slots.length === 0) return
    const now = performance.now()
    if (now - lastPickRef.current < PICK_MS) return
    lastPickRef.current = now

    const levels = lodResolutions(maxTileRes(paramsRef.current.resolution))
    const maxLod = lite ? Math.min(1, levels.length - 1) : levels.length - 1
    camera.getWorldPosition(worldCam.current)
    localCam.current.copy(worldCam.current)
    group.worldToLocal(localCam.current)
    const cam = localCam.current
    const camLen = Math.hypot(cam.x, cam.y, cam.z) || 1
    const nx = cam.x / camLen
    const ny = cam.y / camLen
    const nz = cam.z / camLen

    let changed = false
    for (const slot of slots) {
      const dist = Math.hypot(
        cam.x - slot.center[0],
        cam.y - slot.center[1],
        cam.z - slot.center[2],
      )
      const facing =
        slot.center[0] * nx + slot.center[1] * ny + slot.center[2] * nz
      const lod = pickLod(dist, facing, slot.desiredLod, maxLod)
      slot.desiredLod = lod
      const desiredRes = levels[lod]
      const nextShown = shownResFor(slot, desiredRes)
      if (nextShown !== slot.shownRes) {
        slot.shownRes = nextShown
        changed = true
      }

      if (lod === 0) {
        if (slot.lod0Since === 0) slot.lod0Since = now
        else if (now - slot.lod0Since > EVICT_MS) {
          for (const [res, gpu] of slot.byRes) {
            if (res === LOD0_RES) continue
            disposeGpu(gpu)
            slot.byRes.delete(res)
          }
        }
      } else {
        slot.lod0Since = 0
        if (!slot.byRes.has(desiredRes)) {
          const pendKey = `${slot.id}:${desiredRes}`
          if (!pendingRef.current.has(pendKey)) {
            pendingRef.current.add(pendKey)
            queueRef.current.push({
              requestId: requestIdRef.current++,
              tileId: slot.id,
              face: slot.face,
              ti: slot.ti,
              tj: slot.tj,
              res: desiredRes,
            })
          }
        }
      }
    }

    if (changed) publish(slots)
    kick(worker, levels)
  })

  return { tiles, groupRef }
}
