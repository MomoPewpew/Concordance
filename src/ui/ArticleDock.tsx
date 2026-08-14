import { useState } from 'react'
import { biomeLabel } from '../worldgen/biomes'
import type { Article } from '../data/types'
import { parseWiki, titlesMatch } from '../data/wiki'
import type { SurfaceProbe } from '../worldgen/probe'

type ArticleDockProps = {
  articles: Article[]
  selectedId: string | null
  probe: SurfaceProbe | null
  onSelect: (id: string) => void
  onTitleChange: (id: string, title: string) => void
  onBodyChange: (id: string, body: string) => void
  onFollowLink: (title: string) => void
  onNewArticle: () => void
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
  if (article.feature === 'lake') return 'Lake'
  return article.pin ? 'Pin' : 'Article'
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

function WikiPreview({
  body,
  articles,
  onFollowLink,
}: {
  body: string
  articles: Article[]
  onFollowLink: (title: string) => void
}) {
  const blocks = parseWiki(body)
  if (!body.trim()) {
    return <p className="article-dock-hint">Nothing written yet.</p>
  }
  return (
    <div className="article-wiki">
      {blocks.map((spans, i) => (
        <p key={i}>
          {spans.map((span, j) => {
            if (span.type === 'text') return <span key={j}>{span.text}</span>
            if (span.type === 'bold') return <strong key={j}>{span.text}</strong>
            if (span.type === 'italic') return <em key={j}>{span.text}</em>
            const exists = articles.some((article) =>
              titlesMatch(article.title, span.title),
            )
            return (
              <button
                key={j}
                type="button"
                className={
                  exists ? 'article-wiki-link' : 'article-wiki-link article-wiki-missing'
                }
                onClick={() => onFollowLink(span.title)}
              >
                {span.label}
              </button>
            )
          })}
        </p>
      ))}
    </div>
  )
}

export function ArticleDock({
  articles,
  selectedId,
  probe,
  onSelect,
  onTitleChange,
  onBodyChange,
  onFollowLink,
  onNewArticle,
  onClose,
}: ArticleDockProps) {
  const selected = articles.find((a) => a.id === selectedId) ?? null
  const features = articles.filter((article) => article.feature)
  const pins = articles.filter((article) => !article.feature && article.pin)
  const lore = articles.filter((article) => !article.feature && !article.pin)
  const [editing, setEditing] = useState(false)

  return (
    <aside className="article-dock">
      <div className="article-dock-head">
        <span>Places</span>
        <span className="article-dock-head-actions">
          <button type="button" className="article-dock-close" onClick={onNewArticle}>
            New
          </button>
          {selected && (
            <button type="button" className="article-dock-close" onClick={onClose}>
              Close
            </button>
          )}
        </span>
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
      {lore.length > 0 && (
        <>
          <p className="article-dock-section">Articles</p>
          <ArticleList
            articles={lore}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </>
      )}
      {selected && (
        <div className="article-dock-body">
          <input
            className="article-dock-title"
            value={selected.title}
            onChange={(event) => onTitleChange(selected.id, event.target.value)}
            placeholder="Title"
          />
          {probe && (
            <p className="article-dock-meta">
              {kindLabel(selected)} · {biomeLabel(probe.biome)}
              <br />
              {formatCoord(probe.lat, probe.lon)}
              <br />
              {probe.lake
                ? 'Inland sea'
                : probe.elevation > 0.0005
                  ? 'Above sea level'
                  : probe.elevation < -0.0005
                    ? 'Below sea level'
                    : 'At sea level'}
            </p>
          )}
          {!probe && (
            <p className="article-dock-meta">{kindLabel(selected)} · no pin</p>
          )}
          <div className="article-dock-tabs">
            <button
              type="button"
              className={editing ? 'article-dock-tab article-dock-tab-active' : 'article-dock-tab'}
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
            <button
              type="button"
              className={!editing ? 'article-dock-tab article-dock-tab-active' : 'article-dock-tab'}
              onClick={() => setEditing(false)}
            >
              Read
            </button>
          </div>
          {editing ? (
            <textarea
              className="article-dock-text"
              value={selected.body}
              onChange={(event) => onBodyChange(selected.id, event.target.value)}
              placeholder="Write the article. [[Other place]] makes a link. **bold** and *italic* work too."
              rows={8}
            />
          ) : (
            <WikiPreview
              body={selected.body}
              articles={articles}
              onFollowLink={onFollowLink}
            />
          )}
        </div>
      )}
      {!selected && (
        <p className="article-dock-hint">
          Named features come from the climate field. Click the globe to pin a
          place, or New for an unpinned article. Links use [[Title]].
        </p>
      )}
    </aside>
  )
}
