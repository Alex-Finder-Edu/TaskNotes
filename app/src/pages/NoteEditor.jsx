import { useState } from 'react'
import { Link } from 'react-router-dom'
import './NoteEditor.css'

export default function NoteEditor() {
  const [content, setContent] = useState('')

  return (
    <main className="note-editor">
      <Link to="/" className="back-link">
        ← Back
      </Link>
      <textarea
        className="note-editor-textarea"
        placeholder="Write your note in markdown..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
    </main>
  )
}
