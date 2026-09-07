# Tutorial: Log View Mockups

Implements `prompts/24_log_view_events.txt` — static, clickable mockups (not
app code) for a new "Log" feature: recording timestamped events (with a
start/end range, Obsidian-style hierarchical tags, and optional stopwatch
time-tracking), a filterable list, and a Google Calendar-style day view.
Saved under `documentation/artifacts/mockups/log/`, following the same
static-HTML approach as the Tasks/Notes mockups in
[`14_task_and_notes_app_mockups.md`](./14_task_and_notes_app_mockups.md).

## Layout

```
documentation/artifacts/mockups/
  log/01_list.html      - Log list, name/tag filters, Log Event + Edit Event modals
  log/02_calendar.html  - Day view; click a slot to log an event starting there
```

Both pages reuse `../shared.css` / `../shared.js` rather than duplicating
styles or JS, and both share the same `#new-event-modal` / `#edit-event-modal`
markup (the calendar page only differs in how the modal gets opened — see
below), the same pattern `tasks/01_today.html` and `tasks/02_calendar_day.html`
already established for task modals.

## New building blocks added to `shared.css` / `shared.js`

The existing shared files only had task-shaped components (due date/time,
repeat pills, a linked-note picker). Three new pieces were needed for the Log
Event modal:

- **Start/End date+time with a "Now" button** (`.datetime-row`): two
  `.field`s (date, time) plus a small button. `initNowButtons()` in
  `shared.js` finds the button's enclosing `.datetime-row` and fills its date
  input with today's ISO date and its time input with the current
  `HH:MM` — one handler shared by both the Start row and the End row.
- **A stopwatch time-tracking panel** (`.stopwatch-panel`): hidden until
  "Track time instead" is clicked (`initStopwatch()`), then a real
  `setInterval`-driven `HH:MM:SS` display with Start/Stop buttons. Stop reads
  `Date.now()` and writes it into the modal's `[data-end-date]` /
  `[data-end-time]` inputs — a live, working demo of "record how much time
  passed since clicking Start," not just a static picture of one.
- **An Obsidian-style hierarchical tag input** (`.tag-input`): modeled
  directly on `app/src/components/LinkAwareTextarea.jsx`'s internal-link
  autocomplete (the prompt explicitly asks for the same interaction). A
  `.tag-chip-list` holds already-added tags as removable chips; typing in the
  `.tag-input-field` filters a `window.MOCK_TAGS` pool (set per-page, standing
  in for tags already used across Log/Tasks/Notes) by substring match and
  shows a `.tag-autocomplete` dropdown — Arrow Up/Down to move the highlight,
  Enter to add the highlighted (or freshly-typed) tag, Backspace on an empty
  field to pop the last chip. So typing `computer_science/fullstack` surfaces
  every existing `computer_science/fullstack/*` leaf, exactly as the prompt
  describes.

A fourth addition, `initEventFormValidation()`, is the "proper validation"
the prompt asks for on Save: it requires a non-empty title and an End
strictly after Start, and only closes the modal (a real
`new Date(...)` comparison, not a placeholder) when both hold — otherwise a
`.form-error` banner appears and the modal stays open. This is the one place
these mockups intentionally depart from the "Save always just closes the
modal" convenience used elsewhere (e.g. the Tasks mockups' Save button),
since validation was specifically called out as a requirement here.

## Calendar day view: reusing `initCalendar()` across two features

`tasks/02_calendar_day.html`'s `initCalendar()` was hardcoded to
`#new-task-modal` / `#edit-task-modal`. Rather than fork a near-identical copy
for Log, it now reads `data-new-modal` / `data-edit-modal` attributes off each
`.cal-day-col` (defaulting to the original task modal ids, so the existing
Tasks pages need no changes), and prefers a `[data-start-date]` /
`[data-start-time]` pair over the old plain `input[type="time"]` lookup when
setting a clicked slot's time. `log/02_calendar.html` sets
`data-new-modal="new-event-modal" data-edit-modal="edit-event-modal"` and
gives each `.cal-slot` a `dataset.date` alongside `dataset.time`, so clicking
an empty slot opens the Log Event modal with **both** the start date and
start time already filled in from that slot — not just the time, as the
original task-only version did.

## Commands reference

No new commands were introduced in this step. To preview the mockups
locally, serve `documentation/artifacts/mockups/` with any static file
server (e.g. `python -m http.server` from that directory) and open
`index.html`, or `log/01_list.html` / `log/02_calendar.html` directly — see
[`14_task_and_notes_app_mockups.md`](./14_task_and_notes_app_mockups.md) for
why `file://` doesn't work with the browser automation used to verify these.
