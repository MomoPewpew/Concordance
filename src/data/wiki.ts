export type WikiSpan =
  | { type: 'text'; text: string }
  | { type: 'link'; title: string; label: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }

const TOKEN =
  /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\*\*([^*]+)\*\*|\*([^*]+)\*/g

export function parseWikiLine(line: string): WikiSpan[] {
  const spans: WikiSpan[] = []
  let last = 0
  TOKEN.lastIndex = 0
  let match = TOKEN.exec(line)
  while (match) {
    if (match.index > last) {
      spans.push({ type: 'text', text: line.slice(last, match.index) })
    }
    if (match[1] !== undefined) {
      const title = match[1].trim()
      spans.push({
        type: 'link',
        title,
        label: (match[2] ?? title).trim(),
      })
    } else if (match[3] !== undefined) {
      spans.push({ type: 'bold', text: match[3] })
    } else if (match[4] !== undefined) {
      spans.push({ type: 'italic', text: match[4] })
    }
    last = match.index + match[0].length
    match = TOKEN.exec(line)
  }
  if (last < line.length) spans.push({ type: 'text', text: line.slice(last) })
  return spans.length > 0 ? spans : [{ type: 'text', text: '' }]
}

export function parseWiki(body: string): WikiSpan[][] {
  const blocks = body.replace(/\r\n/g, '\n').split(/\n{2,}/)
  return blocks.map((block) => parseWikiLine(block.replace(/\n/g, ' ')))
}

export function titlesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}
