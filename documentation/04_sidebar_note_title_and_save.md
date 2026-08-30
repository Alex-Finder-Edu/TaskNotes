# Tutorial: Sidebar, Note Titles, and Saving Notes

This adds a persistent sidebar (folders + notes) and turns the note editor
into something that can actually save a titled note.

## 1. Shared state with React Context

The sidebar (which lists notes/folders) and the note editor (which creates
them) are different routed pages, but need to read and update the same data.
Passing props down manually ("prop drilling") doesn't work once components
aren't directly nested, so this uses [React Context](https://react.dev/learn/passing-data-deeply-with-context):

- [`createContext`](https://react.dev/reference/react/createContext) defines
  a context object.
- A `NotesProvider` component (in `src/context/NotesContext.jsx`) wraps the
  whole app in `App.jsx` and holds the actual `{ notes, folders }` state via
  [`useState`](https://react.dev/reference/react/useState), exposing
  `addNote` and `addFolder` functions.
- A `useNotes()` hook wraps [`useContext`](https://react.dev/reference/react/useContext)
  so any component (`Sidebar`, `NoteEditor`) can read/update the shared state
  without prop drilling.

The workspace (notes + folders) is also persisted to the browser's
[`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
via a [`useEffect`](https://react.dev/reference/react/useEffect) that runs
whenever the state changes, so notes survive a page reload.

## 2. The sidebar

`src/components/Sidebar.jsx` is fixed to the left of the viewport
(`position: fixed`) with a default width of `12.5%` of the page, set via a
CSS custom property (`--sidebar-width` in `index.css`) so it's defined in one
place. Because it's rendered in `App.jsx` outside of `<Routes>`, it stays
mounted and visible across every page/route.

The rest of the app (`Topbar` + routed page content, wrapped in `.app-content`
in `App.jsx`) is offset with `margin-left: var(--sidebar-width)` so it never
sits under the fixed sidebar.

A **New Folder** button at the top of the sidebar calls `addFolder()`, which
creates a folder named "New Folder" (or "New Folder 1", "New Folder 2", ... if
that name is taken) and appends it to the shared list — immediately visible in
the sidebar. Folders and notes are both listed underneath.

### Icons

Icons (folder-plus, folder, note, floppy disk) are inline SVGs (no icon
library dependency) using [`currentColor`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#currentcolor_keyword)
for their stroke so they follow the surrounding text color automatically,
including in dark mode.

> **Gotcha**: an SVG's `width`/`height` HTML attributes alone weren't enough
> to size it correctly inside a flex container in testing — the browser
> computed a `0px` width. Each icon's CSS explicitly sets `width`/`height`
> (e.g. `.sidebar-item svg { width: 16px; height: 16px; }`) to force correct,
> reliable sizing.

## 3. Note title, filename validation, and saving

On the note editor page (`src/pages/NoteEditor.jsx`), the old "← Back" link
was replaced with a title [`<input>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input)
(no label — just a `placeholder="Enter title here"`) at the same height the
back button occupied, with a **Save Note** button to its right.

Since the title doubles as a filename, it's validated with
`src/utils/filename.js` before saving, rejecting:

- Empty titles.
- Characters invalid in Windows filenames — `< > : " / \ | ? *` and control
  characters (also invalid or reserved on macOS/Linux, so this one rule
  keeps the filename valid across all three).
- Names ending in a space or period (disallowed by Windows, e.g. `"notes "`
  or `"notes."`).
- Windows [reserved device names](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#naming-conventions)
  (`CON`, `PRN`, `AUX`, `NUL`, `COM1`-`COM9`, `LPT1`-`LPT9`).
- Names longer than 255 characters.

An invalid title shows an inline error and blocks saving. A valid save calls
`addNote(title, content)` from `NotesContext`, which immediately shows up in
the sidebar list since both components share the same context state.

## Commands reference

No new commands were introduced in this step — see
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
