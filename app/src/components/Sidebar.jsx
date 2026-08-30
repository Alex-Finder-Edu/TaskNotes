import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useNotes } from '../context/NotesContext.jsx'
import { validateFilename } from '../utils/filename.js'
import { readDragPayload, setDragPayload } from '../utils/dnd.js'
import ConfirmModal from './ConfirmModal.jsx'
import './Sidebar.css'

const MIN_SIDEBAR_WIDTH = 220

function FolderPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  )
}

function NotePlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <line x1="12" y1="12" x2="12" y2="18" />
      <line x1="9" y1="15" x2="15" y2="15" />
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

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function RenameField({ value, onCommit, onCancel }) {
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState(null)

  function commit() {
    const result = validateFilename(draft)
    if (!result.valid) {
      setError(result.error)
      return
    }
    onCommit(draft.trim())
  }

  return (
    <div className="sidebar-rename" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        className="sidebar-rename-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') onCancel()
        }}
        onBlur={commit}
      />
      {error && <p className="sidebar-rename-error">{error}</p>}
    </div>
  )
}

function NoteRow({ note }) {
  const { renameNote, deleteNote } = useNotes()
  const location = useLocation()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function handleDeleteConfirmed() {
    deleteNote(note.id)
    setConfirmingDelete(false)
    if (location.pathname === `/notes/${note.id}`) {
      navigate('/')
    }
  }

  return (
    <div className="tree-node">
      <div
        className="sidebar-item"
        draggable={!editing}
        onDragStart={(e) => {
          e.stopPropagation()
          setDragPayload(e, 'note', note.id)
        }}
      >
        <span className="tree-toggle-spacer" />
        {editing ? (
          <div className="sidebar-row-main">
            <NoteIcon />
            <RenameField
              value={note.title}
              onCommit={(title) => {
                renameNote(note.id, title)
                setEditing(false)
              }}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <NavLink
            to={`/notes/${note.id}`}
            title={note.title}
            className={({ isActive }) =>
              `sidebar-row-main sidebar-note${isActive ? ' active' : ''}`
            }
          >
            <NoteIcon />
            <span>{note.title}</span>
          </NavLink>
        )}
        <div className="sidebar-row-actions">
          <button type="button" className="icon-button" title="Rename note" onClick={() => setEditing(true)}>
            <PencilIcon />
          </button>
          <button
            type="button"
            className="icon-button"
            title="Delete note"
            onClick={() => setConfirmingDelete(true)}
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmingDelete}
        title="Delete note?"
        message={`Are you sure you want to delete "${note.title}"? This can't be undone.`}
        confirmLabel="Yes, delete"
        cancelLabel="No, keep"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  )
}

function FolderNode({ folder, autoEditId, onAutoEditConsumed }) {
  const {
    folders,
    notes,
    renameFolder,
    deleteFolder,
    moveFolder,
    moveNote,
    toggleFolderCollapsed,
    selectedFolderIds,
    selectFolder,
  } = useNotes()
  const [editing, setEditing] = useState(folder.id === autoEditId)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (folder.id === autoEditId) {
      onAutoEditConsumed()
    }
    // Only consult the auto-edit id on mount - a freshly created folder is
    // the only one whose id can match, and it always mounts fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const childFolders = folders.filter((f) => f.parentId === folder.id)
  const childNotes = notes.filter((n) => n.folderId === folder.id)
  const hasChildren = childFolders.length > 0 || childNotes.length > 0
  const isSelected = selectedFolderIds.includes(folder.id)

  function handleNameClick(e) {
    selectFolder(folder.id, { shift: e.shiftKey })
    if (!e.shiftKey) {
      toggleFolderCollapsed(folder.id)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const payload = readDragPayload(e)
    if (!payload) return
    if (payload.type === 'folder' && payload.id !== folder.id) {
      moveFolder(payload.id, folder.id)
    } else if (payload.type === 'note') {
      moveNote(payload.id, folder.id)
    }
  }

  return (
    <div className="tree-node">
      <div
        className={`sidebar-item sidebar-folder-row${isSelected ? ' active' : ''}${dragOver ? ' drag-over' : ''}`}
        draggable={!editing}
        onDragStart={(e) => {
          e.stopPropagation()
          setDragPayload(e, 'folder', folder.id)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          e.dataTransfer.dropEffect = 'move'
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.stopPropagation()
          setDragOver(false)
        }}
        onDrop={handleDrop}
      >
        {hasChildren ? (
          <button
            type="button"
            className="tree-toggle"
            title={folder.collapsed ? 'Expand folder' : 'Collapse folder'}
            onClick={() => toggleFolderCollapsed(folder.id)}
          >
            {folder.collapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
          </button>
        ) : (
          <span className="tree-toggle-spacer" />
        )}

        {editing ? (
          <div className="sidebar-row-main">
            <FolderIcon />
            <RenameField
              value={folder.name}
              onCommit={(name) => {
                renameFolder(folder.id, name)
                setEditing(false)
              }}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <button type="button" className="sidebar-row-main" title={folder.name} onClick={handleNameClick}>
            <FolderIcon />
            <span>{folder.name}</span>
          </button>
        )}

        <div className="sidebar-row-actions">
          <button type="button" className="icon-button" title="Rename folder" onClick={() => setEditing(true)}>
            <PencilIcon />
          </button>
          <button
            type="button"
            className="icon-button"
            title="Delete folder"
            onClick={() => setConfirmingDelete(true)}
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {!folder.collapsed && hasChildren && (
        <div className="tree-children">
          {childFolders.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              autoEditId={autoEditId}
              onAutoEditConsumed={onAutoEditConsumed}
            />
          ))}
          {childNotes.map((note) => (
            <NoteRow key={note.id} note={note} />
          ))}
        </div>
      )}

      <ConfirmModal
        open={confirmingDelete}
        title="Delete folder?"
        message={`Are you sure you want to delete "${folder.name}" and everything inside it? This can't be undone.`}
        confirmLabel="Yes, delete"
        cancelLabel="No, keep"
        onConfirm={() => {
          deleteFolder(folder.id)
          setConfirmingDelete(false)
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  )
}

export default function Sidebar() {
  const {
    notes,
    folders,
    addFolder,
    selectedFolderId,
    selectedFolderIds,
    deleteFolders,
    expandFolders,
    moveFolder,
    moveNote,
  } = useNotes()
  const navigate = useNavigate()
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false)
  const [widthOverride, setWidthOverride] = useState(null)
  const [pendingEditFolderId, setPendingEditFolderId] = useState(null)
  const draggingRef = useRef(false)

  useEffect(() => {
    const root = document.documentElement
    if (widthOverride === null) {
      root.style.removeProperty('--sidebar-width')
    } else {
      root.style.setProperty('--sidebar-width', `${widthOverride}px`)
    }
  }, [widthOverride])

  useEffect(() => {
    function handleMouseMove(e) {
      if (!draggingRef.current) return
      const maxWidth = window.innerWidth * 0.85
      const next = Math.min(Math.max(e.clientX, MIN_SIDEBAR_WIDTH), maxWidth)
      setWidthOverride(next)
    }
    function handleMouseUp() {
      draggingRef.current = false
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  function handleNewFolder() {
    if (selectedFolderId) {
      expandFolders(new Set([selectedFolderId]))
    }
    const newId = addFolder(selectedFolderId)
    setPendingEditFolderId(newId)
  }

  function handleNewNote() {
    if (selectedFolderId) {
      expandFolders(new Set([selectedFolderId]))
    }
    navigate('/notes/new', { state: { folderId: selectedFolderId } })
  }

  function handleRootDrop(e) {
    e.preventDefault()
    const payload = readDragPayload(e)
    if (!payload) return
    if (payload.type === 'folder') moveFolder(payload.id, null)
    else if (payload.type === 'note') moveNote(payload.id, null)
  }

  const rootFolders = folders.filter((folder) => folder.parentId === null)
  const rootNotes = notes.filter((note) => note.folderId === null)

  return (
    <aside className="sidebar">
      <div className="sidebar-actions">
        <button type="button" className="sidebar-action-button" onClick={handleNewFolder}>
          <FolderPlusIcon />
          New Folder
        </button>
        <button type="button" className="sidebar-action-button" onClick={handleNewNote}>
          <NotePlusIcon />
          New Note
        </button>
        {selectedFolderIds.length > 1 && (
          <button
            type="button"
            className="sidebar-action-button sidebar-delete-selected-button"
            onClick={() => setConfirmingBulkDelete(true)}
          >
            <TrashIcon />
            {`Delete ${selectedFolderIds.length} selected folders`}
          </button>
        )}
      </div>

      <div
        className="sidebar-list"
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
        }}
        onDrop={handleRootDrop}
      >
        {rootFolders.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            autoEditId={pendingEditFolderId}
            onAutoEditConsumed={() => setPendingEditFolderId(null)}
          />
        ))}

        {rootNotes.map((note) => (
          <NoteRow key={note.id} note={note} />
        ))}

        {rootFolders.length === 0 && rootNotes.length === 0 && (
          <p className="sidebar-empty">No notes or folders yet.</p>
        )}
      </div>

      <div
        className="sidebar-resize-handle"
        onMouseDown={(e) => {
          e.preventDefault()
          draggingRef.current = true
        }}
        onDoubleClick={() => setWidthOverride(null)}
        title="Drag to resize, double-click to reset"
      />

      <ConfirmModal
        open={confirmingBulkDelete}
        title="Delete selected folders?"
        message={`Are you sure you want to delete ${selectedFolderIds.length} selected folders and everything inside them? This can't be undone.`}
        confirmLabel="Yes, delete"
        cancelLabel="No, keep"
        onConfirm={() => {
          deleteFolders(selectedFolderIds)
          setConfirmingBulkDelete(false)
        }}
        onCancel={() => setConfirmingBulkDelete(false)}
      />
    </aside>
  )
}
