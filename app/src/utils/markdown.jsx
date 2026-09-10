// Small, dependency-free markdown -> React element renderer covering the
// common subset (headings, bold/italic, inline code, code blocks, links,
// lists, blockquotes, horizontal rules, paragraphs, tables). Builds React
// elements directly instead of raw HTML so there is no
// dangerouslySetInnerHTML/XSS surface to worry about.

import { useState } from 'react'

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

export function isTableRow(trimmed) {
  return trimmed !== '' && trimmed.includes('|')
}

function isTableSeparatorCell(cell) {
  return /^:?-{1,}:?$/.test(cell.trim())
}

export function isTableSeparator(trimmed) {
  if (!isTableRow(trimmed)) return false
  return splitTableRow(trimmed).every(isTableSeparatorCell)
}

// Strips at most one leading and one trailing space - the single padding
// space serializeTable always adds around a cell's content - rather than a
// full trim(), so a trailing space the user deliberately typed into a cell
// survives the parse -> serialize -> re-parse round trip a live edit causes.
function stripPadding(cell) {
  let result = cell
  if (result.startsWith(' ')) result = result.slice(1)
  if (result.endsWith(' ')) result = result.slice(0, -1)
  return result
}

// Splits a "| a | b |" row into ["a", "b"], honoring "\|" as an escaped
// literal pipe rather than a cell boundary.
export function splitTableRow(line) {
  let trimmed = line.trim()
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1)
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1)
  return trimmed.split(/(?<!\\)\|/).map((cell) => stripPadding(cell).replace(/\\\|/g, '|'))
}

export function parseTableAligns(sepLine) {
  return splitTableRow(sepLine).map((cell) => {
    const trimmed = cell.trim()
    const left = trimmed.startsWith(':')
    const right = trimmed.endsWith(':')
    if (left && right) return 'center'
    if (right) return 'right'
    if (left) return 'left'
    return null
  })
}

export function alignToSeparatorCell(align) {
  if (align === 'center') return ':---:'
  if (align === 'right') return '---:'
  if (align === 'left') return ':---'
  return '---'
}

export function normalizeRow(row, length) {
  const normalized = row.slice(0, length)
  while (normalized.length < length) normalized.push('')
  return normalized
}

export function serializeTable(headerCells, aligns, bodyRows) {
  return [
    `| ${headerCells.join(' | ')} |`,
    `| ${aligns.map(alignToSeparatorCell).join(' | ')} |`,
    ...bodyRows.map((row) => `| ${row.join(' | ')} |`),
  ]
}

// The following four helpers mutate a table's raw lines in place given a
// `block` from liveMarkdownDecorate.jsx's computeTableBlocks ({ headerLine,
// sepLine, endLine, colCount, aligns }) - used by Live Preview's row/column
// add-remove controls, which (unlike Side Preview's MarkdownTable) have no
// parsed header/body-row state of their own to edit and re-serialize.

export function insertBlankTableRow(lines, block) {
  const blankRow = `| ${Array(block.colCount).fill('').join(' | ')} |`
  return [...lines.slice(0, block.endLine + 1), blankRow, ...lines.slice(block.endLine + 1)]
}

export function removeLastTableRow(lines, block) {
  if (block.endLine <= block.sepLine) return lines
  return [...lines.slice(0, block.endLine), ...lines.slice(block.endLine + 1)]
}

export function insertTableColumn(lines, block, side) {
  const insertAt = side === 'left' ? 0 : block.colCount
  const newLines = lines.slice()

  const headerCells = splitTableRow(lines[block.headerLine])
  headerCells.splice(insertAt, 0, '')
  newLines[block.headerLine] = `| ${headerCells.join(' | ')} |`

  const aligns = block.aligns.slice()
  aligns.splice(insertAt, 0, null)
  newLines[block.sepLine] = `| ${aligns.map(alignToSeparatorCell).join(' | ')} |`

  for (let r = block.sepLine + 1; r <= block.endLine; r++) {
    const cells = normalizeRow(splitTableRow(lines[r]), block.colCount)
    cells.splice(insertAt, 0, '')
    newLines[r] = `| ${cells.join(' | ')} |`
  }
  return newLines
}

export function removeTableColumn(lines, block, side) {
  if (block.colCount <= 1) return lines
  const removeAt = side === 'left' ? 0 : block.colCount - 1
  const newLines = lines.slice()

  const headerCells = splitTableRow(lines[block.headerLine]).filter((_, idx) => idx !== removeAt)
  newLines[block.headerLine] = `| ${headerCells.join(' | ')} |`

  const aligns = block.aligns.filter((_, idx) => idx !== removeAt)
  newLines[block.sepLine] = `| ${aligns.map(alignToSeparatorCell).join(' | ')} |`

  for (let r = block.sepLine + 1; r <= block.endLine; r++) {
    const cells = normalizeRow(splitTableRow(lines[r]), block.colCount).filter((_, idx) => idx !== removeAt)
    newLines[r] = `| ${cells.join(' | ')} |`
  }
  return newLines
}

// An editable table block for the live/split preview: cells are plain-text
// inputs bound directly to the raw markdown (no inline markdown rendering
// inside cells), and every edit rewrites the table's line range in the note
// via linkContext.onTableChange, which is the single source of truth.
function MarkdownTable({ headerCells, aligns, bodyRows, startLine, endLine, linkContext }) {
  const [sort, setSort] = useState({ col: null, dir: 1 })
  const [hoverCol, setHoverCol] = useState(null)
  const [hoverRow, setHoverRow] = useState(false)
  const editable = Boolean(linkContext && linkContext.onTableChange)
  const colCount = headerCells.length

  function commit(newHeader, newAligns, newBodyRows) {
    if (!editable) return
    linkContext.onTableChange(startLine, endLine, serializeTable(newHeader, newAligns, newBodyRows))
  }

  function updateHeaderCell(colIdx, val) {
    const next = headerCells.slice()
    next[colIdx] = val
    commit(next, aligns, bodyRows)
  }

  function updateBodyCell(rowIdx, colIdx, val) {
    const next = bodyRows.map((row) => row.slice())
    next[rowIdx][colIdx] = val
    commit(headerCells, aligns, next)
  }

  function addRow() {
    commit(headerCells, aligns, [...bodyRows, headerCells.map(() => '')])
  }

  function removeLastRow() {
    if (bodyRows.length === 0) return
    commit(headerCells, aligns, bodyRows.slice(0, -1))
  }

  // rowIdx -1 means the header row, so a new blank row is inserted directly
  // below it (i.e. at body index 0).
  function insertRowAfter(rowIdx) {
    const next = bodyRows.map((row) => row.slice())
    next.splice(rowIdx + 1, 0, headerCells.map(() => ''))
    commit(headerCells, aligns, next)
  }

  function addColumn(position) {
    const insertAt = position === 'left' ? 0 : colCount
    const next = headerCells.slice()
    next.splice(insertAt, 0, '')
    const nextAligns = aligns.slice()
    nextAligns.splice(insertAt, 0, null)
    const nextRows = bodyRows.map((row) => {
      const copy = row.slice()
      copy.splice(insertAt, 0, '')
      return copy
    })
    commit(next, nextAligns, nextRows)
  }

  function removeColumn(position) {
    if (colCount <= 1) return
    const removeAt = position === 'left' ? 0 : colCount - 1
    const next = headerCells.filter((_, idx) => idx !== removeAt)
    const nextAligns = aligns.filter((_, idx) => idx !== removeAt)
    const nextRows = bodyRows.map((row) => row.filter((_, idx) => idx !== removeAt))
    commit(next, nextAligns, nextRows)
  }

  function sortByColumn(colIdx) {
    const dir = sort.col === colIdx ? -sort.dir : 1
    const sorted = [...bodyRows].sort((a, b) => {
      const av = a[colIdx] ?? ''
      const bv = b[colIdx] ?? ''
      const an = parseFloat(av)
      const bn = parseFloat(bv)
      const bothNumeric = av.trim() !== '' && bv.trim() !== '' && !Number.isNaN(an) && !Number.isNaN(bn)
      const cmp = bothNumeric ? an - bn : av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' })
      return cmp * dir
    })
    setSort({ col: colIdx, dir })
    commit(headerCells, aligns, sorted)
  }

  function handleCellKeyDown(rowIdx) {
    return (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        insertRowAfter(rowIdx)
      }
    }
  }

  // Sizes each column's cell inputs to its widest current content (header or
  // body) instead of letting them flex to fill the preview pane - otherwise
  // a freshly-inserted table renders far wider than its actual text.
  const colSizes = headerCells.map((headerCell, colIdx) => {
    const lengths = [headerCell.length, ...bodyRows.map((row) => (row[colIdx] ?? '').length)]
    return Math.min(40, Math.max(4, Math.max(...lengths) + 2))
  })

  return (
    <div className="md-table-wrapper">
      <div className="md-table-scroll">
        <table className="md-table">
          <thead>
            <tr>
              {headerCells.map((cell, colIdx) => (
                <th key={colIdx} style={{ textAlign: aligns[colIdx] ?? undefined }}>
                  <div className="md-table-th-inner">
                    {editable ? (
                      <input
                        className="md-table-cell-input"
                        value={cell}
                        size={colSizes[colIdx]}
                        onChange={(e) => updateHeaderCell(colIdx, e.target.value)}
                        onKeyDown={handleCellKeyDown(-1)}
                      />
                    ) : (
                      cell
                    )}
                    {editable && (
                      <button
                        type="button"
                        className={`md-table-sort-button${sort.col === colIdx ? ' active' : ''}`}
                        title="Sort by this column"
                        onClick={() => sortByColumn(colIdx)}
                      >
                        {sort.col === colIdx ? (sort.dir === 1 ? '▲' : '▼') : '⇅'}
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, colIdx) => (
                  <td key={colIdx} style={{ textAlign: aligns[colIdx] ?? undefined }}>
                    {editable ? (
                      <input
                        className="md-table-cell-input"
                        value={cell}
                        size={colSizes[colIdx]}
                        onChange={(e) => updateBodyCell(rowIdx, colIdx, e.target.value)}
                        onKeyDown={handleCellKeyDown(rowIdx)}
                      />
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {editable && (
          <>
            <div
              className="md-table-col-hover md-table-col-hover-left"
              onMouseEnter={() => setHoverCol('left')}
              onMouseLeave={() => setHoverCol(null)}
            >
              {hoverCol === 'left' && (
                <div className="md-table-col-controls">
                  <button type="button" title="Add column" onClick={() => addColumn('left')}>
                    +
                  </button>
                  <button type="button" title="Remove column" disabled={colCount <= 1} onClick={() => removeColumn('left')}>
                    −
                  </button>
                </div>
              )}
            </div>
            <div
              className="md-table-col-hover md-table-col-hover-right"
              onMouseEnter={() => setHoverCol('right')}
              onMouseLeave={() => setHoverCol(null)}
            >
              {hoverCol === 'right' && (
                <div className="md-table-col-controls">
                  <button type="button" title="Add column" onClick={() => addColumn('right')}>
                    +
                  </button>
                  <button type="button" title="Remove column" disabled={colCount <= 1} onClick={() => removeColumn('right')}>
                    −
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {editable && (
        <div className="md-table-row-hover" onMouseEnter={() => setHoverRow(true)} onMouseLeave={() => setHoverRow(false)}>
          {hoverRow && (
            <div className="md-table-row-controls">
              <button type="button" title="Add row" onClick={addRow}>
                +
              </button>
              <button type="button" title="Remove last row" disabled={bodyRows.length === 0} onClick={removeLastRow}>
                −
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
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
    /^\d+\.\s+/.test(trimmed) ||
    isTableRow(trimmed)
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
        <blockquote key={key}>{parseInline(quoteLines.join('\n'), `q${key++}`, linkContext)}</blockquote>,
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

    if (isTableRow(trimmed) && i + 1 < lines.length && isTableSeparator(lines[i + 1].trim())) {
      const headerCells = splitTableRow(trimmed)
      const aligns = parseTableAligns(lines[i + 1])
      if (headerCells.length === aligns.length) {
        const startLine = i
        i += 2
        const bodyRows = []
        while (i < lines.length && isTableRow(lines[i].trim())) {
          bodyRows.push(normalizeRow(splitTableRow(lines[i]), headerCells.length))
          i++
        }
        const endLine = i - 1
        blocks.push(
          <MarkdownTable
            key={key++}
            headerCells={headerCells}
            aligns={aligns}
            bodyRows={bodyRows}
            startLine={startLine}
            endLine={endLine}
            linkContext={linkContext}
          />,
        )
        continue
      }
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
    blocks.push(<p key={key}>{parseInline(paraLines.join('\n'), `p${key++}`, linkContext)}</p>)
  }

  return blocks
}
