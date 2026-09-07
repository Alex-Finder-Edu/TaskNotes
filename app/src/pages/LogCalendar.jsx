import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLog } from '../context/LogContext.jsx'
import { addDays, formatTimeLabel, isoDate } from '../utils/taskDates.js'
import { collectTagPool } from '../utils/logDates.js'
import LogEventModal from '../components/LogEventModal.jsx'
import './LogCalendar.css'

const DAY_START = 6 // 6 AM
const DAY_END = 22 // 10 PM
const PX_PER_HOUR = 60

function pad(n) {
  return String(n).padStart(2, '0')
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function topForTime(time) {
  return ((timeToMinutes(time) - DAY_START * 60) / 60) * PX_PER_HOUR
}

function formatHourLabel(h) {
  const period = h < 12 || h === 24 ? 'AM' : 'PM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12} ${period}`
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

const HOURS = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i)
const SLOTS = []
for (let h = DAY_START; h < DAY_END; h++) {
  for (const m of [0, 30]) {
    SLOTS.push(`${pad(h)}:${pad(m)}`)
  }
}

export default function LogCalendar() {
  const { events, addEvent, updateEvent, deleteEvent } = useLog()
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [modalMode, setModalMode] = useState(null) // null | 'create' | event being edited
  const [initialStart, setInitialStart] = useState(null)

  const dateStr = isoDate(currentDate)
  const isToday = dateStr === isoDate(new Date())
  const tagPool = useMemo(() => collectTagPool(events), [events])
  const dayEvents = useMemo(() => events.filter((event) => event.startDate === dateStr), [events, dateStr])

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const totalHeight = (DAY_END - DAY_START) * PX_PER_HOUR

  function handleSlotClick(time) {
    setInitialStart({ date: dateStr, time })
    setModalMode('create')
  }

  function handleEventClick(event, e) {
    e.stopPropagation()
    setInitialStart(null)
    setModalMode(event)
  }

  function handleSave(fields) {
    if (modalMode && modalMode !== 'create') {
      updateEvent(modalMode.id, fields)
    } else {
      addEvent(fields)
    }
    setModalMode(null)
    setInitialStart(null)
  }

  function closeModal() {
    setModalMode(null)
    setInitialStart(null)
  }

  return (
    <main className="log-page">
      <div className="log-page-header">
        <div className="log-view-tabs">
          <Link className="log-view-tab" to="/log">
            List
          </Link>
          <span className="log-view-tab active">Calendar</span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setInitialStart(null)
            setModalMode('create')
          }}
        >
          <PlusIcon />
          Log Event
        </button>
      </div>

      <div className="cal-header">
        <div className="cal-header-text">
          <h2>{currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
          <p className="cal-subtitle">
            {dayEvents.length} event{dayEvents.length === 1 ? '' : 's'} logged {isToday ? 'today' : 'on this day'}
          </p>
        </div>
        <div className="cal-nav">
          <div className="cal-nav-arrows">
            <button type="button" className="icon-button" title="Previous day" onClick={() => setCurrentDate((d) => addDays(d, -1))}>
              <ChevronLeftIcon />
            </button>
            <button type="button" className="icon-button" title="Next day" onClick={() => setCurrentDate((d) => addDays(d, 1))}>
              <ChevronRightIcon />
            </button>
          </div>
          <button type="button" className="btn" onClick={() => setCurrentDate(new Date())}>
            Today
          </button>
        </div>
      </div>

      <p className="cal-hint">Click an empty time slot to log an event starting there. Click an existing event to edit it.</p>

      <div className="cal-body">
        <div className="cal-time-col" style={{ height: totalHeight }}>
          {HOURS.map((h) => (
            <div key={h} className="cal-hour-label" style={{ top: (h - DAY_START) * PX_PER_HOUR }}>
              {formatHourLabel(h)}
            </div>
          ))}
        </div>
        <div className="cal-day-col" style={{ height: totalHeight }}>
          {SLOTS.map((time) => (
            <div
              key={time}
              className="cal-slot"
              style={{ top: topForTime(time), height: PX_PER_HOUR / 2 }}
              onClick={() => handleSlotClick(time)}
            />
          ))}

          {dayEvents.map((event) => {
            const top = topForTime(event.startTime)
            const height = Math.max(topForTime(event.endTime) - top, 22)
            return (
              <div key={event.id} className="cal-event" style={{ top, height }} onClick={(e) => handleEventClick(event, e)}>
                <span className="cal-event-title">{event.title}</span>
                <span className="cal-event-time">
                  {formatTimeLabel(event.startTime)} - {formatTimeLabel(event.endTime)}
                  {event.tags?.length ? ` · ${event.tags[0]}` : ''}
                </span>
              </div>
            )
          })}

          {isToday && nowMinutes >= DAY_START * 60 && nowMinutes <= DAY_END * 60 && (
            <div className="cal-now-line" style={{ top: ((nowMinutes - DAY_START * 60) / 60) * PX_PER_HOUR }} />
          )}
        </div>
      </div>

      {modalMode && (
        <LogEventModal
          event={modalMode === 'create' ? null : modalMode}
          initialStart={modalMode === 'create' ? initialStart : null}
          allTags={tagPool}
          onSave={handleSave}
          onCancel={closeModal}
          onDelete={
            modalMode !== 'create'
              ? () => {
                  deleteEvent(modalMode.id)
                  closeModal()
                }
              : undefined
          }
        />
      )}
    </main>
  )
}
