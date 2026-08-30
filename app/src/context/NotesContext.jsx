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

function collectAncestorIds(folders, id) {
  const ids = new Set()
  let current = folders.find((folder) => folder.id === id)
  while (current) {
    ids.add(current.id)
    current = current.parentId ? folders.find((folder) => folder.id === current.parentId) : null
  }
  return ids
}

export function getFolderPath(folders, folderId) {
  const path = []
  let current = folderId ? folders.find((folder) => folder.id === folderId) : null
  while (current) {
    path.unshift(current)
    current = current.parentId ? folders.find((folder) => folder.id === current.parentId) : null
  }
  return path
}

export function NotesProvider({ children }) {
  const [workspace, setWorkspace] = useState(loadInitialState)
  const [selection, setSelection] = useState({ anchorId: null, selectedIds: [] })

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
    setSelection({ anchorId: null, selectedIds: [] })
  }

  function deleteFolders(ids) {
    setWorkspace((prev) => {
      let idsToDelete = new Set()
      for (const id of ids) {
        for (const descendantId of collectFolderAndDescendantIds(prev.folders, id)) {
          idsToDelete.add(descendantId)
        }
      }
      return {
        ...prev,
        folders: prev.folders.filter((folder) => !idsToDelete.has(folder.id)),
        notes: prev.notes.filter((note) => !idsToDelete.has(note.folderId)),
      }
    })
    setSelection({ anchorId: null, selectedIds: [] })
  }

  function toggleFolderCollapsed(id) {
    setWorkspace((prev) => ({
      ...prev,
      folders: prev.folders.map((folder) =>
        folder.id === id ? { ...folder, collapsed: !folder.collapsed } : folder,
      ),
    }))
  }

  function expandFolders(ids) {
    setWorkspace((prev) => ({
      ...prev,
      folders: prev.folders.map((folder) =>
        ids.has(folder.id) ? { ...folder, collapsed: false } : folder,
      ),
    }))
  }

  // Plain click selects a single folder (toggling it off if already the sole
  // selection). Shift-click extends the selection to every sibling between
  // the anchor (the last plain-clicked folder) and the clicked folder.
  function selectFolder(id, { shift = false } = {}) {
    setSelection((prev) => {
      if (!shift || prev.anchorId === null) {
        const isOnlySelected = prev.selectedIds.length === 1 && prev.selectedIds[0] === id
        return isOnlySelected
          ? { anchorId: null, selectedIds: [] }
          : { anchorId: id, selectedIds: [id] }
      }

      const anchor = workspace.folders.find((folder) => folder.id === prev.anchorId)
      const target = workspace.folders.find((folder) => folder.id === id)
      if (!anchor || !target || anchor.parentId !== target.parentId) {
        return { anchorId: id, selectedIds: [id] }
      }

      const siblings = workspace.folders.filter((folder) => folder.parentId === anchor.parentId)
      const anchorIndex = siblings.findIndex((folder) => folder.id === anchor.id)
      const targetIndex = siblings.findIndex((folder) => folder.id === target.id)
      const [start, end] =
        anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex]

      return { ...prev, selectedIds: siblings.slice(start, end + 1).map((folder) => folder.id) }
    })
  }

  // Used by the breadcrumb: select exactly one folder and expand it, plus
  // every ancestor above it, so it's visible in the sidebar tree.
  function focusFolder(id) {
    expandFolders(collectAncestorIds(workspace.folders, id))
    setSelection({ anchorId: id, selectedIds: [id] })
  }

  const selectedFolderIds = selection.selectedIds
  const selectedFolderId = selectedFolderIds.length === 1 ? selectedFolderIds[0] : null

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
        deleteFolders,
        toggleFolderCollapsed,
        selectedFolderId,
        selectedFolderIds,
        selectFolder,
        focusFolder,
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
