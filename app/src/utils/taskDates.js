// Date helpers for scheduling tasks into the Today / Tomorrow / This Week
// tabs. Dates are compared as plain YYYY-MM-DD strings (no timezone/time
// component) so a task's due date always means the same calendar day
// regardless of what time it is when the list is rendered.

export function toDateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function isoDate(date) {
  const d = toDateOnly(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(date, days) {
  const d = toDateOnly(date)
  d.setDate(d.getDate() + days)
  return d
}

// The days making up "This Week": today through the coming Saturday (the
// end of the current Sunday-start week) - matching the range shown in the
// calendar mockup, so today's tasks are always included.
export function thisWeekDates(today) {
  const start = toDateOnly(today)
  const daysUntilSaturday = 6 - start.getDay()
  const dates = []
  for (let i = 0; i <= daysUntilSaturday; i++) {
    dates.push(addDays(start, i))
  }
  return dates
}

// Whether `task` should appear on `date`: a daily-repeating task occurs
// every day; a task with an enabled due date occurs only on that date; a
// task with no due date at all is an "anytime" task, shown alongside today.
export function taskOccursOn(task, date) {
  if (task.repeat === 'daily') return true
  if (task.dueDateEnabled && task.dueDate) return task.dueDate === isoDate(date)
  return isoDate(date) === isoDate(new Date())
}

export function formatDayLabel(date, today) {
  const isToday = isoDate(date) === isoDate(today)
  const weekday = date.toLocaleDateString(undefined, { weekday: 'long' })
  const rest = date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
  return isToday ? `${weekday}, ${rest} - Today` : `${weekday}, ${rest}`
}

export function formatTimeLabel(hhmm) {
  if (!hhmm) return ''
  const [hStr, mStr] = hhmm.split(':')
  const h = Number(hStr)
  const period = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${mStr} ${period}`
}

// A task is overdue when it has a specific, enabled due date+time in the
// past, isn't done, and doesn't repeat (a repeating task is never "overdue"
// - it just recurs again).
export function isOverdue(task, now = new Date()) {
  if (task.done || task.repeat === 'daily') return false
  if (!task.dueDateEnabled || !task.dueDate || !task.dueTimeEnabled || !task.dueTime) return false
  const due = new Date(`${task.dueDate}T${task.dueTime}`)
  return due < now
}
