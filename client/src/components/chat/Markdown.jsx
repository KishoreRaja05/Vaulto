import { Fragment } from 'react'

// Small, dependency-free markdown renderer for assistant replies. It builds
// React elements (never raw HTML) and only links http(s) URLs.

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g

function renderInline(text, keyBase) {
  return String(text).split(INLINE).map((part, i) => {
    const key = `${keyBase}-${i}`
    if (!part) return null
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={key} className="font-semibold">{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={key} className="rounded bg-black/5 px-1 py-0.5 text-[0.85em] dark:bg-white/10">{part.slice(1, -1)}</code>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
    if (link) {
      return <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline underline-offset-2 dark:text-indigo-400">{link[1]}</a>
    }
    return <Fragment key={key}>{part}</Fragment>
  })
}

export default function Markdown({ children }) {
  const lines = String(children ?? '').replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i += 1; continue }

    if (line.trim().startsWith('```')) {
      const code = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i += 1 }
      i += 1
      blocks.push({ type: 'code', text: code.join('\n') })
      continue
    }

    const heading = line.match(/^#{1,3}\s+(.*)$/)
    if (heading) { blocks.push({ type: 'heading', text: heading[1] }); i += 1; continue }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i += 1 }
      blocks.push({ type: 'ul', items })
      continue
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+[.)]\s+/, '')); i += 1 }
      blocks.push({ type: 'ol', items })
      continue
    }

    const para = []
    while (i < lines.length && lines[i].trim() && !/^\s*([-*]|\d+[.)])\s+/.test(lines[i]) && !lines[i].trim().startsWith('```') && !/^#{1,3}\s/.test(lines[i])) {
      para.push(lines[i]); i += 1
    }
    blocks.push({ type: 'p', text: para.join('\n') })
  }

  return (
    <div className="space-y-2 break-words text-sm leading-relaxed">
      {blocks.map((b, bi) => {
        const key = `b${bi}`
        if (b.type === 'code') return <pre key={key} className="overflow-x-auto rounded-lg bg-black/5 p-3 text-xs dark:bg-white/10"><code>{b.text}</code></pre>
        if (b.type === 'heading') return <p key={key} className="font-semibold">{renderInline(b.text, key)}</p>
        if (b.type === 'ul') return <ul key={key} className="list-disc space-y-1 pl-5">{b.items.map((t, ti) => <li key={ti}>{renderInline(t, `${key}-${ti}`)}</li>)}</ul>
        if (b.type === 'ol') return <ol key={key} className="list-decimal space-y-1 pl-5">{b.items.map((t, ti) => <li key={ti}>{renderInline(t, `${key}-${ti}`)}</li>)}</ol>
        return (
          <p key={key}>
            {b.text.split('\n').map((ln, li) => (
              <Fragment key={li}>{li > 0 && <br />}{renderInline(ln, `${key}-${li}`)}</Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}
