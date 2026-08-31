import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getFolderPath, useNotes } from '../context/NotesContext.jsx'
import { validateFilename } from '../utils/filename.js'
import { renderMarkdown } from '../utils/markdown.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import LinkAwareTextarea from '../components/LinkAwareTextarea.jsx'
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
  const [viewMode, setViewMode] = useState('preview')
  const titleInputRef = useRef(null)

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
        <div className="note-view-toggle">
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
          className="note-editor-textarea"
          placeholder="Write your note in markdown... (type [[ to link another note)"
          value={content}
          onChange={setContent}
          notes={notes}
        />
      ) : (
        <div className="note-editor-split">
          <LinkAwareTextarea
            className="note-editor-textarea note-editor-textarea-split"
            placeholder="Write your note in markdown... (type [[ to link another note)"
            value={content}
            onChange={setContent}
            notes={notes}
          />
          <div className="note-editor-preview">
            {content.trim() ? (
              renderMarkdown(content, { notes, onNoteLinkClick: (id) => navigate(`/notes/${id}`) })
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
