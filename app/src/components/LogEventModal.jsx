import { useEffect, useRef, useState } from 'react'
import { nowTime, todayISO } from '../utils/logDates.js'
import TagInput from './TagInput.jsx'
import './LogEventModal.css'

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
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

function StopwatchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M9 2h6" />
    </svg>
  )
}

function initialFormState(event, initialStart) {
  const now = new Date()
  const defaultDate = initialStart?.date ?? todayISO(now)
  const defaultStartTime = initialStart?.time ?? nowTime(now)

  // A slot clicked on the calendar is a highlighted 30-minute interval, so
  // the default End should land exactly at the end of that interval rather
  // than always an hour out; opening the modal with no slot (the "Log
  // Event" button) keeps the original 1-hour-from-now default.
  const defaultStart = initialStart ? new Date(`${defaultDate}T${defaultStartTime}`) : now
  const defaultEnd = new Date(defaultStart.getTime() + (initialStart ? 30 : 60) * 60 * 1000)

  return {
    title: event?.title ?? '',
    notes: event?.notes ?? '',
    startDate: event?.startDate ?? defaultDate,
    startTime: event?.startTime ?? defaultStartTime,
    endDate: event?.endDate ?? todayISO(defaultEnd),
    endTime: event?.endTime ?? nowTime(defaultEnd),
    tags: event?.tags ?? [],
  }
}

function formatStopwatch(totalSeconds) {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

// Shared create/edit form for Log events - matches
// documentation/artifacts/mockups/log/01_list.html: Title, Notes, Start and
// End date/time (each with a "Now" button), a stopwatch that can fill in End
// from an elapsed Start->Stop duration, and an Obsidian-style tag input.
export default function LogEventModal({ event, initialStart, allTags, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(() => initialFormState(event, initialStart))
  const [error, setError] = useState(null)
  const [tracking, setTracking] = useState(false)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startedAtRef = useRef(null)
  const intervalRef = useRef(null)
  const isEditing = Boolean(event)

  useEffect(() => () => clearInterval(intervalRef.current), [])

  function update(fields) {
    setForm((prev) => ({ ...prev, ...fields }))
  }

  function setStartNow() {
    const now = new Date()
    update({ startDate: todayISO(now), startTime: nowTime(now) })
  }

  function setEndNow() {
    const now = new Date()
    update({ endDate: todayISO(now), endTime: nowTime(now) })
  }

  function startStopwatch() {
    startedAtRef.current = Date.now()
    setElapsed(0)
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)
  }

  function stopStopwatch() {
    clearInterval(intervalRef.current)
    setRunning(false)
    setEndNow()
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    const start = new Date(`${form.startDate}T${form.startTime}`)
    const end = new Date(`${form.endDate}T${form.endTime}`)
    if (!(end > start)) {
      setError('End must be after Start.')
      return
    }
    onSave({
      title: form.title.trim(),
      notes: form.notes.trim(),
      startDate: form.startDate,
      startTime: form.startTime,
      endDate: form.endDate,
      endTime: form.endTime,
      tags: form.tags,
    })
  }

  return (
    <div className="log-event-modal-overlay">
      <div className="log-event-modal">
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h2>{isEditing ? 'Edit Event' : 'Log Event'}</h2>
            <button type="button" className="icon-button" title="Close" onClick={onCancel}>
              <CloseIcon />
            </button>
          </div>

          <div className="field">
            <label htmlFor="event-title">Title</label>
            <input
              id="event-title"
              type="text"
              autoFocus
              placeholder="e.g. Deep work: React internals"
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="event-notes">Notes</label>
            <textarea
              id="event-notes"
              placeholder="Optional details"
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </div>

          <div className="field">
            <label>Start</label>
            <div className="datetime-row">
              <div className="field">
                <label className="field-hint" htmlFor="event-start-date">Date</label>
                <input
                  id="event-start-date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update({ startDate: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-hint" htmlFor="event-start-time">Time</label>
                <input
                  id="event-start-time"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => update({ startTime: e.target.value })}
                />
              </div>
              <button type="button" className="btn btn-sm" onClick={setStartNow}>
                Now
              </button>
            </div>
          </div>

          <div className="field">
            <label>End</label>
            <div className="datetime-row">
              <div className="field">
                <label className="field-hint" htmlFor="event-end-date">Date</label>
                <input
                  id="event-end-date"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => update({ endDate: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-hint" htmlFor="event-end-time">Time</label>
                <input
                  id="event-end-time"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => update({ endTime: e.target.value })}
                />
              </div>
              <button type="button" className="btn btn-sm" onClick={setEndNow}>
                Now
              </button>
            </div>

            {!tracking ? (
              <button type="button" className="btn btn-sm log-track-time-button" onClick={() => setTracking(true)}>
                <StopwatchIcon />
                Track time instead
              </button>
            ) : (
              <div className="stopwatch-panel">
                <span className="stopwatch-display">{formatStopwatch(elapsed)}</span>
                <div className="stopwatch-actions">
                  <button type="button" className="btn btn-primary btn-sm" disabled={running} onClick={startStopwatch}>
                    Start
                  </button>
                  <button type="button" className="btn btn-sm" disabled={!running} onClick={stopStopwatch}>
                    Stop
                  </button>
                </div>
                <span className="stopwatch-hint">Stopping fills in the End date &amp; time above with the elapsed time.</span>
              </div>
            )}
          </div>

          <div className="field">
            <label>Tags</label>
            <TagInput
              tags={form.tags}
              onChange={(tags) => update({ tags })}
              suggestions={allTags}
              placeholder="Add a tag… e.g. computer_science/fullstack/backend"
            />
            <p className="field-hint">
              Type a path segment like <code>computer_science/fullstack</code> to see matching tags used
              elsewhere in the Log.
            </p>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-footer">
            {isEditing ? (
              <button type="button" className="btn btn-danger" onClick={onDelete}>
                <TrashIcon />
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="modal-footer-right">
              <button type="button" className="btn" onClick={onCancel}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {isEditing ? 'Save Changes' : 'Save Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
