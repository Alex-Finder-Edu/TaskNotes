import { useState } from 'react'
import './TaskModal.css'

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

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function initialFormState(task) {
  return {
    title: task?.title ?? '',
    notes: task?.notes ?? '',
    dueDateEnabled: task?.dueDateEnabled ?? false,
    dueDate: task?.dueDate ?? todayISO(),
    dueTimeEnabled: task?.dueTimeEnabled ?? false,
    dueTime: task?.dueTime ?? '09:00',
    repeat: task?.repeat ?? 'none',
    scheduledTime: task?.scheduledTime ?? '09:00',
  }
}

// Shared create/edit form for tasks - matches the mockup at
// documentation/artifacts/mockups/tasks/01_today.html, with the Due Date
// and Due Time fields each gaining an enable/disable checkbox, Repeat
// trimmed to None/Daily, a "Scheduled Time" input that only appears for
// Daily, and no note-linking field.
export default function TaskModal({ task, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(() => initialFormState(task))
  const [error, setError] = useState(null)
  const isEditing = Boolean(task)

  function update(fields) {
    setForm((prev) => ({ ...prev, ...fields }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    onSave({
      title: form.title.trim(),
      notes: form.notes.trim(),
      dueDateEnabled: form.dueDateEnabled,
      dueDate: form.dueDate,
      dueTimeEnabled: form.dueTimeEnabled,
      dueTime: form.dueTime,
      repeat: form.repeat,
      scheduledTime: form.scheduledTime,
    })
  }

  return (
    <div className="task-modal-overlay">
      <div className="task-modal">
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h2>{isEditing ? 'Edit Task' : 'New Task'}</h2>
            <button type="button" className="icon-button" title="Close" onClick={onCancel}>
              <CloseIcon />
            </button>
          </div>

          <div className="field">
            <label htmlFor="task-title">Title</label>
            <input
              id="task-title"
              type="text"
              autoFocus
              placeholder="e.g. Renew car registration"
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="task-notes">Notes</label>
            <textarea
              id="task-notes"
              placeholder="Optional details"
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label className="field-checkbox-label" htmlFor="task-due-date">
                <input
                  id="task-due-date-enabled"
                  type="checkbox"
                  checked={form.dueDateEnabled}
                  onChange={(e) => update({ dueDateEnabled: e.target.checked })}
                />
                Due date
              </label>
              <input
                id="task-due-date"
                type="date"
                disabled={!form.dueDateEnabled}
                value={form.dueDate}
                onChange={(e) => update({ dueDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-checkbox-label" htmlFor="task-due-time">
                <input
                  id="task-due-time-enabled"
                  type="checkbox"
                  checked={form.dueTimeEnabled}
                  onChange={(e) => update({ dueTimeEnabled: e.target.checked })}
                />
                Due time
              </label>
              <input
                id="task-due-time"
                type="time"
                disabled={!form.dueTimeEnabled}
                value={form.dueTime}
                onChange={(e) => update({ dueTime: e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label>Repeat</label>
            <div className="repeat-options">
              <button
                type="button"
                className={`pill-option${form.repeat === 'none' ? ' selected' : ''}`}
                onClick={() => update({ repeat: 'none' })}
              >
                None
              </button>
              <button
                type="button"
                className={`pill-option${form.repeat === 'daily' ? ' selected' : ''}`}
                onClick={() => update({ repeat: 'daily' })}
              >
                Daily
              </button>
            </div>
          </div>

          {form.repeat === 'daily' && (
            <div className="field">
              <label htmlFor="task-scheduled-time">Scheduled Time</label>
              <input
                id="task-scheduled-time"
                type="time"
                value={form.scheduledTime}
                onChange={(e) => update({ scheduledTime: e.target.value })}
              />
            </div>
          )}

          {error && <p className="task-modal-error">{error}</p>}

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
                {isEditing ? 'Save Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
