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

import { isTableRow, isTableSeparator, splitTableRow, parseTableAligns } from './markdown.jsx'

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

function isFenced(fenceStates, index) {
  return index >= fenceStates.length || fenceStates[index].insideFence || fenceStates[index].isFenceDelimiter
}

// Precomputes the Markdown table blocks in `lines` - mirrors the block-level
// table detection in markdown.jsx's renderMarkdown so Live Preview
// recognizes the exact same tables Side Preview does. Each block records the
// raw-line range of its header/separator/body rows plus its column count and
// alignments, which both `computeTableStates` (per-line decoration) and
// LiveMarkdownEditor's row/column add-remove controls key off of.
export function computeTableBlocks(lines, fenceStates) {
  const blocks = []
  let i = 0
  while (i < lines.length) {
    if (isFenced(fenceStates, i)) {
      i++
      continue
    }
    const trimmed = lines[i].trim()
    if (isTableRow(trimmed) && !isFenced(fenceStates, i + 1) && isTableSeparator(lines[i + 1]?.trim() ?? '')) {
      const headerCells = splitTableRow(trimmed)
      const aligns = parseTableAligns(lines[i + 1])
      if (headerCells.length === aligns.length) {
        const headerLine = i
        const sepLine = i + 1
        let j = sepLine + 1
        while (j < lines.length && !isFenced(fenceStates, j) && isTableRow(lines[j].trim())) j++
        blocks.push({ headerLine, sepLine, endLine: j - 1, colCount: headerCells.length, aligns })
        i = j
        continue
      }
    }
    i++
  }
  return blocks
}

// Per-line lookup derived from computeTableBlocks: whether a line is a
// table's header, separator or body row, its column alignments, and the
// block it belongs to (for the row/column controls' bounding box).
export function computeTableStates(lines, fenceStates) {
  const states = new Array(lines.length).fill(null)
  for (const block of computeTableBlocks(lines, fenceStates)) {
    states[block.headerLine] = { rowType: 'header', aligns: block.aligns, block }
    states[block.sepLine] = { rowType: 'separator', aligns: block.aligns, block }
    for (let r = block.sepLine + 1; r <= block.endLine; r++) {
      states[r] = { rowType: 'body', aligns: block.aligns, block }
    }
  }
  return states
}

// Splits a table row's raw text into alternating text/pipe tokens, keeping
// every character (escaped pipes stay glued to their surrounding text) so
// the decorated output's textContent still matches the raw line exactly.
function splitRowIntoTokens(line) {
  const PIPE_SPLIT = /\\\||\|/g
  const tokens = []
  let last = 0
  let match
  while ((match = PIPE_SPLIT.exec(line))) {
    if (match[0] === '|') {
      tokens.push({ type: 'text', text: line.slice(last, match.index) })
      tokens.push({ type: 'pipe', text: '|' })
      last = match.index + 1
    }
  }
  tokens.push({ type: 'text', text: line.slice(last) })
  return tokens
}

// Decorates one line of a Markdown table for Live Preview. Header/body rows
// render their cells as real table cells (via CSS `display: table-cell` on
// sibling line-divs, which the browser auto-groups into an anonymous table -
// see LiveMarkdownEditor.css) so the table actually looks like a table
// instead of raw "| a | b |" text, while the leading/trailing pipes and the
// separator row's dashes stay hidden the same way other block syntax does.
//
// Every pipe/edge syntax span is nested *inside* the adjacent
// `lp-table-cell` span rather than rendered as a row-level sibling: a
// table-row's in-flow children that aren't themselves table-cells get
// wrapped in browser-generated anonymous cells (CSS 2.1 17.2.1), so a bare
// syntax span sitting next to the real cells - visible only while that row
// is active - was silently adding extra phantom columns and shifting the
// row's cells out of alignment with the rest of the table.
export function decorateTableRow(lineText, key, ctx, activeRange, rowType, aligns) {
  const isActive = activeRange !== null

  if (rowType === 'separator') {
    return isActive
      ? { className: 'lp-table-separator-active', content: lineText }
      : { className: 'lp-table-separator', content: lineText }
  }

  const lineSpanClass = syntaxClass(isActive)
  const tokens = splitRowIntoTokens(lineText)
  const firstIsEdge = tokens[0].type === 'text' && tokens.length > 1 && tokens[0].text.trim() === ''
  const lastIsEdge =
    tokens[tokens.length - 1].type === 'text' && tokens.length > 1 && tokens[tokens.length - 1].text.trim() === ''

  let cursor = 0
  let cellIndex = 0
  const cells = []
  let pendingSyntax = []

  tokens.forEach((tok, idx) => {
    const start = cursor
    cursor += tok.text.length
    const tokKey = `${key}-t${idx}`

    if (tok.type === 'pipe') {
      pendingSyntax.push(
        <span key={tokKey} className={lineSpanClass}>
          {tok.text}
        </span>,
      )
      return
    }

    const isEdge = (idx === 0 && firstIsEdge) || (idx === tokens.length - 1 && lastIsEdge)
    if (isEdge) {
      if (tok.text) {
        pendingSyntax.push(
          <span key={tokKey} className={lineSpanClass}>
            {tok.text}
          </span>,
        )
      }
      return
    }

    const align = aligns[cellIndex]
    cellIndex++
    cells.push({
      align,
      content: [...pendingSyntax, ...decorateInline(tok.text, tokKey, ctx, start, activeRange)],
    })
    pendingSyntax = []
  })

  // A trailing pipe/edge after the last real cell (or a malformed row with
  // no real cells at all) has nowhere later to attach to, so fold it into
  // the last cell instead of dropping it - every raw character must still
  // appear somewhere in the output (see domOffset.js).
  if (pendingSyntax.length) {
    if (cells.length) {
      cells[cells.length - 1].content.push(...pendingSyntax)
    } else {
      cells.push({ align: null, content: pendingSyntax })
    }
  }

  const content = cells.map((cell, idx) => (
    <span key={`${key}-c${idx}`} className="lp-table-cell" style={{ textAlign: cell.align ?? undefined }}>
      {cell.content}
    </span>
  ))

  return { className: `lp-table-row lp-table-${rowType}`, content }
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
