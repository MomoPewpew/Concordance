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

  return (
    <aside className="article-dock">
      <div className="article-dock-head">
        <span>Article</span>
        {selected && (
          <button type="button" className="article-dock-close" onClick={onClose}>
            Close
          </button>
        )}
      </div>
      {articles.length > 0 && (
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
                {article.title || 'Untitled'}
              </button>
            </li>
          ))}
        </ul>
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
            {biomeLabel(probe.biome)}
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
        <p className="article-dock-hint">Click the globe to pin a place.</p>
      )}
    </aside>
  )
}
