import { createContext, useContext, useEffect, useState } from 'react'

const NotesContext = createContext(null)
const STORAGE_KEY = 'notetasks.workspace'

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // localStorage unavailable or corrupted - fall back to an empty workspace
  }
  return { notes: [], folders: [] }
}

function collectFolderAndDescendantIds(folders, id) {
  const ids = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const folder of folders) {
      if (ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id)
        grew = true
      }
    }
  }
  return ids
}

export function NotesProvider({ children }) {
  const [workspace, setWorkspace] = useState(loadInitialState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
    } catch {
      // storage unavailable (e.g. private browsing) - state stays in memory only
    }
  }, [workspace])

  function addNote(title, content, folderId = null) {
    const note = {
      id: crypto.randomUUID(),
      title,
      content,
      folderId,
      createdAt: Date.now(),
    }
    setWorkspace((prev) => ({ ...prev, notes: [...prev.notes, note] }))
    return note
  }

  function updateNote(id, title, content) {
    setWorkspace((prev) => ({
      ...prev,
      notes: prev.notes.map((note) =>
        note.id === id ? { ...note, title, content } : note,
      ),
    }))
  }

  function renameNote(id, title) {
    setWorkspace((prev) => ({
      ...prev,
      notes: prev.notes.map((note) => (note.id === id ? { ...note, title } : note)),
    }))
  }

  function deleteNote(id) {
    setWorkspace((prev) => ({ ...prev, notes: prev.notes.filter((note) => note.id !== id) }))
  }

  function addFolder(parentId = null) {
    setWorkspace((prev) => {
      const baseName = 'New Folder'
      const siblingNames = new Set(
        prev.folders.filter((folder) => folder.parentId === parentId).map((folder) => folder.name),
      )
      let name = baseName
      let suffix = 1
      while (siblingNames.has(name)) {
        name = `${baseName} ${suffix}`
        suffix += 1
      }
      const folder = { id: crypto.randomUUID(), name, parentId, collapsed: false }
      return { ...prev, folders: [...prev.folders, folder] }
    })
  }

  function renameFolder(id, name) {
    setWorkspace((prev) => ({
      ...prev,
      folders: prev.folders.map((folder) => (folder.id === id ? { ...folder, name } : folder)),
    }))
  }

  function deleteFolder(id) {
    setWorkspace((prev) => {
      const idsToDelete = collectFolderAndDescendantIds(prev.folders, id)
      return {
        ...prev,
        folders: prev.folders.filter((folder) => !idsToDelete.has(folder.id)),
        notes: prev.notes.filter((note) => !idsToDelete.has(note.folderId)),
      }
    })
  }

  function toggleFolderCollapsed(id) {
    setWorkspace((prev) => ({
      ...prev,
      folders: prev.folders.map((folder) =>
        folder.id === id ? { ...folder, collapsed: !folder.collapsed } : folder,
      ),
    }))
  }

  return (
    <NotesContext.Provider
      value={{
        notes: workspace.notes,
        folders: workspace.folders,
        addNote,
        updateNote,
        renameNote,
        deleteNote,
        addFolder,
        renameFolder,
        deleteFolder,
        toggleFolderCollapsed,
      }}
    >
      {children}
    </NotesContext.Provider>
  )
}

export function useNotes() {
  const ctx = useContext(NotesContext)
  if (!ctx) {
    throw new Error('useNotes must be used within a NotesProvider')
  }
  return ctx
}
