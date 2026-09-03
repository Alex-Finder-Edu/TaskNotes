# Tutorial: Tasks UI Fixes

Implements `prompts/21_tasks_ui_fixes.txt` - five small fixes to the Tasks
feature and topbar from [`18_task_crud.md`](./18_task_crud.md).

## Removing the Tasks page header

`Tasks.jsx` no longer renders `.tasks-header`/`.tasks-header-text` (the "Tasks"
`<h1>` and its subtitle) - the page now goes straight from the topbar into
the New Task button and tabs. The now-unused CSS for those classes was
removed from `Tasks.css` along with it, rather than left dead.

## Date badge: from a bare number to a full label

`DateIcon` previously showed just `date.getDate()` centered in a small
square. It now renders `"2026 Sept 03 / Thu"` via a new `formatDateBadge()`
helper - year, a month abbreviation (`MONTH_LABELS`, spelling out `Sept` for
September specifically, per the requested format, rather than the standard
3-letter `Sep`), zero-padded day, and a short weekday from
`toLocaleDateString`. Fitting that text meant the icon's CSS changed from a
fixed 26×26px square to `width: fit-content` with horizontal padding, and the
day text switched to the monospace font for a steadier fixed-width feel.

## Matching the clock to the brand text size

`.topbar-clock`'s `font-size` changed from `14px` to `20px` (and its
responsive breakpoint from unset to `18px`), mirroring `.topbar-brand`
exactly, including at the same `700px` breakpoint where the brand also
shrinks.

## "This week" now ends on Sunday

`thisWeekDates()` computed days through the coming Saturday
(`6 - start.getDay()`). Per this fix, a week now runs Monday-to-Sunday, so
the count of remaining days becomes `(7 - start.getDay()) % 7` - the `% 7`
matters for the edge case where today already *is* Sunday (`getDay() === 0`):
without it the formula would produce 7 (a whole extra week), but the correct
answer is 0 (today is the only day left in "this week").

## Per-occurrence completion for daily tasks

Previously every task had one `done` boolean, so checking off a daily task's
Wednesday occurrence marked it done everywhere it recurs - Thursday, Friday,
every future day - since they're all rendered from the same task object.
Fixed by giving repeating tasks a `doneDates: string[]` field (ISO dates)
instead of relying on `done`:

- `TasksContext.toggleTaskDone(id, dateIso)` now takes the specific
  occurrence's date. For a `repeat: 'daily'` task it adds/removes `dateIso`
  from `doneDates`; for any other task it still just flips the single `done`
  flag (a one-time task only ever has one occurrence, so per-date tracking
  would be pointless there).
- `utils/taskDates.js` gained `isTaskDoneOn(task, date)`, checking
  `doneDates.includes(isoDate(date))` for daily tasks and `task.done`
  otherwise - the single source of truth both `Tasks.jsx` (checkbox state,
  strikethrough styling) and the checkbox's own `onClick` now go through.
- `TaskCard` gained an `occurrenceDate` prop, passed as `today`/`tomorrow`/
  the specific day from each `Tasks.jsx` render site (the Today tab, Tomorrow
  tab, and each day-group in This Week) - so the *same* task object rendered
  on three different days computes three independently correct checked
  states from the one `doneDates` array.

## Commands reference

No new commands were introduced in this step. See
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
