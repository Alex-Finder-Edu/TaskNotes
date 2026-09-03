import { useMemo, useState } from 'react'
import { useTasks } from '../context/TasksContext.jsx'
import { addDays, formatDayLabel, formatTimeLabel, isOverdue, taskOccursOn, thisWeekDates } from '../utils/taskDates.js'
import TaskModal from '../components/TaskModal.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import './Tasks.css'

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function RepeatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
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

function TaskCard({ task, onEdit }) {
  const { toggleTaskDone } = useTasks()
  const overdue = isOverdue(task)
  const timeLabel =
    task.repeat === 'daily' ? formatTimeLabel(task.scheduledTime) : task.dueTimeEnabled ? formatTimeLabel(task.dueTime) : null

  return (
    <div className={`task-card${task.done ? ' done' : ''}`}>
      <button
        type="button"
        className={`task-check${task.done ? ' checked' : ''}`}
        title={task.done ? 'Mark as not done' : 'Mark as done'}
        onClick={() => toggleTaskDone(task.id)}
      >
        {task.done && <CheckIcon />}
      </button>
      <div className="task-body">
        <span className="task-title">{task.title}</span>
        {(task.repeat === 'daily' || timeLabel || task.notes) && (
          <div className="task-meta">
            {task.repeat === 'daily' && (
              <span className="chip chip-repeat">
                <RepeatIcon />
                Daily
              </span>
            )}
            {timeLabel && (
              <span className={`chip chip-due${overdue ? ' overdue' : ''}`}>
                <ClockIcon />
                {timeLabel}
                {overdue ? ' - overdue' : ''}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="task-actions">
        <button type="button" className="icon-button" title="Edit task" onClick={() => onEdit(task)}>
          <PencilIcon />
        </button>
      </div>
    </div>
  )
}

export default function Tasks() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks()
  const [activeTab, setActiveTab] = useState('today')
  const [modalMode, setModalMode] = useState(null) // null | 'create' | task being edited
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)

  const today = useMemo(() => new Date(), [])
  const tomorrow = useMemo(() => addDays(today, 1), [today])
  const weekDates = useMemo(() => thisWeekDates(today), [today])

  const todayTasks = useMemo(() => tasks.filter((t) => taskOccursOn(t, today)), [tasks, today])
  const tomorrowTasks = useMemo(() => tasks.filter((t) => taskOccursOn(t, tomorrow)), [tasks, tomorrow])
  const weekGroups = useMemo(
    () =>
      weekDates
        .map((date) => ({ date, dayTasks: tasks.filter((t) => taskOccursOn(t, date)) }))
        .filter((group) => group.dayTasks.length > 0),
    [tasks, weekDates],
  )
  const weekCount = useMemo(() => weekGroups.reduce((sum, g) => sum + g.dayTasks.length, 0), [weekGroups])

  function handleSave(fields) {
    if (modalMode && modalMode !== 'create') {
      updateTask(modalMode.id, fields)
    } else {
      addTask(fields)
    }
    setModalMode(null)
  }

  function handleDeleteConfirmed() {
    deleteTask(confirmingDeleteId)
    setConfirmingDeleteId(null)
    setModalMode(null)
  }

  const editingTask = confirmingDeleteId ? tasks.find((t) => t.id === confirmingDeleteId) : null

  return (
    <main className="tasks-page">
      <div className="tasks-header">
        <div className="tasks-header-text">
          <h1>Tasks</h1>
          <p className="tasks-subtitle">One-time and repeating tasks</p>
        </div>
      </div>

      <button type="button" className="btn btn-primary tasks-new-button" onClick={() => setModalMode('create')}>
        <PlusIcon />
        New Task
      </button>

      <div className="tabs">
        <button type="button" className={`tab${activeTab === 'today' ? ' active' : ''}`} onClick={() => setActiveTab('today')}>
          Today <span className="count">{todayTasks.length}</span>
        </button>
        <button
          type="button"
          className={`tab${activeTab === 'tomorrow' ? ' active' : ''}`}
          onClick={() => setActiveTab('tomorrow')}
        >
          Tomorrow <span className="count">{tomorrowTasks.length}</span>
        </button>
        <button type="button" className={`tab${activeTab === 'week' ? ' active' : ''}`} onClick={() => setActiveTab('week')}>
          This Week <span className="count">{weekCount}</span>
        </button>
      </div>

      {activeTab === 'today' &&
        (todayTasks.length === 0 ? (
          <p className="tasks-empty">No tasks for today.</p>
        ) : (
          <div className="task-list">
            {todayTasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={setModalMode} />
            ))}
          </div>
        ))}

      {activeTab === 'tomorrow' &&
        (tomorrowTasks.length === 0 ? (
          <p className="tasks-empty">No tasks for tomorrow.</p>
        ) : (
          <div className="task-list">
            {tomorrowTasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={setModalMode} />
            ))}
          </div>
        ))}

      {activeTab === 'week' &&
        (weekGroups.length === 0 ? (
          <p className="tasks-empty">No tasks this week.</p>
        ) : (
          <div className="week-groups">
            {weekGroups.map(({ date, dayTasks }) => (
              <div key={date.toISOString()} className="day-group">
                <p className="day-group-label">{formatDayLabel(date, today)}</p>
                <div className="task-list">
                  {dayTasks.map((task) => (
                    <TaskCard key={`${date.toISOString()}-${task.id}`} task={task} onEdit={setModalMode} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

      {modalMode && (
        <TaskModal
          task={modalMode === 'create' ? null : modalMode}
          onSave={handleSave}
          onCancel={() => setModalMode(null)}
          onDelete={modalMode !== 'create' ? () => setConfirmingDeleteId(modalMode.id) : undefined}
        />
      )}

      <ConfirmModal
        open={Boolean(confirmingDeleteId)}
        title="Delete task?"
        message={`Are you sure you want to delete "${editingTask?.title}"? This can't be undone.`}
        confirmLabel="Yes, delete"
        cancelLabel="No, keep"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmingDeleteId(null)}
      />
    </main>
  )
}
