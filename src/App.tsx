import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createWorld,
  defaultRandomiserSettings,
  randomSeed,
  type RandomiserSettings,
} from './data/randomiser'
import type { OverlayMode } from './data/overlay'
import { sampleWorld } from './data/sampleWorld'
import type { Article } from './data/types'
import { Globe } from './globe/Globe'
import { ArticleDock } from './ui/ArticleDock'
import { RandomiserMenu } from './ui/RandomiserMenu'
import { ViewMenu } from './ui/ViewMenu'
import { biomeLabel } from './worldgen/biomes'
import { latLonToDirection, probeSurface } from './worldgen/probe'

function parseSeed(raw: string, fallback: number): number {
  const trimmed = raw.trim()
  if (!trimmed) return fallback
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return fallback
  return n >>> 0
}

function nearExistingPin(
  articles: Article[],
  lat: number,
  lon: number,
): Article | undefined {
  const [x, y, z] = latLonToDirection(lat, lon)
  return articles.find((article) => {
    if (!article.pin) return false
    const [px, py, pz] = latLonToDirection(article.pin.lat, article.pin.lon)
    return x * px + y * py + z * pz > 0.9994
  })
}

export default function App() {
  const menusRef = useRef<HTMLDivElement>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [randomiserOpen, setRandomiserOpen] = useState(false)
  const [showSpinAxis, setShowSpinAxis] = useState(false)
  const [evenLight, setEvenLight] = useState(false)
  const [overlay, setOverlay] = useState<OverlayMode>('none')
  const [dayAngle, setDayAngle] = useState(0)
  const [daylightPlaying, setDaylightPlaying] = useState(false)
  const [settings, setSettings] = useState<RandomiserSettings>(
    defaultRandomiserSettings,
  )
  const [world, setWorld] = useState(sampleWorld)
  const [seedDraft, setSeedDraft] = useState(String(sampleWorld.globe.seed))
  const [generating, setGenerating] = useState(false)
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const articlesRef = useRef(articles)
  articlesRef.current = articles

  useEffect(() => {
    if (!viewOpen && !randomiserOpen) return

    const onPointerDown = (event: PointerEvent) => {
      if (!menusRef.current?.contains(event.target as Node)) {
        setViewOpen(false)
        setRandomiserOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setViewOpen(false)
        setRandomiserOpen(false)
        setSelectedId(null)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [viewOpen, randomiserOpen])

  useEffect(() => {
    setGenerating(false)
    setSeedDraft(String(world.globe.seed))
  }, [world])

  useEffect(() => {
    if (!daylightPlaying) return
    let frame = 0
    const tick = () => {
      setDayAngle((angle) => (angle + 0.12) % 360)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [daylightPlaying])

  const applyWorld = (next: typeof world) => {
    setWorld(next)
    setArticles([])
    setSelectedId(null)
  }

  const generate = () => {
    setGenerating(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        applyWorld(createWorld(settings, randomSeed()))
      })
    })
  }

  const rebuild = () => {
    setGenerating(true)
    const seed = parseSeed(seedDraft, world.globe.seed)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        applyWorld(createWorld(settings, seed))
      })
    })
  }

  const copySeed = () => {
    const text = seedDraft.trim() || String(world.globe.seed)
    void navigator.clipboard.writeText(text).catch(() => {})
  }

  const onPickSurface = useCallback(
    (x: number, y: number, z: number) => {
      const probe = probeSurface(world.globe, x, y, z)
      const existing = nearExistingPin(articlesRef.current, probe.lat, probe.lon)
      if (existing) {
        setSelectedId(existing.id)
        return
      }
      const article: Article = {
        id: `art-${Date.now().toString(36)}`,
        universeId: world.universeId,
        worldId: world.id,
        title: biomeLabel(probe.biome),
        body: '',
        pin: { worldId: world.id, lat: probe.lat, lon: probe.lon },
      }
      setArticles((list) => [...list, article])
      setSelectedId(article.id)
    },
    [world],
  )

  const selectedProbe = useMemo(() => {
    const selected = articles.find((article) => article.id === selectedId)
    if (!selected?.pin) return null
    const [x, y, z] = latLonToDirection(selected.pin.lat, selected.pin.lon)
    return probeSurface(world.globe, x, y, z)
  }, [articles, selectedId, world])

  const onPreset = (preset: 'atlas' | 'space' | 'climate') => {
    if (preset === 'atlas') {
      setEvenLight(true)
      setOverlay('none')
      return
    }
    if (preset === 'space') {
      setEvenLight(false)
      setOverlay('none')
      return
    }
    setEvenLight(true)
    setOverlay('temperature')
  }

  return (
    <div className="app">
      <div className="app-menus" ref={menusRef}>
        <ViewMenu
          open={viewOpen}
          onOpenChange={setViewOpen}
          showSpinAxis={showSpinAxis}
          onShowSpinAxisChange={setShowSpinAxis}
          evenLight={evenLight}
          onEvenLightChange={setEvenLight}
          overlay={overlay}
          onOverlayChange={setOverlay}
          dayAngle={dayAngle}
          onDayAngleChange={(angle) => {
            setDaylightPlaying(false)
            setDayAngle(angle)
          }}
          daylightPlaying={daylightPlaying}
          onDaylightPlayingChange={setDaylightPlaying}
          onPreset={onPreset}
        />
        <RandomiserMenu
          open={randomiserOpen}
          onOpenChange={setRandomiserOpen}
          settings={settings}
          onSettingsChange={setSettings}
          seedDraft={seedDraft}
          onSeedDraftChange={setSeedDraft}
          generating={generating}
          onGenerate={generate}
          onRebuild={rebuild}
          onCopySeed={copySeed}
        />
      </div>
      <Globe
        world={world}
        articles={articles}
        selectedArticleId={selectedId}
        overlay={overlay}
        showSpinAxis={showSpinAxis}
        dayAngle={dayAngle}
        evenLight={evenLight}
        onPickSurface={onPickSurface}
        onSelectPin={setSelectedId}
      />
      <ArticleDock
        articles={articles}
        selectedId={selectedId}
        probe={selectedProbe}
        onSelect={setSelectedId}
        onTitleChange={(id, title) =>
          setArticles((list) =>
            list.map((article) =>
              article.id === id ? { ...article, title } : article,
            ),
          )
        }
        onBodyChange={(id, body) =>
          setArticles((list) =>
            list.map((article) =>
              article.id === id ? { ...article, body } : article,
            ),
          )
        }
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}
