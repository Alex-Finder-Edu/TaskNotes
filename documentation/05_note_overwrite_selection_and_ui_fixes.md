# Tutorial: Overwriting Notes, Selecting Notes, and UI Fixes

This step turns the sidebar into a real navigation list — clicking a note
opens it for editing, saving overwrites that note instead of duplicating it —
and fixes a couple of small UI bugs found along the way.

## 1. A route per note

Previously the only route was `/notes/new`. A second, dynamic route was
added in `App.jsx`:

```jsx
<Route path="/notes/new" element={<NoteEditor />} />
<Route path="/notes/:noteId" element={<NoteEditor />} />
```

[Dynamic segments](https://reactrouter.com/start/framework/routing#dynamic-segments)
(`:noteId`) match any value in that URL position. [`useParams`](https://reactrouter.com/api/hooks/useParams)
reads it back out inside `NoteEditor`. React Router ranks the static
`/notes/new` route above the dynamic `/notes/:noteId` one automatically, so
visiting `/notes/new` still opens a blank editor rather than looking for a
note literally titled `new`.

## 2. Loading and overwriting a note

`NoteEditor` now looks up `noteId` (if present) in the shared `notes` list
from `NotesContext` and, if found, initializes the title/content fields from
it. A [`useEffect`](https://react.dev/reference/react/useEffect) re-syncs
those fields whenever `noteId` changes (i.e. the user navigates to a
*different* note) — deliberately not on every context update, so an in-flight
edit isn't wiped out immediately after a save.

`NotesContext` gained an `updateNote(id, title, content)` function alongside
the existing `addNote`. `handleSave` in `NoteEditor` now branches:

- **Existing note open** (`noteId` matches a note already in the list) →
  `updateNote(...)`, overwriting it in place.
- **New, unsaved note** → `addNote(...)`, then
  [`navigate`](https://reactrouter.com/api/hooks/useNavigate) to
  `/notes/<new id>` (with `replace: true`, so the blank `/notes/new` entry
  doesn't linger in browser history) so the *next* save on that same note
  updates it instead of creating another one.

This fixes the bug where clicking **Save Note** always created a new note,
even when one was already open.

## 3. Selecting a note from the sidebar

Each note in `Sidebar.jsx` is now a [`<NavLink>`](https://reactrouter.com/api/components/NavLink)
to `/notes/<id>` instead of a plain `<div>`. `NavLink` behaves like `Link`
but also reports whether its target route is currently active, used here to
highlight the open note (`isActive` → an `active` CSS class).

## 4. Tooltip on hover

Long note titles are truncated with an ellipsis in the sidebar (`text-overflow:
ellipsis`), so the full title might not be visible. Each note link sets the
native HTML [`title` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/title)
to the note's title, which the browser shows as a tooltip on hover — no
extra JS or component needed.

## 5. Bug fix: "New Folder" button truncating on resize

The **New Folder** button (`width: 100%` inside the sidebar's flex column)
had no `min-width`, so as the sidebar shrank (it's sized as a percentage of
the viewport) the button shrank with it and its label got clipped. Fixed by
giving the button `min-width: max-content` (the width needed to fit its icon
+ label without wrapping) so it never shrinks past that point, and adding
`overflow-x: auto` to the sidebar so on very narrow windows the sidebar
scrolls horizontally instead of clipping the button.

## Commands reference

No new commands were introduced in this step — see
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
