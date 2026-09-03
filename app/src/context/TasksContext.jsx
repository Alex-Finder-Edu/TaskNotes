import { createContext, useContext, useEffect, useState } from 'react'

const TasksContext = createContext(null)
const STORAGE_KEY = 'notetasks.tasks'

function loadInitialTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // localStorage unavailable or corrupted - fall back to no tasks
  }
  return []
}

function makeId() {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function TasksProvider({ children }) {
  const [tasks, setTasks] = useState(loadInitialTasks)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
    } catch {
      // storage unavailable (e.g. private browsing) - state stays in memory only
    }
  }, [tasks])

  function addTask(fields) {
    const task = { id: makeId(), done: false, ...fields }
    setTasks((prev) => [...prev, task])
    return task
  }

  function updateTask(id, fields) {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...fields } : task)))
  }

  function deleteTask(id) {
    setTasks((prev) => prev.filter((task) => task.id !== id))
  }

  function toggleTaskDone(id) {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task)))
  }

  return (
    <TasksContext.Provider value={{ tasks, addTask, updateTask, deleteTask, toggleTaskDone }}>
      {children}
    </TasksContext.Provider>
  )
}

export function useTasks() {
  const ctx = useContext(TasksContext)
  if (!ctx) throw new Error('useTasks must be used within a TasksProvider')
  return ctx
}
