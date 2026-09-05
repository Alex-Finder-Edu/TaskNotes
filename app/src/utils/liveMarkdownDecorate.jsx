// Turns one line of raw markdown into React nodes for the Live Preview
// editor. Unlike utils/markdown.jsx (which builds a read-only preview and
// discards markdown syntax entirely), this is a *decorator*: every character
// of the input line is always reproduced somewhere in the output, with
// syntax characters (**, `, [[, etc.) wrapped in a <span class="md-syntax">
// so CSS can hide them - never removed outright. That keeps a line's
// rendered textContent identical to its raw text, which utils/domOffset.js
// relies on to map cursor positions back to raw string offsets.

const INLINE_PATTERN =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*]+\*)|(_[^_]+_)|(\[\[[^\]]+\]\])|(\[[^\]]+\]\([^)]+\))/

function decorateInline(text, keyPrefix, ctx) {
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
      nodes.push(
        <code key={key}>
          <span className="md-syntax">`</span>
          {token.slice(1, -1)}
          <span className="md-syntax">`</span>
        </code>,
      )
    } else if (token.startsWith('**') || token.startsWith('__')) {
      const marker = token.slice(0, 2)
      nodes.push(
        <strong key={key}>
          <span className="md-syntax">{marker}</span>
          {decorateInline(token.slice(2, -2), key, ctx)}
          <span className="md-syntax">{marker}</span>
        </strong>,
      )
    } else if (token.startsWith('*') || token.startsWith('_')) {
      const marker = token[0]
      nodes.push(
        <em key={key}>
          <span className="md-syntax">{marker}</span>
          {decorateInline(token.slice(1, -1), key, ctx)}
          <span className="md-syntax">{marker}</span>
        </em>,
      )
    } else if (token.startsWith('[[')) {
      const linkTitle = token.slice(2, -2)
      const { notes = [], onNoteLinkClick } = ctx
      const note = notes.find(
        (candidate) => candidate.title.trim().toLowerCase() === linkTitle.trim().toLowerCase(),
      )
      nodes.push(
        <span
          key={key}
          className={note ? 'md-internal-link' : 'md-internal-link md-internal-link-broken'}
          title="Ctrl+Click to open"
          onClick={(e) => {
            if ((e.ctrlKey || e.metaKey) && note && onNoteLinkClick) {
              e.preventDefault()
              onNoteLinkClick(note.id)
            }
          }}
        >
          <span className="md-syntax">[[</span>
          {linkTitle}
          <span className="md-syntax">]]</span>
        </span>,
      )
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      nodes.push(
        <span key={key} className="md-external-link">
          <span className="md-syntax">[</span>
          {linkMatch[1]}
          <span className="md-syntax">{`](${linkMatch[2]})`}</span>
        </span>,
      )
    }

    remaining = remaining.slice(matchIndex + token.length)
  }

  return nodes
}

// Precomputes, per line, whether it sits inside a ``` fenced code block so
// the caller can skip inline decoration for those lines (and for their
// fence delimiters).
export function computeFenceStates(lines) {
  const states = []
  let inFence = false
  for (const line of lines) {
    const isFenceDelimiter = line.trim().startsWith('```')
    states.push({ insideFence: inFence, isFenceDelimiter })
    if (isFenceDelimiter) inFence = !inFence
  }
  return states
}

// Decorates a single non-active, non-code-fence line: detects its block
// type (heading, quote, list, hr, paragraph) and decorates its inline runs.
export function decorateLine(lineText, key, ctx) {
  const headingMatch = lineText.match(/^(#{1,6})(\s+)(.*)$/)
  if (headingMatch) {
    const level = headingMatch[1].length
    return {
      className: `lp-heading lp-h${level}`,
      content: [
        <span key={`${key}-m`} className="md-syntax">
          {headingMatch[1] + headingMatch[2]}
        </span>,
        ...decorateInline(headingMatch[3], `${key}-h`, ctx),
      ],
    }
  }

  if (/^(-{3,}|\*{3,}|_{3,})$/.test(lineText.trim())) {
    return {
      className: 'lp-hr',
      content: [
        <span key={`${key}-m`} className="md-syntax">
          {lineText}
        </span>,
      ],
    }
  }

  const quoteMatch = lineText.match(/^(>\s?)(.*)$/)
  if (quoteMatch) {
    return {
      className: 'lp-quote',
      content: [
        <span key={`${key}-m`} className="md-syntax">
          {quoteMatch[1]}
        </span>,
        ...decorateInline(quoteMatch[2], `${key}-q`, ctx),
      ],
    }
  }

  const bulletMatch = lineText.match(/^(\s*)([-*])(\s+)(.*)$/)
  if (bulletMatch) {
    return {
      className: 'lp-list-bullet',
      marker: '•',
      content: [
        <span key={`${key}-m`} className="md-syntax">
          {bulletMatch[1] + bulletMatch[2] + bulletMatch[3]}
        </span>,
        ...decorateInline(bulletMatch[4], `${key}-b`, ctx),
      ],
    }
  }

  const orderedMatch = lineText.match(/^(\s*)(\d+)(\.\s+)(.*)$/)
  if (orderedMatch) {
    return {
      className: 'lp-list-ordered',
      marker: `${orderedMatch[2]}.`,
      content: [
        <span key={`${key}-m`} className="md-syntax">
          {orderedMatch[1] + orderedMatch[2] + orderedMatch[3]}
        </span>,
        ...decorateInline(orderedMatch[4], `${key}-o`, ctx),
      ],
    }
  }

  return { className: 'lp-paragraph', content: decorateInline(lineText, `${key}-p`, ctx) }
}
