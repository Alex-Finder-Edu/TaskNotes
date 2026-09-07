// Date/tag helpers for the Log feature - events are stored as separate
// startDate/startTime/endDate/endTime strings (mirroring tasks' dueDate/
// dueTime split in taskDates.js) rather than one Date, so a stored event
// round-trips through localStorage/JSON without timezone conversion.

export function pad(n) {
  return String(n).padStart(2, '0')
}

export function todayISO(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function nowTime(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function parseISODate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function eventStart(event) {
  return new Date(`${event.startDate}T${event.startTime}`)
}

export function eventEnd(event) {
  return new Date(`${event.endDate}T${event.endTime}`)
}

// Most recent event first.
export function sortEventsDescending(events) {
  return [...events].sort((a, b) => eventStart(b).getTime() - eventStart(a).getTime())
}

// Assumes `events` is already sorted so consecutive same-day events stay
// adjacent - splits them into day-labeled groups without re-sorting.
export function groupEventsByDay(events) {
  const groups = []
  for (const event of events) {
    const last = groups[groups.length - 1]
    if (last && last.dateStr === event.startDate) {
      last.events.push(event)
    } else {
      groups.push({ dateStr: event.startDate, events: [event] })
    }
  }
  return groups
}

function diffDaysFromToday(dateStr, today) {
  const date = parseISODate(dateStr)
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((date - todayOnly) / 86400000)
}

// Short form used inline on an event card, e.g. "Today", "Yesterday", "Tue, Sep 2".
export function formatShortDate(dateStr, today) {
  const diff = diffDaysFromToday(dateStr, today)
  if (diff === 0) return 'Today'
  if (diff === -1) return 'Yesterday'
  if (diff === 1) return 'Tomorrow'
  return parseISODate(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

// Long form used as the divider label between days in the Log list.
export function formatDayDivider(dateStr, today) {
  const diff = diffDaysFromToday(dateStr, today)
  const date = parseISODate(dateStr)
  const weekday = date.toLocaleDateString(undefined, { weekday: 'long' })
  const rest = date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
  if (diff === 0) return `${weekday}, ${rest} - Today`
  if (diff === -1) return `${weekday}, ${rest} - Yesterday`
  return `${weekday}, ${rest}`
}

export function formatDuration(event) {
  const minutes = Math.max(0, Math.round((eventEnd(event) - eventStart(event)) / 60000))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}m`
  return `${hours}h ${pad(rest)}m`
}

// Every distinct tag used across all events, for the tag-input autocomplete
// pool - sorted so hierarchical paths (a/b, a/c) group together.
export function collectTagPool(events) {
  const tags = new Set()
  events.forEach((event) => (event.tags ?? []).forEach((tag) => tags.add(tag)))
  return Array.from(tags).sort()
}
