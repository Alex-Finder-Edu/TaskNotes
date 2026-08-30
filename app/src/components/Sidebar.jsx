import { NavLink } from 'react-router-dom'
import { useNotes } from '../context/NotesContext.jsx'
import './Sidebar.css'

function FolderPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  )
}

function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  )
}

export default function Sidebar() {
  const { notes, folders, addFolder } = useNotes()

  return (
    <aside className="sidebar">
      <button type="button" className="new-folder-button" onClick={addFolder}>
        <FolderPlusIcon />
        New Folder
      </button>

      <div className="sidebar-list">
        {folders.map((folder) => (
          <div key={folder.id} className="sidebar-item">
            <FolderIcon />
            <span>{folder.name}</span>
          </div>
        ))}

        {notes.map((note) => (
          <NavLink
            key={note.id}
            to={`/notes/${note.id}`}
            title={note.title}
            className={({ isActive }) =>
              `sidebar-item sidebar-note${isActive ? ' active' : ''}`
            }
          >
            <NoteIcon />
            <span>{note.title}</span>
          </NavLink>
        ))}

        {folders.length === 0 && notes.length === 0 && (
          <p className="sidebar-empty">No notes or folders yet.</p>
        )}
      </div>
    </aside>
  )
}
