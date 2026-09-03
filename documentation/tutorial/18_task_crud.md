# Tutorial: Task CRUD & Topbar Cleanup

Implements `prompts/20_add_task_crud.txt` - a real Tasks feature (create,
read, update, delete) built from the
[Tasks mockup](../artifacts/mockups/tasks/01_today.html), plus a topbar/
sidebar reshuffle to make room for it.

## Topbar cleanup

`Notes` and `Graph View` moved out of the sidebar's nav section into a new
`<nav className="topbar-nav">` in `Topbar.jsx`, joined by a new `Tasks` link
(`/tasks`) using the same active-link styling pattern. The sidebar keeps only
what's specific to the notes tree: folder/note actions, the tree itself, and
the Theme link in its footer.

Two new elements sit left of the brand link, in this order: a small
calendar-badge icon and a live clock.

- **Date icon**: rather than a generic calendar glyph, `DateIcon` renders a
  tiny two-part box - a colored header strip plus the actual day-of-month
  number (`date.getDate()`) - so the icon *is* today's date, like a desktop
  calendar app's icon. Built from two `<div>`s and CSS rather than SVG, since
  centering a number precisely inside an SVG icon is fussier than flexbox.
- **Clock**: `useClock()` is a tiny hook - `useState(() => new Date())` plus
  a `setInterval` in `useEffect` ticking every second, cleaned up on
  unmount - feeding `formatClock()`, which zero-pads `HH:MM:SS` in 24-hour
  time via `getHours()` (no 12-hour conversion, unlike the task list's own
  time formatting).

## Task data and scheduling

`TasksContext` (`app/src/context/TasksContext.jsx`) mirrors `NotesContext`'s
shape: state persisted to `localStorage` (key `notetasks.tasks`) on every
change, with `addTask`/`updateTask`/`deleteTask`/`toggleTaskDone`. A task is
`{ id, title, notes, done, dueDateEnabled, dueDate, dueTimeEnabled, dueTime,
repeat, scheduledTime }` - `repeat` is `'none'` or `'daily'` per the prompt's
trimmed-down Repeat field.

`utils/taskDates.js` decides which tab(s) a task shows up in via
`taskOccursOn(task, date)`:
- `repeat === 'daily'` → occurs on every date (it's recurring).
- an enabled due date → occurs only on that exact date.
- neither → an "anytime" task, treated as occurring today (so it isn't
  invisible in every tab, but doesn't clutter Tomorrow/This Week either).

"This Week" is computed as *today through the coming Saturday*
(`thisWeekDates`), matching the range the Calendar mockup showed, and grouped
by day - a day with no occurring tasks is skipped entirely, same as the
mockup.

## The task modal's mockup deviations

`TaskModal.jsx` follows the prompt's explicit list of tweaks from the
mockup's version:
- **Due date / Due time** each get their own checkbox (`dueDateEnabled`/
  `dueTimeEnabled`) instead of being implicitly "on"; the paired input is
  `disabled` (and dimmed) while its checkbox is unchecked, so a task can have
  no date, a date but no time, or both.
- **Repeat** is two pills, not five - `None`/`Daily` only.
- Picking **Daily** conditionally renders a **Scheduled Time** field
  (styled identically to Due Time) right below the Repeat pills - the time
  a daily task recurs at, independent of `dueTime`.
- The mockup's "linked note" field is gone entirely - no note-linking for
  tasks yet.
- Footer is just `Cancel` + `Create Task` (or `Save Task` when editing), plus
  a `Delete` button on the edit side - satisfying the "CRUD" part of the
  prompt without the mockup's note-search affordance.

## Avoiding a class-name collision with `ConfirmModal`

`ConfirmModal.css` already defines global `.modal-overlay`/`.modal` classes
(loaded wherever `ConfirmModal` is imported, which is nearly everywhere).
Since this app doesn't scope CSS per-component, reusing those same class
names for the task modal's overlay/card would silently merge both modals'
styles in the global stylesheet - including `ConfirmModal`'s narrower
`max-width: 380px`, too cramped for a form with five fields. `TaskModal.css`
uses `.task-modal-overlay`/`.task-modal` instead; everything else inside it
(`.field`, `.field-row`, `.repeat-options`, `.pill-option`, `.btn`,
`.modal-header`, `.modal-footer`) was checked against the rest of the app's
CSS first and is unique, so those keep the same names the mockup used.

## Commands reference

No new commands were introduced in this step. See
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
