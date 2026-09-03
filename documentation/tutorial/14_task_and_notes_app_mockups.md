# Tutorial: Task & Notes App Mockups

Implements `prompts/16_generate_mockups_task_and_notes_app.txt` — static,
clickable mockups (not app code) exploring a Tasks/TODO feature and a
refreshed look for the existing notes UI, saved under
`documentation/artifacts/mockups/`.

## Why static HTML instead of React

The prompt asks for mockups, not an implementation — no `NotesContext`-style
state, routing, or persistence is needed yet. Building them as plain,
dependency-free HTML files means they open directly in a browser (no dev
server, no build step) and can't drift out of sync with the real app's
component tree while the feature is still being designed. A `shared.css`
copies the actual design tokens from `app/src/index.css` (`--accent`,
`--border`, `--shadow`, font stack, etc.) so the mockups read as "this app,"
not a generic template — including the `[data-theme]` attribute overrides
used for the theme-switching mockup.

## Layout

```
documentation/artifacts/mockups/
  shared.css                    - design tokens + component styles reused by every page
  shared.js                     - tab switching, modal open/close, checkbox toggle, live theme demo, calendar click-to-add
  index.html                    - gallery linking every mockup
  tasks/01_today.html           - Today / Tomorrow / This Week tabs, CRUD modals, repeat + linked-note chips
  tasks/02_calendar_day.html    - Google Calendar-style day view; click a time slot to add a task there
  notes/01_reading.html         - clean reading view with backlinks
  notes/02_editing.html         - markdown editing view with a toolbar
  notes/03_theme_settings.html  - theme + accent color switching, reading preferences
```

`tasks/01_today.html` covers the whole Tasks prompt in one screen using tabs
rather than three separate files: a `[data-tabs]`/`[data-tab-panel]`
convention in `shared.js` swaps the visible panel, so "Today", "Tomorrow",
and "This Week" (grouped by day) are one page instead of three near-duplicate
ones. The same page's "New Task" and per-task edit buttons open modals built
from the same `.modal-overlay`/`.modal` styles, showing the CRUD fields the
feature will need: title, notes, due date/time, a `Repeat` pill group (None /
Daily / Weekly / Monthly / Custom), and a "linked note" picker so a task can
reference a note the way notes can reference each other via `[[links]]`.

## Calendar day view

A follow-up request asked for a Google Calendar-style view: the tasks
scheduled for a selected day laid out on a time grid, where clicking an
empty slot starts a new task at that time. `tasks/02_calendar_day.html`
adds this alongside the list view, reusing the same `#new-task-modal` /
`#edit-task-modal` markup from `tasks/01_today.html` so the CRUD form itself
doesn't need to be redesigned — only how it gets opened changes.

The grid (hour ruler + half-hour click targets + event blocks) and the mini
month picker in the sidebar are both built by a small inline `<script>` from
a plain JS array of `{ title, start, end, ... }` objects, rather than
hand-written as ~50 near-identical `<div>`s. `topFor(time)` converts a
`"HH:MM"` string to a pixel offset (`(minutes since 6 AM) / 60 * 60px`), used
both for the invisible 30-minute `.cal-slot` click targets and for
positioning `.cal-event` blocks by their actual start/end time — so changing
an event's duration is a one-line data edit, not a CSS recalculation. The
mini month grid is built from a real `Date` object (`new Date(2026, 8, 1)`)
so the weekday alignment for September 2026 is actually correct rather than
eyeballed.

This inline script runs before `shared.js` loads, so by the time `shared.js`
attaches its `DOMContentLoaded` listeners, the `.cal-slot` and `.cal-event`
elements already exist in the DOM for `initCalendar()` to find. `initCalendar()`
does two things: a click on a `.cal-slot` opens `#new-task-modal` and sets
its `Due time` input to that slot's snapped time (plus a label like "New
task at 12:00 PM"); a click on a `.cal-event` calls `stopPropagation()` and
opens `#edit-task-modal` instead, so clicking a task never also fires the
underlying slot's "add task here" handler (event blocks are positioned
*inside* `.cal-day-col`, layered on top of the slots via `z-index`).

The mini-month day buttons are separate from the main grid — clicking one
just toggles which day looks selected (`initMiniCal()`), since wiring it to
actually reload a different day's tasks would mean simulating app state,
beyond what a static mockup needs to communicate the interaction.

## A `[hidden]` vs. class-selector specificity bug

Both the modal overlay and the tab panels start collapsed using the plain
HTML `hidden` attribute rather than a custom class, since it's the standard
way to hide an element without JS having to remember a class name. The first
render showed the "Edit Task" modal wide open on page load. The cause:
`hidden` only works via the browser's built-in `[hidden] { display: none }`
UA-stylesheet rule, and `.modal-overlay { display: flex; }` in `shared.css`
has the same specificity (one class vs. one attribute selector) — since it
appears later in the cascade, it won by source order and always won. The fix
is a single explicit rule pinning `hidden`'s priority:

```css
[hidden] {
  display: none !important;
}
```

placed near the top of `shared.css`, ahead of any component rule that also
sets `display` on the same element. This is a general trap any time a
`hidden`-toggled element also has its own `display` declared elsewhere in the
stylesheet — worth checking directly in the browser rather than assuming
`hidden` "just works," which is exactly how this one was caught (a live
screenshot showing the modal open by default, not a static code read).

## Commands reference

No new commands were introduced in this step. To preview the mockups
locally, serve the `documentation/artifacts/mockups/` folder with any static
file server (e.g. `python -m http.server` from that directory) and open
`index.html` — opening the files directly via `file://` was blocked by the
browser automation tooling used to verify them, though a real browser opening
them by double-click works fine. See
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the actual app.
