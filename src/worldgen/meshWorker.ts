import type { GlobeParams } from '../data/types'
import { generateTile, type TileMeshData } from './generateTile'

export type TileRequest = {
  type: 'tile'
  requestId: number
  params: GlobeParams
  face: number
  ti: number
  tj: number
  res: number
}

export type TileResponse = {
  type: 'tile'
  requestId: number
  tile: TileMeshData
}

const ctx = globalThis as unknown as {
  postMessage: (message: unknown, transfer: Transferable[]) => void
  addEventListener: typeof addEventListener
}

function transferList(tile: TileMeshData): Transferable[] {
  const list: Transferable[] = [
    tile.positions.buffer,
    tile.elevation.buffer,
    tile.temperature.buffer,
    tile.aClimate.buffer,
    tile.aLake.buffer,
    tile.indices.buffer,
  ]
  if (tile.lakePositions) list.push(tile.lakePositions.buffer)
  if (tile.lakeIndices) list.push(tile.lakeIndices.buffer)
  return list
}

ctx.addEventListener('message', (event: Event) => {
  const data = (event as MessageEvent<TileRequest>).data
  if (data.type !== 'tile') return
  const tile = generateTile(data.params, data.face, data.ti, data.tj, data.res)
  const message: TileResponse = { type: 'tile', requestId: data.requestId, tile }
  ctx.postMessage(message, transferList(tile))
})
