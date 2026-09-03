import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import './Topbar.css'

function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  )
}

function TasksIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  )
}

function GraphIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="6" x2="14" y2="14" />
      <line x1="18" y1="6" x2="14" y2="14" />
      <line x1="6" y1="18" x2="14" y2="14" />
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="14" cy="14" r="2.5" />
    </svg>
  )
}

// A small calendar-like badge showing today's day-of-month inside it,
// rather than a generic calendar glyph - the date itself is the point.
function DateIcon({ date }) {
  return (
    <div className="topbar-date-icon" title={date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}>
      <span className="topbar-date-icon-header" />
      <span className="topbar-date-icon-day">{date.getDate()}</span>
    </div>
  )
}

function formatClock(date) {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function Topbar() {
  const now = useClock()

  return (
    <header className="topbar">
      <div className="topbar-left">
        <DateIcon date={now} />
        <span className="topbar-clock">{formatClock(now)}</span>
        <Link to="/" className="topbar-brand">
          NoteTasks
        </Link>
      </div>
      <nav className="topbar-nav">
        <NavLink to="/" end className={({ isActive }) => `topbar-nav-link${isActive ? ' active' : ''}`}>
          <NotesIcon />
          Notes
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => `topbar-nav-link${isActive ? ' active' : ''}`}>
          <TasksIcon />
          Tasks
        </NavLink>
        <NavLink to="/graph" className={({ isActive }) => `topbar-nav-link${isActive ? ' active' : ''}`}>
          <GraphIcon />
          Graph View
        </NavLink>
      </nav>
    </header>
  )
}
