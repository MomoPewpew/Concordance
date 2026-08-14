import { biomeLabel } from '../worldgen/biomes'
import type { Article } from '../data/types'
import type { SurfaceProbe } from '../worldgen/probe'

type ArticleDockProps = {
  articles: Article[]
  selectedId: string | null
  probe: SurfaceProbe | null
  onSelect: (id: string) => void
  onTitleChange: (id: string, title: string) => void
  onBodyChange: (id: string, body: string) => void
  onClose: () => void
}

function formatCoord(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(1)}°${ns}  ${Math.abs(lon).toFixed(1)}°${ew}`
}

function kindLabel(article: Article): string {
  if (article.feature === 'peak') return 'Peak'
  if (article.feature === 'basin') return 'Basin'
  if (article.feature === 'island') return 'Island'
  return 'Pin'
}

function ArticleList({
  articles,
  selectedId,
  onSelect,
}: {
  articles: Article[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (articles.length === 0) return null
  return (
    <ul className="article-dock-list">
      {articles.map((article) => (
        <li key={article.id}>
          <button
            type="button"
            className={
              article.id === selectedId
                ? 'article-dock-item article-dock-item-active'
                : 'article-dock-item'
            }
            onClick={() => onSelect(article.id)}
          >
            <span>{article.title || 'Untitled'}</span>
            <span className="article-dock-kind">{kindLabel(article)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function ArticleDock({
  articles,
  selectedId,
  probe,
  onSelect,
  onTitleChange,
  onBodyChange,
  onClose,
}: ArticleDockProps) {
  const selected = articles.find((a) => a.id === selectedId) ?? null
  const features = articles.filter((article) => article.feature)
  const pins = articles.filter((article) => !article.feature)

  return (
    <aside className="article-dock">
      <div className="article-dock-head">
        <span>Places</span>
        {selected && (
          <button type="button" className="article-dock-close" onClick={onClose}>
            Close
          </button>
        )}
      </div>
      {features.length > 0 && (
        <>
          <p className="article-dock-section">Named features</p>
          <ArticleList
            articles={features}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </>
      )}
      {pins.length > 0 && (
        <>
          <p className="article-dock-section">Your pins</p>
          <ArticleList
            articles={pins}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </>
      )}
      {selected && probe && (
        <div className="article-dock-body">
          <input
            className="article-dock-title"
            value={selected.title}
            onChange={(event) => onTitleChange(selected.id, event.target.value)}
            placeholder="Title"
          />
          <p className="article-dock-meta">
            {kindLabel(selected)} · {biomeLabel(probe.biome)}
            <br />
            {formatCoord(probe.lat, probe.lon)}
            <br />
            {probe.elevation > 0.0005
              ? 'Above sea level'
              : probe.elevation < -0.0005
                ? 'Below sea level'
                : 'At sea level'}
          </p>
          <textarea
            className="article-dock-text"
            value={selected.body}
            onChange={(event) => onBodyChange(selected.id, event.target.value)}
            placeholder="Notes about this place…"
            rows={6}
          />
        </div>
      )}
      {!selected && (
        <p className="article-dock-hint">
          Named features come from the climate field. Click the globe to pin
          another place.
        </p>
      )}
    </aside>
  )
}
