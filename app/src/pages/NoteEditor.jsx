import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getFolderPath, useNotes } from '../context/NotesContext.jsx'
import { validateFilename } from '../utils/filename.js'
import { renderMarkdown } from '../utils/markdown.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import LinkAwareTextarea from '../components/LinkAwareTextarea.jsx'
import LiveMarkdownEditor from '../components/LiveMarkdownEditor.jsx'
import './NoteEditor.css'

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function SplitViewIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="8" height="16" rx="1" />
      <rect x="13" y="4" width="8" height="16" rx="1" />
    </svg>
  )
}

function CodeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 3 12 9 6" />
      <polyline points="15 6 21 12 15 18" />
    </svg>
  )
}

function LivePreviewIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function TableIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="9" y1="4" x2="9" y2="20" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.5-1.5" />
    </svg>
  )
}

export default function NoteEditor() {
  const { noteId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { notes, folders, addNote, updateNote, deleteNote, focusFolder } = useNotes()

  const existingNote = noteId ? notes.find((note) => note.id === noteId) : null
  const folderPath = getFolderPath(folders, existingNote?.folderId ?? location.state?.folderId ?? null)

  const [title, setTitle] = useState(existingNote?.title ?? '')
  const [content, setContent] = useState(existingNote?.content ?? '')
  const [error, setError] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [viewMode, setViewMode] = useState('live')
  const titleInputRef = useRef(null)
  const editorRef = useRef(null)
  const pendingSelectionRef = useRef(null)

  useEffect(() => {
    if (!noteId) {
      titleInputRef.current?.focus()
    }
    // location.key is unique per navigation, so this also refires when
    // clicking "New Note" again while already on the new-note screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, location.key])

  useEffect(() => {
    if (noteId && !existingNote) {
      // The route points to a note that no longer exists (including one
      // deleted indirectly, e.g. via a folder delete while it was open).
      navigate('/', { replace: true })
    }
  }, [noteId, existingNote, navigate])

  useEffect(() => {
    setTitle(existingNote?.title ?? '')
    setContent(existingNote?.content ?? '')
    setError(null)
    // Only re-sync when navigating to a different note - not on every
    // context update - so in-progress edits aren't clobbered after a save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId])

  useLayoutEffect(() => {
    const el = editorRef.current
    if (pendingSelectionRef.current && el) {
      const { start, end } = pendingSelectionRef.current
      pendingSelectionRef.current = null
      el.focus()
      el.setSelectionRange(start, end)
    }
  })

  // Wraps the current selection in `open`/`close` (e.g. "**" for bold), or
  // unwraps it if the selection is already wrapped - toggling either the
  // exact markers around the selection or markers included in the selection
  // itself, so re-clicking a button undoes it.
  function wrapSelection(open, close) {
    const el = editorRef.current
    if (!el) return
    const { selectionStart: start, selectionEnd: end, value } = el
    const before = value.slice(0, start)
    const after = value.slice(end)
    const selected = value.slice(start, end)

    const hasOuterWrap = before.endsWith(open) && after.startsWith(close)
    const hasInnerWrap =
      selected.length >= open.length + close.length && selected.startsWith(open) && selected.endsWith(close)

    let newValue
    let newStart
    let newEnd

    if (hasOuterWrap) {
      newValue = before.slice(0, before.length - open.length) + selected + after.slice(close.length)
      newStart = start - open.length
      newEnd = end - open.length
    } else if (hasInnerWrap) {
      const inner = selected.slice(open.length, selected.length - close.length)
      newValue = before + inner + after
      newStart = start
      newEnd = start + inner.length
    } else {
      newValue = `${before}${open}${selected}${close}${after}`
      newStart = selected.length === 0 ? start + open.length : start
      newEnd = selected.length === 0 ? newStart : end + open.length + close.length
    }

    setContent(newValue)
    pendingSelectionRef.current = { start: newStart, end: newEnd }
  }

  // Toggles a "## " heading prefix on the line the selection starts in.
  function toggleHeading() {
    const el = editorRef.current
    if (!el) return
    const { selectionStart: start, selectionEnd: end, value } = el
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const lineEndSearch = value.indexOf('\n', end)
    const lineEnd = lineEndSearch === -1 ? value.length : lineEndSearch
    const line = value.slice(lineStart, lineEnd)
    const prefix = '## '

    let newLine
    let delta
    if (line.startsWith(prefix)) {
      newLine = line.slice(prefix.length)
      delta = -prefix.length
    } else {
      newLine = prefix + line
      delta = prefix.length
    }

    setContent(value.slice(0, lineStart) + newLine + value.slice(lineEnd))
    pendingSelectionRef.current = {
      start: Math.max(lineStart, start + delta),
      end: Math.max(lineStart, end + delta),
    }
  }

  // Inserts a 2x2 table (with the top row formatted as a header) at the
  // current caret, padding it with blank lines so it starts life as its own
  // block - otherwise renderMarkdown's block parser could fuse it into a
  // preceding/following paragraph.
  function insertTable() {
    const el = editorRef.current
    if (!el) return
    const { selectionStart: start, selectionEnd: end, value } = el
    const before = value.slice(0, start)
    const after = value.slice(end)
    const table = ['| Header 1 | Header 2 |', '| --- | --- |', '| Cell 1 | Cell 2 |', '| Cell 3 | Cell 4 |'].join('\n')

    const prefix = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
    const suffix = after === '' || after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n'
    const insertion = `${prefix}${table}${suffix}`

    setContent(before + insertion + after)
    const caret = before.length + insertion.length
    pendingSelectionRef.current = { start: caret, end: caret }
  }

  // Rewrites the [startLine, endLine] raw-line range a table occupies with
  // its updated markdown, used by MarkdownTable in the rendered preview to
  // persist row/column/sort edits back into the note.
  function handleTableChange(startLine, endLine, newTableLines) {
    const lines = content.split('\n')
    const updated = [...lines.slice(0, startLine), ...newTableLines, ...lines.slice(endLine + 1)]
    setContent(updated.join('\n'))
  }

  function handleSave() {
    const result = validateFilename(title)
    if (!result.valid) {
      setError(result.error)
      return
    }

    const trimmedTitle = title.trim()
    const targetFolderId = existingNote ? existingNote.folderId : location.state?.folderId ?? null
    const isDuplicate = notes.some(
      (note) =>
        note.folderId === targetFolderId &&
        note.id !== existingNote?.id &&
        note.title.trim().toLowerCase() === trimmedTitle.toLowerCase(),
    )
    if (isDuplicate) {
      setError('A note with this title already exists in this folder.')
      return
    }
    setError(null)

    if (existingNote) {
      updateNote(existingNote.id, trimmedTitle, content)
    } else {
      const created = addNote(trimmedTitle, content, targetFolderId)
      navigate(`/notes/${created.id}`, { replace: true })
    }
  }

  function handleDeleteConfirmed() {
    deleteNote(existingNote.id)
    setConfirmingDelete(false)
    navigate('/')
  }

  return (
    <main className="note-editor">
      <nav className="note-breadcrumb" aria-label="Note location">
        {folderPath.map((folder) => (
          <span key={folder.id} className="breadcrumb-segment">
            <button
              type="button"
              className="breadcrumb-link"
              onClick={() => focusFolder(folder.id)}
            >
              {folder.name}
            </button>
            <span className="breadcrumb-separator">/</span>
          </span>
        ))}
        <span className="breadcrumb-current">{title.trim() || 'Untitled Note'}</span>
      </nav>
      <input
        ref={titleInputRef}
        type="text"
        className="note-title-input"
        placeholder="Enter title here"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="note-editor-button-row">
        <div className="note-editor-actions">
          <button type="button" className="save-note-button" onClick={handleSave}>
            <SaveIcon />
            <span>Save Note</span>
          </button>
          {existingNote && (
            <button
              type="button"
              className="delete-note-button"
              onClick={() => setConfirmingDelete(true)}
            >
              <TrashIcon />
              <span>Delete Note</span>
            </button>
          )}
        </div>
        <div className="note-toolbar">
          <button type="button" className="note-toolbar-button" title="Bold" onClick={() => wrapSelection('**', '**')}>
            <b>B</b>
          </button>
          <button type="button" className="note-toolbar-button" title="Italic" onClick={() => wrapSelection('*', '*')}>
            <i>I</i>
          </button>
          <button type="button" className="note-toolbar-button" title="Heading" onClick={toggleHeading}>
            H2
          </button>
          <button type="button" className="note-toolbar-button" title="Code" onClick={() => wrapSelection('`', '`')}>
            <CodeIcon />
          </button>
          <button
            type="button"
            className="note-toolbar-button"
            title="Internal link"
            onClick={() => wrapSelection('[[', ']]')}
          >
            <LinkIcon />
          </button>
          <button type="button" className="note-toolbar-button" title="Insert table" onClick={insertTable}>
            <TableIcon />
          </button>
        </div>
        <div className="note-view-toggle">
          <button
            type="button"
            className={`view-toggle-button${viewMode === 'live' ? ' active' : ''}`}
            onClick={() => setViewMode('live')}
          >
            <LivePreviewIcon />
            <span>Live Preview</span>
          </button>
          <button
            type="button"
            className={`view-toggle-button${viewMode === 'preview' ? ' active' : ''}`}
            onClick={() => setViewMode('preview')}
          >
            <SplitViewIcon />
            <span>Side Preview</span>
          </button>
          <button
            type="button"
            className={`view-toggle-button${viewMode === 'markdown' ? ' active' : ''}`}
            onClick={() => setViewMode('markdown')}
          >
            <CodeIcon />
            <span>Markdown Edit</span>
          </button>
        </div>
      </div>
      {error && <p className="note-title-error">{error}</p>}
      {viewMode === 'markdown' ? (
        <LinkAwareTextarea
          ref={editorRef}
          className="note-editor-textarea"
          placeholder="Write your note in markdown... (type [[ to link another note)"
          value={content}
          onChange={setContent}
          notes={notes}
          folders={folders}
        />
      ) : viewMode === 'live' ? (
        <LiveMarkdownEditor
          ref={editorRef}
          placeholder="Write your note in markdown... (type [[ to link another note)"
          value={content}
          onChange={setContent}
          notes={notes}
          folders={folders}
          onNoteLinkClick={(id) => navigate(`/notes/${id}`)}
        />
      ) : (
        <div className="note-editor-split">
          <LinkAwareTextarea
            ref={editorRef}
            className="note-editor-textarea note-editor-textarea-split"
            placeholder="Write your note in markdown... (type [[ to link another note)"
            value={content}
            onChange={setContent}
            notes={notes}
            folders={folders}
          />
          <div className="note-editor-preview">
            {content.trim() ? (
              renderMarkdown(content, {
                notes,
                onNoteLinkClick: (id) => navigate(`/notes/${id}`),
                onTableChange: handleTableChange,
              })
            ) : (
              <p className="note-editor-preview-empty">Nothing to preview yet.</p>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmingDelete}
        title="Delete note?"
        message={`Are you sure you want to delete "${existingNote?.title}"? This can't be undone.`}
        confirmLabel="Yes, delete note"
        cancelLabel="No, keep note"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmingDelete(false)}
      />
    </main>
  )
}
