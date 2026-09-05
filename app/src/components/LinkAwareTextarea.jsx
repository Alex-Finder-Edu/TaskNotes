import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getFolderPath } from '../context/NotesContext.jsx'
import { findLinkContext } from '../utils/linkContext.js'
import './LinkAwareTextarea.css'

function folderPathLabel(folders, folderId) {
  const path = getFolderPath(folders, folderId)
  return path.length ? path.map((folder) => folder.name).join(' / ') : 'Root'
}

// Measures where the caret renders on screen by mirroring the textarea's
// text and computed font metrics into an offscreen element, then reading the
// position of a marker span placed at the caret index.
function measureCaretPosition(textarea, caretIndex) {
  const style = window.getComputedStyle(textarea)
  const div = document.createElement('div')
  const mirroredProps = [
    'boxSizing',
    'width',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
  ]
  mirroredProps.forEach((prop) => {
    div.style[prop] = style[prop]
  })
  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.whiteSpace = 'pre-wrap'
  div.style.wordWrap = 'break-word'
  div.style.top = '0'
  div.style.left = '-9999px'
  div.style.height = 'auto'

  div.textContent = textarea.value.slice(0, caretIndex)
  const marker = document.createElement('span')
  marker.textContent = textarea.value.slice(caretIndex, caretIndex + 1) || '.'
  div.appendChild(marker)
  document.body.appendChild(div)

  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2
  const top = marker.offsetTop - textarea.scrollTop + lineHeight
  const left = marker.offsetLeft - textarea.scrollLeft

  document.body.removeChild(div)
  return { top, left }
}

const LinkAwareTextarea = forwardRef(function LinkAwareTextarea(
  { value, onChange, notes, folders, className, placeholder },
  forwardedRef,
) {
  const textareaRef = useRef(null)
  const pendingSelectionRef = useRef(null)
  useImperativeHandle(forwardedRef, () => textareaRef.current)
  const [linkCtx, setLinkCtx] = useState(null)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [caretPos, setCaretPos] = useState({ top: 0, left: 0 })

  const matches = useMemo(() => {
    if (!linkCtx) return []
    const query = linkCtx.query.trim().toLowerCase()
    const pool = query ? notes.filter((note) => note.title.toLowerCase().includes(query)) : notes
    return pool.slice(0, 50)
  }, [linkCtx, notes])

  useLayoutEffect(() => {
    const el = textareaRef.current
    if (pendingSelectionRef.current !== null && el) {
      const pos = pendingSelectionRef.current
      pendingSelectionRef.current = null
      el.selectionStart = pos
      el.selectionEnd = pos
      syncLinkContext(el)
    }
  })

  function syncLinkContext(el) {
    const ctx = findLinkContext(el.value, el.selectionStart)
    setLinkCtx(ctx)
    setHighlightIndex(0)
    if (ctx) {
      setCaretPos(measureCaretPosition(el, el.selectionStart))
    }
  }

  function handleChange(e) {
    onChange(e.target.value)
  }

  function handleSelect(e) {
    syncLinkContext(e.target)
  }

  function handleKeyDown(e) {
    const el = e.target

    if (e.key === '[' && el.selectionStart === el.selectionEnd) {
      const { selectionStart, value: text } = el
      if (selectionStart > 0 && text[selectionStart - 1] === '[') {
        e.preventDefault()
        const newValue = text.slice(0, selectionStart) + '[]]' + text.slice(selectionStart)
        onChange(newValue)
        pendingSelectionRef.current = selectionStart + 1
        return
      }
    }

    if (linkCtx) {
      if (e.key === 'ArrowDown' && matches.length > 0) {
        e.preventDefault()
        setHighlightIndex((i) => (i + 1) % matches.length)
        return
      }
      if (e.key === 'ArrowUp' && matches.length > 0) {
        e.preventDefault()
        setHighlightIndex((i) => (i - 1 + matches.length) % matches.length)
        return
      }
      if (e.key === 'Enter' && matches.length > 0) {
        e.preventDefault()
        selectMatch(matches[highlightIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setLinkCtx(null)
      }
    }
  }

  function selectMatch(note) {
    const el = textareaRef.current
    if (!linkCtx || !note || !el) return
    const before = el.value.slice(0, linkCtx.queryStart)
    const after = el.value.slice(linkCtx.end)
    const newValue = `${before}${note.title}]]${after}`
    onChange(newValue)
    pendingSelectionRef.current = before.length + note.title.length + 2
    setLinkCtx(null)
  }

  return (
    <div className="link-aware-textarea-wrapper">
      <textarea
        ref={textareaRef}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        onScroll={(e) => linkCtx && syncLinkContext(e.target)}
        onBlur={() => setTimeout(() => setLinkCtx(null), 150)}
      />
      {linkCtx && (
        <ul className="link-autocomplete" style={{ top: caretPos.top, left: caretPos.left }}>
          {matches.length === 0 ? (
            <li className="link-autocomplete-empty">No matching notes</li>
          ) : (
            matches.map((note, idx) => (
              <li
                key={note.id}
                className={`link-autocomplete-item${idx === highlightIndex ? ' active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectMatch(note)
                }}
                onMouseEnter={() => setHighlightIndex(idx)}
              >
                <span className="link-autocomplete-title">{note.title}</span>
                <span className="link-autocomplete-path">{folderPathLabel(folders, note.folderId)}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
})

export default LinkAwareTextarea
