import { useEffect, useRef, type RefObject } from 'react'
import type { Article, GlobeParams } from '../data/types'
import {
  latToY,
  lonToX,
  paintMinimap,
  pinColor,
  xyToLatLon,
} from '../worldgen/minimap'

type MinimapProps = {
  params: GlobeParams
  articles: Article[]
  selectedId: string | null
  viewRef: RefObject<{ lat: number; lon: number }>
  onLookAt: (lat: number, lon: number) => void
}

export function Minimap({
  params,
  articles,
  selectedId,
  viewRef,
  onLookAt,
}: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const image = paintMinimap(params)
    canvas.width = image.width
    canvas.height = image.height

    let frame = 0
    const draw = () => {
      ctx.putImageData(image, 0, 0)
      const w = image.width
      const h = image.height
      const view = viewRef.current
      if (!view) return
      const vx = lonToX(view.lon, w)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
      ctx.fillRect(vx - 10, 0, 20, h)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.beginPath()
      ctx.moveTo(vx + 0.5, 0)
      ctx.lineTo(vx + 0.5, h)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(vx, latToY(view.lat, h), 3.5, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
      for (const article of articles) {
        if (!article.pin) continue
        ctx.beginPath()
        ctx.arc(
          lonToX(article.pin.lon, w),
          latToY(article.pin.lat, h),
          article.id === selectedId ? 3.2 : 2.2,
          0,
          Math.PI * 2,
        )
        ctx.fillStyle = pinColor(article.feature, article.id === selectedId)
        ctx.fill()
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [params, articles, selectedId, viewRef])

  return (
    <div className="minimap">
      <canvas
        ref={canvasRef}
        className="minimap-canvas"
        onClick={(event) => {
          const canvas = canvasRef.current
          if (!canvas) return
          const rect = canvas.getBoundingClientRect()
          const x = ((event.clientX - rect.left) / rect.width) * canvas.width
          const y = ((event.clientY - rect.top) / rect.height) * canvas.height
          const { lat, lon } = xyToLatLon(x, y, canvas.width, canvas.height)
          onLookAt(lat, lon)
        }}
      />
    </div>
  )
}
