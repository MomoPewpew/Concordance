import type { GlobeParams } from '../data/types'
import { BAKE_SIZE, bakeCubeMaps } from './bakeMaps'

type BakeRequest = {
  type: 'bake'
  params: GlobeParams
  size?: number
}

const ctx = globalThis as unknown as {
  postMessage: (message: unknown, transfer: Transferable[]) => void
  addEventListener: typeof addEventListener
}

ctx.addEventListener('message', (event: Event) => {
  const data = (event as MessageEvent<BakeRequest>).data
  if (data.type !== 'bake') return
  const size = data.size ?? BAKE_SIZE
  const baked = bakeCubeMaps(data.params, size)
  ctx.postMessage(
    { type: 'done', size, albedo: baked.albedo, normals: baked.normals },
    [...baked.albedo.map((face) => face.buffer), ...baked.normals.map((face) => face.buffer)],
  )
})
