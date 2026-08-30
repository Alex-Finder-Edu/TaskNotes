import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useNotes } from '../context/NotesContext.jsx'
import { validateFilename } from '../utils/filename.js'
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

export default function NoteEditor() {
  const { noteId } = useParams()
  const navigate = useNavigate()
  const { notes, addNote, updateNote } = useNotes()

  const existingNote = noteId ? notes.find((note) => note.id === noteId) : null

  const [title, setTitle] = useState(existingNote?.title ?? '')
  const [content, setContent] = useState(existingNote?.content ?? '')
  const [error, setError] = useState(null)

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
      const created = addNote(title.trim(), content)
      navigate(`/notes/${created.id}`, { replace: true })
    }
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
      </div>
      {error && <p className="note-title-error">{error}</p>}
      <textarea
        className="note-editor-textarea"
        placeholder="Write your note in markdown..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
    </main>
  )
}
