import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getFolderPath } from '../context/NotesContext.jsx'
import { findLinkContext } from '../utils/linkContext.js'
import { domPositionToRawOffset, rawOffsetToDomPosition, getLineIndexForOffset } from '../utils/domOffset.js'
import { computeFenceStates, decorateLine } from '../utils/liveMarkdownDecorate.jsx'
import './LinkAwareTextarea.css'
import './LiveMarkdownEditor.css'

function folderPathLabel(folders, folderId) {
  const path = getFolderPath(folders, folderId)
  return path.length ? path.map((folder) => folder.name).join(' / ') : 'Root'
}

// An Obsidian-style "live preview" markdown editor: a single contentEditable
// surface where every line renders as formatted markdown, except the line
// the caret is currently on (or a line with an active selection touching
// it), which renders as plain raw text so its markdown syntax is visible
// and editable.
//
// All edits go through `beforeinput` (never native contentEditable DOM
// mutation) so the raw string in `value` stays the single source of truth;
// see utils/domOffset.js for how caret/selection positions round-trip
// between that raw string and the rendered DOM.
const LiveMarkdownEditor = forwardRef(function LiveMarkdownEditor(
  { value, onChange, notes, folders, placeholder, onNoteLinkClick },
  forwardedRef,
) {
  const rootRef = useRef(null)
  const wrapperRef = useRef(null)
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  const selectionStartRef = useRef(0)
  const selectionEndRef = useRef(0)
  const pendingSelectionRef = useRef(null)
  const blurTimeoutRef = useRef(null)
  const lastLinkKeyRef = useRef(null)
  const lastCaretPosRef = useRef({ top: 0, left: 0 })

  const [activeLineIndex, setActiveLineIndex] = useState(null)
  const [linkCtx, setLinkCtx] = useState(null)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [caretPos, setCaretPos] = useState({ top: 0, left: 0 })

  valueRef.current = value
  onChangeRef.current = onChange

  const linkContext = useMemo(() => ({ notes, onNoteLinkClick }), [notes, onNoteLinkClick])

  const matches = useMemo(() => {
    if (!linkCtx) return []
    const query = linkCtx.query.trim().toLowerCase()
    const pool = query ? notes.filter((note) => note.title.toLowerCase().includes(query)) : notes
    return pool.slice(0, 50)
  }, [linkCtx, notes])

  function setActiveLineFromOffset(offset) {
    const lineIndex = getLineIndexForOffset(valueRef.current, offset)
    setActiveLineIndex((prev) => (prev === lineIndex ? prev : lineIndex))
  }

  function applySelection(start, end) {
    const root = rootRef.current
    if (!root) return
    const startPos = rawOffsetToDomPosition(root, start)
    const endPos = start === end ? startPos : rawOffsetToDomPosition(root, end)
    const range = document.createRange()
    range.setStart(startPos.node, startPos.offset)
    range.setEnd(endPos.node, endPos.offset)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    selectionStartRef.current = start
    selectionEndRef.current = end
    setActiveLineFromOffset(start)
  }

  useImperativeHandle(
    forwardedRef,
    () => ({
      get value() {
        return valueRef.current
      },
      get selectionStart() {
        return selectionStartRef.current
      },
      get selectionEnd() {
        return selectionEndRef.current
      },
      focus() {
        rootRef.current?.focus()
      },
      // Called by the parent (e.g. the toolbar's wrapSelection) after it has
      // already committed a new `value` and re-rendered us, so the DOM here
      // already reflects that value - apply the selection immediately rather
      // than deferring, unlike the pendingSelectionRef path used internally
      // for edits originating in this component (see handleBeforeInput).
      setSelectionRange(start, end) {
        applySelection(start, end)
      },
    }),
    [],
  )

  // Re-run after every render (see the useLayoutEffect below), so every
  // field written here must be compared against its last value first -
  // unconditionally calling setState with a fresh object/array each time
  // would re-render forever.
  function updateLinkContextAndCaretRect() {
    const root = rootRef.current
    const wrapper = wrapperRef.current
    if (!root || !wrapper) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !root.contains(sel.anchorNode)) {
      if (lastLinkKeyRef.current !== null) {
        lastLinkKeyRef.current = null
        setLinkCtx(null)
      }
      return
    }
    const ctx = findLinkContext(valueRef.current, selectionStartRef.current)
    const key = ctx ? `${ctx.queryStart}-${ctx.end}-${ctx.query}` : null
    if (key !== lastLinkKeyRef.current) {
      lastLinkKeyRef.current = key
      setLinkCtx(ctx)
      setHighlightIndex(0)
    }
    if (ctx) {
      const range = sel.getRangeAt(0).cloneRange()
      range.collapse(true)
      const rect = range.getBoundingClientRect()
      const wrapperRect = wrapper.getBoundingClientRect()
      const top = rect.bottom - wrapperRect.top + wrapper.scrollTop
      const left = rect.left - wrapperRect.left + wrapper.scrollLeft
      const prev = lastCaretPosRef.current
      if (prev.top !== top || prev.left !== left) {
        lastCaretPosRef.current = { top, left }
        setCaretPos({ top, left })
      }
    }
  }

  useLayoutEffect(() => {
    if (pendingSelectionRef.current) {
      const { start, end } = pendingSelectionRef.current
      pendingSelectionRef.current = null
      applySelection(start, end)
    }
    updateLinkContextAndCaretRect()
  })

  useEffect(() => {
    function handleSelectionChange() {
      const root = rootRef.current
      if (!root) return
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      if (!root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) return
      const anchor = domPositionToRawOffset(root, sel.anchorNode, sel.anchorOffset)
      const focus = domPositionToRawOffset(root, sel.focusNode, sel.focusOffset)
      selectionStartRef.current = Math.min(anchor, focus)
      selectionEndRef.current = Math.max(anchor, focus)
      setActiveLineFromOffset(selectionStartRef.current)
      updateLinkContextAndCaretRect()
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  function handleBeforeInput(e) {
    if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') {
      e.preventDefault()
      return
    }
    e.preventDefault()
    const root = rootRef.current
    if (!root) return

    // Deliberately not using e.getTargetRanges(): Chrome computes it from
    // rendered geometry, and a hidden (display:none) md-syntax span has no
    // box - so a backspace that merges two lines can resolve its target
    // range to just after the last *visible* character, silently dropping
    // any hidden markdown syntax at the end of the previous line. Our own
    // tracked offsets are computed from textContent length instead (see
    // domOffset.js), so hidden characters are never lost.
    const from = Math.min(selectionStartRef.current, selectionEndRef.current)
    const to = Math.max(selectionStartRef.current, selectionEndRef.current)

    const text = valueRef.current
    let newValue = text
    let newCaret = from

    switch (e.inputType) {
      case 'insertText':
      case 'insertCompositionText': {
        const insert = e.data ?? ''
        newValue = text.slice(0, from) + insert + text.slice(to)
        newCaret = from + insert.length
        break
      }
      case 'insertParagraph':
      case 'insertLineBreak': {
        newValue = text.slice(0, from) + '\n' + text.slice(to)
        newCaret = from + 1
        break
      }
      case 'insertReplacementText': {
        const insert = e.dataTransfer ? e.dataTransfer.getData('text/plain') : (e.data ?? '')
        newValue = text.slice(0, from) + insert + text.slice(to)
        newCaret = from + insert.length
        break
      }
      case 'deleteContentBackward': {
        if (from === to) {
          if (from === 0) return
          newValue = text.slice(0, from - 1) + text.slice(to)
          newCaret = from - 1
        } else {
          newValue = text.slice(0, from) + text.slice(to)
          newCaret = from
        }
        break
      }
      case 'deleteContentForward': {
        if (from === to) {
          if (from >= text.length) return
          newValue = text.slice(0, from) + text.slice(to + 1)
          newCaret = from
        } else {
          newValue = text.slice(0, from) + text.slice(to)
          newCaret = from
        }
        break
      }
      case 'deleteWordBackward':
      case 'deleteWordForward':
      case 'deleteEntireSoftLine':
      case 'deleteHardLineBackward':
      case 'deleteHardLineForward':
      case 'deleteContent':
      case 'deleteByCut': {
        if (from === to) return
        newValue = text.slice(0, from) + text.slice(to)
        newCaret = from
        break
      }
      default:
        return
    }

    onChangeRef.current(newValue)
    pendingSelectionRef.current = { start: newCaret, end: newCaret }
  }

  function handlePaste(e) {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    if (!text) return
    const from = Math.min(selectionStartRef.current, selectionEndRef.current)
    const to = Math.max(selectionStartRef.current, selectionEndRef.current)
    const current = valueRef.current
    const newValue = current.slice(0, from) + text + current.slice(to)
    onChangeRef.current(newValue)
    pendingSelectionRef.current = { start: from + text.length, end: from + text.length }
  }

  // React's synthetic onBeforeInput does not reliably fire for edits made
  // inside a contentEditable element, so these are wired up as native
  // listeners instead - re-attached after every render so they always close
  // over the latest state (linkCtx, matches, highlightIndex) they read.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    root.addEventListener('beforeinput', handleBeforeInput)
    root.addEventListener('paste', handlePaste)
    return () => {
      root.removeEventListener('beforeinput', handleBeforeInput)
      root.removeEventListener('paste', handlePaste)
    }
  })

  function handleKeyDown(e) {
    if (e.key === '[') {
      const start = selectionStartRef.current
      const end = selectionEndRef.current
      if (start === end && start > 0 && valueRef.current[start - 1] === '[') {
        e.preventDefault()
        const text = valueRef.current
        const newValue = text.slice(0, start) + '[]]' + text.slice(start)
        onChangeRef.current(newValue)
        pendingSelectionRef.current = { start: start + 1, end: start + 1 }
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
    if (!linkCtx || !note) return
    const current = valueRef.current
    const before = current.slice(0, linkCtx.queryStart)
    const after = current.slice(linkCtx.end)
    const newValue = `${before}${note.title}]]${after}`
    onChangeRef.current(newValue)
    pendingSelectionRef.current = { start: before.length + note.title.length + 2, end: before.length + note.title.length + 2 }
    setLinkCtx(null)
  }

  function handleFocus() {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
  }

  function handleBlur() {
    blurTimeoutRef.current = setTimeout(() => {
      setActiveLineIndex(null)
      setLinkCtx(null)
    }, 150)
  }

  const lines = value.split('\n')
  const fenceStates = computeFenceStates(lines)

  return (
    <div className="live-markdown-wrapper" ref={wrapperRef}>
      <div
        ref={rootRef}
        className="live-markdown-editor"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {lines.map((lineText, i) => {
          const isActive = i === activeLineIndex
          const fenceState = fenceStates[i]
          let className = 'lp-line'
          let content
          let marker

          if (isActive) {
            content = lineText
            if (fenceState.insideFence || fenceState.isFenceDelimiter) className += ' lp-code-line'
          } else if (fenceState.isFenceDelimiter) {
            className += ' lp-fence-line'
            content = lineText
          } else if (fenceState.insideFence) {
            className += ' lp-code-line'
            content = lineText
          } else {
            const decorated = decorateLine(lineText, `l${i}`, linkContext)
            className += ` ${decorated.className}`
            content = decorated.content
            marker = decorated.marker
          }

          return (
            <div key={i} className={className} data-marker={marker}>
              {lineText === '' ? <br /> : content}
            </div>
          )
        })}
      </div>
      {value === '' && placeholder && <div className="live-markdown-placeholder">{placeholder}</div>}
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

export default LiveMarkdownEditor
