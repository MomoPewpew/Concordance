import type { OverlayMode } from './overlay'
import type { RandomiserSettings } from './randomiser'
import { defaultRandomiserSettings } from './randomiser'
import type { Article, World } from './types'

const KEY = 'concordance-poc-v1'

export type PersistedView = {
  evenLight: boolean
  overlay: OverlayMode
  showFlow: boolean
  showSpinAxis: boolean
  dayAngle: number
}

export type Persisted = {
  version: 1
  world: World
  settings: RandomiserSettings
  articles: Article[]
  view: PersistedView
}

function migrateWorld(world: World): World {
  return {
    ...world,
    globe: {
      ...world.globe,
      flattening: world.globe.flattening ?? 0,
      inlandSeas: world.globe.inlandSeas ?? 0,
    },
  }
}

function migrateSettings(settings: RandomiserSettings): RandomiserSettings {
  return {
    ...defaultRandomiserSettings,
    ...settings,
    flattening: settings.flattening ?? 0,
    inlandSeas: settings.inlandSeas ?? 0,
  }
}

export function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Persisted
    if (data.version !== 1 || !data.world?.globe) return null
    return {
      ...data,
      world: migrateWorld(data.world),
      settings: migrateSettings(data.settings),
      articles: data.articles ?? [],
      view: data.view ?? {
        evenLight: false,
        overlay: 'none',
        showFlow: true,
        showSpinAxis: false,
        dayAngle: 0,
      },
    }
  } catch {
    return null
  }
}

export function savePersisted(data: Persisted): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* quota / private mode */
  }
}

export function mergeArticles(
  generated: Article[],
  previous: Article[],
): Article[] {
  const prevById = new Map(previous.map((article) => [article.id, article]))
  const merged = generated.map((article) => {
    const prev = prevById.get(article.id)
    if (!prev) return article
    return { ...article, title: prev.title, body: prev.body }
  })
  const worldId = generated[0]?.worldId
  const kept = new Set(merged.map((article) => article.id))
  for (const article of previous) {
    if (article.feature) continue
    if (kept.has(article.id)) continue
    if (worldId && article.worldId && article.worldId !== worldId) continue
    merged.push(article)
  }
  return merged
}
