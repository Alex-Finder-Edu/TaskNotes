import { createContext, useContext, useEffect, useState } from 'react'

const LogContext = createContext(null)
const STORAGE_KEY = 'notetasks.logEvents'

function loadInitialEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // localStorage unavailable or corrupted - fall back to no events
  }
  return []
}

function makeId() {
  return `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function LogProvider({ children }) {
  const [events, setEvents] = useState(loadInitialEvents)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
    } catch {
      // storage unavailable (e.g. private browsing) - state stays in memory only
    }
  }, [events])

  function addEvent(fields) {
    const event = { id: makeId(), ...fields }
    setEvents((prev) => [...prev, event])
    return event
  }

  function updateEvent(id, fields) {
    setEvents((prev) => prev.map((event) => (event.id === id ? { ...event, ...fields } : event)))
  }

  function deleteEvent(id) {
    setEvents((prev) => prev.filter((event) => event.id !== id))
  }

  return (
    <LogContext.Provider value={{ events, addEvent, updateEvent, deleteEvent }}>{children}</LogContext.Provider>
  )
}

export function useLog() {
  const ctx = useContext(LogContext)
  if (!ctx) throw new Error('useLog must be used within a LogProvider')
  return ctx
}
