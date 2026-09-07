import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLog } from '../context/LogContext.jsx'
import { collectTagPool, formatDayDivider, formatDuration, formatShortDate, groupEventsByDay, sortEventsDescending } from '../utils/logDates.js'
import { formatTimeLabel } from '../utils/taskDates.js'
import LogEventModal from '../components/LogEventModal.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import './Log.css'

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.6 12.6 12.6 20.6a2 2 0 0 1-2.83 0l-7.37-7.37a2 2 0 0 1 0-2.83l8-8A2 2 0 0 1 11.83 2H18a2 2 0 0 1 2 2v6.17a2 2 0 0 1-.6 1.43Z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </svg>
  )
}

function LogEventCard({ event, today, onEdit, onTagClick }) {
  const dateLabel = formatShortDate(event.startDate, today)
  return (
    <div className="task-card">
      <div className="task-body">
        <span className="task-title">{event.title}</span>
        <div className="task-meta">
          <span className="chip chip-due">
            {dateLabel} · {formatTimeLabel(event.startTime)} - {formatTimeLabel(event.endTime)}
          </span>
          <span className="chip chip-duration">{formatDuration(event)}</span>
          {(event.tags ?? []).map((tag) => (
            <button key={tag} type="button" className="chip chip-tag" onClick={() => onTagClick(tag)}>
              {tag}
            </button>
          ))}
        </div>
      </div>
      <div className="task-actions">
        <button type="button" className="icon-button" title="Edit event" onClick={onEdit}>
          <PencilIcon />
        </button>
      </div>
    </div>
  )
}

export default function Log() {
  const { events, addEvent, updateEvent, deleteEvent } = useLog()
  const [titleFilter, setTitleFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [modalMode, setModalMode] = useState(null) // null | 'create' | event being edited
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)

  const today = useMemo(() => new Date(), [])
  const tagPool = useMemo(() => collectTagPool(events), [events])

  const filteredEvents = useMemo(() => {
    const titleQuery = titleFilter.trim().toLowerCase()
    const tagQuery = tagFilter.trim().toLowerCase()
    return events.filter((event) => {
      const matchesTitle = !titleQuery || event.title.toLowerCase().includes(titleQuery)
      const matchesTag = !tagQuery || (event.tags ?? []).some((tag) => tag.toLowerCase().includes(tagQuery))
      return matchesTitle && matchesTag
    })
  }, [events, titleFilter, tagFilter])

  const groups = useMemo(() => groupEventsByDay(sortEventsDescending(filteredEvents)), [filteredEvents])

  function handleSave(fields) {
    if (modalMode && modalMode !== 'create') {
      updateEvent(modalMode.id, fields)
    } else {
      addEvent(fields)
    }
    setModalMode(null)
  }

  function handleDeleteConfirmed() {
    deleteEvent(confirmingDeleteId)
    setConfirmingDeleteId(null)
    setModalMode(null)
  }

  const deletingEvent = confirmingDeleteId ? events.find((e) => e.id === confirmingDeleteId) : null

  return (
    <main className="log-page">
      <div className="log-page-header">
        <div className="log-view-tabs">
          <span className="log-view-tab active">List</span>
          <Link className="log-view-tab" to="/log/calendar">
            Calendar
          </Link>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModalMode('create')}>
          <PlusIcon />
          Log Event
        </button>
      </div>

      <div className="log-filters">
        <div className="search-field">
          <SearchIcon />
          <input
            type="text"
            placeholder="Filter by title…"
            value={titleFilter}
            onChange={(e) => setTitleFilter(e.target.value)}
          />
        </div>
        <div className="search-field">
          <TagIcon />
          <input
            type="text"
            placeholder="Filter by tag, e.g. computer_science/fullstack…"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          />
          {tagFilter && (
            <button type="button" className="search-field-clear" aria-label="Clear tag filter" onClick={() => setTagFilter('')}>
              &times;
            </button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="log-empty">
          {events.length === 0 ? 'No events logged yet.' : 'No events match the current filters.'}
        </p>
      ) : (
        <div className="log-groups">
          {groups.map((group) => (
            <div key={group.dateStr} className="day-group">
              <p className="day-group-label">{formatDayDivider(group.dateStr, today)}</p>
              <div className="task-list">
                {group.events.map((event) => (
                  <LogEventCard
                    key={event.id}
                    event={event}
                    today={today}
                    onEdit={() => setModalMode(event)}
                    onTagClick={setTagFilter}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalMode && (
        <LogEventModal
          event={modalMode === 'create' ? null : modalMode}
          allTags={tagPool}
          onSave={handleSave}
          onCancel={() => setModalMode(null)}
          onDelete={modalMode !== 'create' ? () => setConfirmingDeleteId(modalMode.id) : undefined}
        />
      )}

      <ConfirmModal
        open={Boolean(confirmingDeleteId)}
        title="Delete event?"
        message={`Are you sure you want to delete "${deletingEvent?.title}"? This can't be undone.`}
        confirmLabel="Yes, delete"
        cancelLabel="No, keep"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmingDeleteId(null)}
      />
    </main>
  )
}
