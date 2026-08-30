import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useNotes } from '../context/NotesContext.jsx'
import { validateFilename } from '../utils/filename.js'
import ConfirmModal from '../components/ConfirmModal.jsx'
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

export default function NoteEditor() {
  const { noteId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { notes, addNote, updateNote, deleteNote } = useNotes()

  const existingNote = noteId ? notes.find((note) => note.id === noteId) : null

  const [title, setTitle] = useState(existingNote?.title ?? '')
  const [content, setContent] = useState(existingNote?.content ?? '')
  const [error, setError] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (noteId && !existingNote) {
      // The route points to a note that no longer exists.
      navigate('/', { replace: true })
      return
    }
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
    setError(null)

    if (existingNote) {
      updateNote(existingNote.id, title.trim(), content)
    } else {
      const created = addNote(title.trim(), content, location.state?.folderId ?? null)
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
      <div className="note-editor-header">
        <input
          type="text"
          className="note-title-input"
          placeholder="Enter title here"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
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
      {error && <p className="note-title-error">{error}</p>}
      <textarea
        className="note-editor-textarea"
        placeholder="Write your note in markdown..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

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
