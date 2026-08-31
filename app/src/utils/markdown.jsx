// Small, dependency-free markdown -> React element renderer covering the
// common subset (headings, bold/italic, inline code, code blocks, links,
// lists, blockquotes, horizontal rules, paragraphs). Builds React elements
// directly instead of raw HTML so there is no dangerouslySetInnerHTML/XSS
// surface to worry about.

const SAFE_URL_PATTERN = /^(https?:|mailto:|#|\/)/i

function safeHref(url) {
  return SAFE_URL_PATTERN.test(url.trim()) ? url : '#'
}

const INLINE_PATTERN =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*]+\*)|(_[^_]+_)|(\[\[[^\]]+\]\])|(\[[^\]]+\]\([^)]+\))/

function parseInline(text, keyPrefix = 'i', linkContext = {}) {
  const nodes = []
  let remaining = text
  let index = 0

  while (remaining) {
    const match = remaining.match(INLINE_PATTERN)
    if (!match) {
      nodes.push(remaining)
      break
    }

    const matchIndex = match.index
    if (matchIndex > 0) {
      nodes.push(remaining.slice(0, matchIndex))
    }

    const token = match[0]
    const key = `${keyPrefix}-${index++}`

    if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(<strong key={key}>{parseInline(token.slice(2, -2), key, linkContext)}</strong>)
    } else if (token.startsWith('*') || token.startsWith('_')) {
      nodes.push(<em key={key}>{parseInline(token.slice(1, -1), key, linkContext)}</em>)
    } else if (token.startsWith('[[')) {
      const linkTitle = token.slice(2, -2)
      const { notes = [], onNoteLinkClick } = linkContext
      const note = notes.find(
        (candidate) => candidate.title.trim().toLowerCase() === linkTitle.trim().toLowerCase(),
      )
      nodes.push(
        <a
          key={key}
          href="#"
          className={note ? 'md-internal-link' : 'md-internal-link md-internal-link-broken'}
          onClick={(e) => {
            e.preventDefault()
            if (note && onNoteLinkClick) onNoteLinkClick(note.id)
          }}
        >
          {linkTitle}
        </a>,
      )
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      nodes.push(
        <a key={key} href={safeHref(linkMatch[2])} target="_blank" rel="noopener noreferrer">
          {linkMatch[1]}
        </a>,
      )
    }

    remaining = remaining.slice(matchIndex + token.length)
  }

  return nodes
}

function isBlockBoundary(line) {
  const trimmed = line.trim()
  return (
    trimmed === '' ||
    trimmed.startsWith('```') ||
    /^#{1,6}\s+/.test(trimmed) ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed) ||
    trimmed.startsWith('>') ||
    /^[-*]\s+/.test(trimmed) ||
    /^\d+\.\s+/.test(trimmed)
  )
}

export function renderMarkdown(markdown, linkContext = {}) {
  const lines = (markdown ?? '').split('\n')
  const blocks = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '') {
      i++
      continue
    }

    if (trimmed.startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++
      blocks.push(
        <pre key={key++} className="md-code-block">
          <code>{codeLines.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const Tag = `h${level}`
      blocks.push(<Tag key={key}>{parseInline(headingMatch[2], `h${key++}`, linkContext)}</Tag>)
      i++
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(<hr key={key++} />)
      i++
      continue
    }

    if (trimmed.startsWith('>')) {
      const quoteLines = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      blocks.push(
        <blockquote key={key}>{parseInline(quoteLines.join(' '), `q${key++}`, linkContext)}</blockquote>,
      )
      continue
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push(
        <ul key={key}>
          {items.map((item, idx) => (
            <li key={idx}>{parseInline(item, `ul${key}-${idx}`, linkContext)}</li>
          ))}
        </ul>,
      )
      key++
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push(
        <ol key={key}>
          {items.map((item, idx) => (
            <li key={idx}>{parseInline(item, `ol${key}-${idx}`, linkContext)}</li>
          ))}
        </ol>,
      )
      key++
      continue
    }

    const paraLines = []
    while (i < lines.length && !isBlockBoundary(lines[i])) {
      paraLines.push(lines[i])
      i++
    }
    blocks.push(<p key={key}>{parseInline(paraLines.join(' '), `p${key++}`, linkContext)}</p>)
  }

  return blocks
}
