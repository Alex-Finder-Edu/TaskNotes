# Tutorial: Log View Implementation

Implements `prompts/25_log_view_events_implementation.txt` — turns the
static mockups from
[`22_log_view_mockups.md`](./22_log_view_mockups.md) into a real feature:
a `LogContext` for persisted events, a list view and a calendar day view
routed at `/log` and `/log/calendar`, and a `LogEventModal` shared by both.

## New files

```
app/src/context/LogContext.jsx      - events state, localStorage persistence (mirrors TasksContext.jsx)
app/src/utils/logDates.js           - duration/day-grouping/tag-pool helpers (mirrors taskDates.js)
app/src/components/TagInput.jsx/.css - reusable Obsidian-style hierarchical tag input
app/src/components/LogEventModal.jsx/.css - create/edit form (mirrors TaskModal.jsx)
app/src/pages/Log.jsx/.css          - list view, filters
app/src/pages/LogCalendar.jsx/.css  - day-view calendar
```

`App.jsx` gained a `LogProvider` (alongside `TasksProvider`) and two routes,
`/log` and `/log/calendar`; `Topbar.jsx` gained a "Log" nav link between
Tasks and Graph View, matching where the mockups placed it.

## Event shape

```js
{ id, title, notes, startDate, startTime, endDate, endTime, tags: [] }
```

Dates and times are kept as separate `YYYY-MM-DD` / `HH:MM` strings rather
than one `Date`, the same choice `TasksContext`/`TaskModal` made for
`dueDate`/`dueTime` — it round-trips through `localStorage`/`JSON` without
timezone surprises, and matches an actual `<input type="date">` /
`<input type="time">` value directly.

## The three changes from the mockup

The prompt called out three specific deltas from the static mockups:

1. **A Notes field on Edit Event.** `LogEventModal` renders the same Title →
   Notes → Start → End → Tags order for both create and edit (the mockup's
   Edit Event modal was missing it), matching `TaskModal`'s Title → Notes
   layout.
2. **Descending sort with day dividers.** `logDates.js` exports
   `sortEventsDescending` (most recent `startDate`+`startTime` first) and
   `groupEventsByDay`, which just walks the already-sorted list and starts a
   new group whenever `startDate` changes - no re-sorting inside the
   grouping step. `Log.jsx` renders each group under a `day-group-label`
   divider (reusing the exact class Tasks' "This Week" tab already
   established for its per-day groups), via `formatDayDivider` (long form:
   "Monday, September 7 - Today").
3. **Clicking a tag applies it as the tag filter.** Each tag on a
   `LogEventCard` is a `<button className="chip chip-tag">` whose `onClick`
   calls `setTagFilter(tag)` directly - clicking a tag and typing in the
   "Filter by tag" box drive the exact same piece of state, so there's
   nothing separate to keep in sync.

## Tag input and pool

`TagInput` is a standalone component (not folded into `LogEventModal`)
because tags are meant to be reused wherever this project adds tagging next
(the original mockup prompt mentions Tasks and Notes too) - factoring it out
now means a future prompt can drop it into `TaskModal` without touching Log
code. It re-implements the interaction from
`app/src/components/LinkAwareTextarea.jsx`'s internal-link autocomplete as
plain React state instead of DOM `querySelector` calls (the mockup's
`shared.js` version): a `matches` list computed with `useMemo` from a
`suggestions` prop, Arrow Up/Down to move a highlighted index, Enter to
commit, Backspace on an empty field to pop the last chip.

The `suggestions` pool itself comes from `collectTagPool(events)` in
`logDates.js` - every distinct tag already used on any logged event, so
typing `computer_science/fullstack` surfaces every existing
`computer_science/fullstack/*` leaf. It's computed fresh from `events` on
every render of `Log`/`LogCalendar` (`useMemo` keyed on `events`), so a tag
added to one event is immediately suggestable while creating the next one -
no separate tags collection to keep in sync.

## Stopwatch time-tracking

`LogEventModal` keeps `running`/`elapsed` state and a `setInterval` ref for
the "Track time instead" panel. Start records `Date.now()`; Stop clears the
interval and calls the same `setEndNow()` the End row's "Now" button uses -
since the stopwatch only ever runs from *now* (Start click) to *now* (Stop
click), setting End to the current moment on Stop is exactly the elapsed
duration, with no separate calculation needed.

## Calendar day view

`LogCalendar.jsx` renders the mockup's hour-ruler + half-hour slot grid as
real React elements instead of `document.createElement` calls: `SLOTS` and
`HOURS` are computed once at module scope (not per render, since `DAY_START`/
`DAY_END` are constants), and each `.cal-slot`'s `onClick` opens
`LogEventModal` in create mode with `initialStart` set to that slot's
`{ date, time }` - both the date and the time, since (unlike the original
Tasks-only `initCalendar()` in the mockup's `shared.js`) a click always knows
which day is currently selected. `topForTime()` is the same
`(minutesSince6AM / 60) * 60px` conversion the mockup used, so an event's
pixel position/height still comes directly from its stored start/end time
rather than a layout recalculation. The mockup's Week/Month view tabs and
mini-month picker weren't carried over - Tasks' own calendar mockup never
got a real implementation either, and day navigation (prev/next/Today
buttons) is enough to fulfil "a calendar view ... for the selected day" from
the original mockup prompt.

## Commands reference

No new commands were introduced in this step. See
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for running the dev server (`npm run dev` from `app/`).
