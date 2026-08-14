import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createWorld,
  defaultRandomiserSettings,
  randomSeed,
  type RandomiserSettings,
} from './data/randomiser'
import type { OverlayMode } from './data/overlay'
import {
  loadPersisted,
  mergeArticles,
  savePersisted,
} from './data/persist'
import { sampleWorld } from './data/sampleWorld'
import type { Article, LookTarget, World } from './data/types'
import { titlesMatch } from './data/wiki'
import { Globe } from './globe/Globe'
import { ArticleDock } from './ui/ArticleDock'
import { Minimap } from './ui/Minimap'
import { RandomiserMenu } from './ui/RandomiserMenu'
import { ViewMenu } from './ui/ViewMenu'
import { biomeLabel } from './worldgen/biomes'
import { articlesFromFeatures } from './worldgen/features'
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
  const saved = useRef(loadPersisted()).current
  const [viewOpen, setViewOpen] = useState(false)
  const [randomiserOpen, setRandomiserOpen] = useState(false)
  const [showSpinAxis, setShowSpinAxis] = useState(
    saved?.view.showSpinAxis ?? false,
  )
  const [showFlow, setShowFlow] = useState(saved?.view.showFlow ?? true)
  const [evenLight, setEvenLight] = useState(saved?.view.evenLight ?? false)
  const [overlay, setOverlay] = useState<OverlayMode>(
    saved?.view.overlay ?? 'none',
  )
  const [dayAngle, setDayAngle] = useState(saved?.view.dayAngle ?? 0)
  const [daylightPlaying, setDaylightPlaying] = useState(false)
  const [settings, setSettings] = useState<RandomiserSettings>(
    saved?.settings ?? defaultRandomiserSettings,
  )
  const [world, setWorld] = useState(saved?.world ?? sampleWorld)
  const [compareWorld, setCompareWorld] = useState<World | null>(null)
  const [seedDraft, setSeedDraft] = useState(
    String((saved?.world ?? sampleWorld).globe.seed),
  )
  const [generating, setGenerating] = useState(false)
  const [articles, setArticles] = useState<Article[]>(
    () => saved?.articles ?? articlesFromFeatures(saved?.world ?? sampleWorld),
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lookTarget, setLookTarget] = useState<LookTarget | null>(null)
  const articlesRef = useRef(articles)
  articlesRef.current = articles
  const viewRef = useRef({ lat: 0, lon: 0 })

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
  }, [world, compareWorld])

  useEffect(() => {
    const id = window.setTimeout(() => {
      savePersisted({
        version: 1,
        world,
        settings,
        articles,
        view: {
          evenLight,
          overlay,
          showFlow,
          showSpinAxis,
          dayAngle,
        },
      })
    }, 400)
    return () => window.clearTimeout(id)
  }, [
    world,
    settings,
    articles,
    evenLight,
    overlay,
    showFlow,
    showSpinAxis,
    dayAngle,
  ])

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

  const lookAt = useCallback((lat: number, lon: number) => {
    setLookTarget({ lat, lon, nonce: Date.now() })
  }, [])

  const applyWorld = (next: World) => {
    setWorld(next)
    setArticles(mergeArticles(articlesFromFeatures(next), articlesRef.current))
    setSelectedId(null)
    setCompareWorld(null)
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

  const compare = () => {
    setGenerating(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setCompareWorld(createWorld(settings, randomSeed()))
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

  const onSelectPlace = (id: string) => {
    setSelectedId(id)
    const article = articles.find((item) => item.id === id)
    if (article?.pin) lookAt(article.pin.lat, article.pin.lon)
  }

  const onFollowLink = (title: string) => {
    const existing = articlesRef.current.find((article) =>
      titlesMatch(article.title, title),
    )
    if (existing) {
      onSelectPlace(existing.id)
      return
    }
    const article: Article = {
      id: `wiki-${Date.now().toString(36)}`,
      universeId: world.universeId,
      worldId: world.id,
      title,
      body: '',
    }
    setArticles((list) => [...list, article])
    setSelectedId(article.id)
  }

  const onNewArticle = () => {
    const article: Article = {
      id: `wiki-${Date.now().toString(36)}`,
      universeId: world.universeId,
      worldId: world.id,
      title: 'Untitled',
      body: '',
    }
    setArticles((list) => [...list, article])
    setSelectedId(article.id)
  }

  const comparing = compareWorld !== null

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
          showFlow={showFlow}
          onShowFlowChange={setShowFlow}
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
          comparing={comparing}
          onCompare={compare}
          onCloseCompare={() => setCompareWorld(null)}
        />
      </div>
      <div className={comparing ? 'app-globes app-globes-split' : 'app-globes'}>
        <Globe
          world={world}
          articles={articles}
          selectedArticleId={selectedId}
          overlay={overlay}
          showSpinAxis={showSpinAxis}
          showFlow={showFlow}
          dayAngle={dayAngle}
          evenLight={evenLight}
          label={comparing ? `Seed ${world.globe.seed}` : undefined}
          lookTarget={lookTarget}
          onViewChange={(lat, lon) => {
            viewRef.current = { lat, lon }
          }}
          onPickSurface={onPickSurface}
          onSelectPin={onSelectPlace}
        />
        {compareWorld && (
          <Globe
            world={compareWorld}
            articles={[]}
            selectedArticleId={null}
            overlay={overlay}
            showSpinAxis={showSpinAxis}
            showFlow={showFlow}
            dayAngle={dayAngle}
            evenLight={evenLight}
            lite
            interactive={false}
            label={`Seed ${compareWorld.globe.seed}`}
          />
        )}
      </div>
      <Minimap
        params={world.globe}
        articles={articles}
        selectedId={selectedId}
        viewRef={viewRef}
        onLookAt={lookAt}
      />
      <ArticleDock
        articles={articles}
        selectedId={selectedId}
        probe={selectedProbe}
        onSelect={onSelectPlace}
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
        onFollowLink={onFollowLink}
        onNewArticle={onNewArticle}
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}
