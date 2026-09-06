// Turns one line of raw markdown into React nodes for the Live Preview
// editor. Unlike utils/markdown.jsx (which builds a read-only preview and
// discards markdown syntax entirely), this is a *decorator*: every character
// of the input line is always reproduced somewhere in the output, with
// syntax characters (**, `, [[, etc.) wrapped in a <span class="md-syntax">
// so CSS can hide them - never removed outright. That keeps a line's
// rendered textContent identical to its raw text, which utils/domOffset.js
// relies on to map cursor positions back to raw string offsets.
//
// Formatting stays applied even while the caret is inside a formatted run -
// only the syntax markers toggle visible (via the extra "md-syntax-visible"
// class), and only for the specific run the caret currently touches (see
// `rangesOverlap`), so e.g. editing one bold phrase doesn't reveal the
// markers of another bold phrase on the same line.

const SAFE_URL_PATTERN = /^(https?:|mailto:|#|\/)/i

function safeHref(url) {
  return SAFE_URL_PATTERN.test(url.trim()) ? url : '#'
}

const INLINE_PATTERN =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*]+\*)|(_[^_]+_)|(\[\[[^\]]+\]\])|(\[[^\]]+\]\([^)]+\))/

// `activeRange` is {start, end} in raw-offset coordinates *relative to the
// line*, or null if the caret/selection isn't on this line at all. A token
// spanning [start, end) is considered "active" (its syntax should show) when
// the caret/selection touches any part of it, including sitting exactly at
// either boundary - that's what lets typing right after an opening ** or
// right before a closing ]] keep the markers visible.
function rangesOverlap(range, start, end) {
  if (!range) return false
  return range.start <= end && range.end >= start
}

function syntaxClass(isActive) {
  return isActive ? 'md-syntax md-syntax-visible' : 'md-syntax'
}

function openExternalLink(e, url) {
  if (!(e.ctrlKey || e.metaKey)) return
  e.preventDefault()
  window.open(safeHref(url), '_blank', 'noopener,noreferrer')
}

// `lineOffset` is the raw-offset (relative to the line) where `text` begins,
// so nested recursive calls (e.g. the inside of a **bold** run) can keep
// computing token ranges in the same line-relative coordinate space that
// `activeRange` uses.
function decorateInline(text, keyPrefix, ctx, lineOffset = 0, activeRange = null) {
  const nodes = []
  let remaining = text
  let cursor = 0
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
    const tokenStart = lineOffset + cursor + matchIndex
    const tokenEnd = tokenStart + token.length
    const isActive = rangesOverlap(activeRange, tokenStart, tokenEnd)
    const spanClass = syntaxClass(isActive)

    if (token.startsWith('`')) {
      nodes.push(
        <code key={key}>
          <span className={spanClass}>`</span>
          {token.slice(1, -1)}
          <span className={spanClass}>`</span>
        </code>,
      )
    } else if (token.startsWith('**') || token.startsWith('__')) {
      const marker = token.slice(0, 2)
      nodes.push(
        <strong key={key}>
          <span className={spanClass}>{marker}</span>
          {decorateInline(token.slice(2, -2), key, ctx, tokenStart + 2, activeRange)}
          <span className={spanClass}>{marker}</span>
        </strong>,
      )
    } else if (token.startsWith('*') || token.startsWith('_')) {
      const marker = token[0]
      nodes.push(
        <em key={key}>
          <span className={spanClass}>{marker}</span>
          {decorateInline(token.slice(1, -1), key, ctx, tokenStart + 1, activeRange)}
          <span className={spanClass}>{marker}</span>
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
          <span className={spanClass}>[[</span>
          {linkTitle}
          <span className={spanClass}>]]</span>
        </span>,
      )
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      nodes.push(
        <span
          key={key}
          className="md-external-link"
          title="Ctrl+Click to open"
          onClick={(e) => openExternalLink(e, linkMatch[2])}
        >
          <span className={spanClass}>[</span>
          {linkMatch[1]}
          <span className={spanClass}>{`](${linkMatch[2]})`}</span>
        </span>,
      )
    }

    remaining = remaining.slice(matchIndex + token.length)
    cursor += matchIndex + token.length
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

// Decorates a single non-code-fence line: detects its block type (heading,
// quote, list, hr, paragraph) and decorates its inline runs. `activeRange` is
// {start, end} in raw offsets relative to this line when the caret/selection
// is on this line, or null otherwise. Block-level syntax (heading #s, quote
// >, list markers, hr) reveals whenever the caret is anywhere on the line;
// inline syntax (bold/italic/code/links) reveals only when the caret
// specifically touches that run - see `rangesOverlap`.
export function decorateLine(lineText, key, ctx, activeRange = null) {
  const isActiveLine = activeRange !== null
  const lineSpanClass = syntaxClass(isActiveLine)

  const headingMatch = lineText.match(/^(#{1,6})(\s+)(.*)$/)
  if (headingMatch) {
    const level = headingMatch[1].length
    const markerLen = headingMatch[1].length + headingMatch[2].length
    return {
      className: `lp-heading lp-h${level}`,
      content: [
        <span key={`${key}-m`} className={lineSpanClass}>
          {headingMatch[1] + headingMatch[2]}
        </span>,
        ...decorateInline(headingMatch[3], `${key}-h`, ctx, markerLen, activeRange),
      ],
    }
  }

  if (/^(-{3,}|\*{3,}|_{3,})$/.test(lineText.trim())) {
    return {
      className: 'lp-hr',
      content: [
        <span key={`${key}-m`} className={lineSpanClass}>
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
        <span key={`${key}-m`} className={lineSpanClass}>
          {quoteMatch[1]}
        </span>,
        ...decorateInline(quoteMatch[2], `${key}-q`, ctx, quoteMatch[1].length, activeRange),
      ],
    }
  }

  const bulletMatch = lineText.match(/^(\s*)([-*])(\s+)(.*)$/)
  if (bulletMatch) {
    const markerLen = bulletMatch[1].length + bulletMatch[2].length + bulletMatch[3].length
    return {
      className: 'lp-list-bullet',
      marker: '•',
      content: [
        <span key={`${key}-m`} className={lineSpanClass}>
          {bulletMatch[1] + bulletMatch[2] + bulletMatch[3]}
        </span>,
        ...decorateInline(bulletMatch[4], `${key}-b`, ctx, markerLen, activeRange),
      ],
    }
  }

  const orderedMatch = lineText.match(/^(\s*)(\d+)(\.\s+)(.*)$/)
  if (orderedMatch) {
    const markerLen = orderedMatch[1].length + orderedMatch[2].length + orderedMatch[3].length
    return {
      className: 'lp-list-ordered',
      marker: `${orderedMatch[2]}.`,
      content: [
        <span key={`${key}-m`} className={lineSpanClass}>
          {orderedMatch[1] + orderedMatch[2] + orderedMatch[3]}
        </span>,
        ...decorateInline(orderedMatch[4], `${key}-o`, ctx, markerLen, activeRange),
      ],
    }
  }

  return { className: 'lp-paragraph', content: decorateInline(lineText, `${key}-p`, ctx, 0, activeRange) }
}
