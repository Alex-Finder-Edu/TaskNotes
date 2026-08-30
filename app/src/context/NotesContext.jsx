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

export function NotesProvider({ children }) {
  const [workspace, setWorkspace] = useState(loadInitialState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
    } catch {
      // storage unavailable (e.g. private browsing) - state stays in memory only
    }
  }, [workspace])

  function addNote(title, content) {
    const note = {
      id: crypto.randomUUID(),
      title,
      content,
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

  function addFolder() {
    setWorkspace((prev) => {
      const baseName = 'New Folder'
      const existingNames = new Set(prev.folders.map((folder) => folder.name))
      let name = baseName
      let suffix = 1
      while (existingNames.has(name)) {
        name = `${baseName} ${suffix}`
        suffix += 1
      }
      return { ...prev, folders: [...prev.folders, { id: crypto.randomUUID(), name }] }
    })
  }

  return (
    <NotesContext.Provider
      value={{
        notes: workspace.notes,
        folders: workspace.folders,
        addNote,
        updateNote,
        addFolder,
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
