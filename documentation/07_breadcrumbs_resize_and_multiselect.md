# Tutorial: Breadcrumbs, Resizable Sidebar, and Folder Multi-Select

## 1. A breadcrumb above the note title

`NoteEditor.jsx` now renders a breadcrumb (e.g. `Folder 1 / Subfolder 2 /
Note Name`) above the title/save row. It's built by walking a note's folder
up through `parentId` links to the root — `getFolderPath(folders, folderId)`,
a small helper exported from `NotesContext.jsx`:

```js
export function getFolderPath(folders, folderId) {
  const path = []
  let current = folderId ? folders.find((f) => f.id === folderId) : null
  while (current) {
    path.unshift(current)
    current = current.parentId ? folders.find((f) => f.id === current.parentId) : null
  }
  return path
}
```

For a brand-new, unsaved note the path is computed from
`location.state.folderId` (the folder that was selected when **New Note**
was clicked — see [`06_file_folder_crud.md`](./06_file_folder_crud.md)), so
you can see where a note *will* be saved before you save it. The final
breadcrumb segment is always the current title (`"Untitled Note"` while
empty), and it isn't a link — only the folder segments are.

Clicking a folder segment calls a new context function, `focusFolder(id)`,
which expands that folder *and every ancestor above it* (so it's actually
visible in the sidebar tree, even if collapsed) and selects it, giving it
the same highlighted style as clicking it directly in the sidebar.

## 2. Clicking a folder's name now also toggles it open/closed

Previously only the small chevron button toggled a folder's
expanded/collapsed state; clicking the folder's name only selected it.
Now clicking anywhere on a folder's row (not the pencil/trash icons) does
both — selects the folder *and* toggles its collapsed state — matching the
common file-explorer pattern of a single click doing both at once
(`FolderNode`'s `handleNameClick` in `Sidebar.jsx`).

## 3. Draggable, resizable sidebar

The sidebar's width was previously fixed at `max(12.5%, 220px)`. A thin
resize handle (`.sidebar-resize-handle`, absolutely positioned along the
sidebar's right edge) was added so the user can drag it.

Rather than lifting width state up to a shared parent, `Sidebar.jsx` handles
this locally: while dragging, it writes the new width directly onto the
[CSS custom property](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
`--sidebar-width` via `document.documentElement.style.setProperty(...)`. Both
`.sidebar`'s `width` and `.app-content`'s `margin-left` already read
`var(--sidebar-width)`, so this one write keeps them in sync without any
prop drilling.

```jsx
useEffect(() => {
  const root = document.documentElement
  if (widthOverride === null) {
    root.style.removeProperty('--sidebar-width') // falls back to the CSS default
  } else {
    root.style.setProperty('--sidebar-width', `${widthOverride}px`)
  }
}, [widthOverride])
```

Dragging is tracked with a `useRef` flag (so the `mousemove` listener - which
would otherwise re-subscribe on every render - can stay mounted once) plus
[`window.addEventListener('mousemove'/'mouseup', ...)`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
so the drag keeps tracking even if the cursor leaves the thin handle itself.
The new width is clamped between `220px` and `85%` of the viewport width, so
`.app-content` (which also got an explicit `min-width: 15%` in `index.css` as
a CSS-level backstop) never gets squeezed away entirely.

Double-clicking the handle calls `setWidthOverride(null)`, clearing the
inline override and reverting to the original `max(12.5%, 220px)` default.

## 4. Shift-click range-select and bulk folder delete

`NotesContext` now tracks folder selection itself (`selection: { anchorId,
selectedIds }`) instead of the sidebar holding local state, since the
breadcrumb (a different page) needs to affect it too. `selectFolder(id,
{ shift })`:

- **Plain click**: selects just that folder (or deselects it, if it was
  already the sole selection) and becomes the new "anchor" for any following
  shift-click.
- **Shift-click**, when the target shares the same parent as the anchor:
  selects every folder between the anchor and the target (inclusive) among
  that parent's children — a classic range-select, using the same sibling
  ordering the tree renders in.
- **Shift-click on a non-sibling**: falls back to a plain single selection of
  the clicked folder (there's no sensible "range" across different parents).

When more than one folder is selected, a **Delete N selected folders**
button appears in the sidebar's action area, styled like the existing danger
buttons. It opens the same `ConfirmModal` used everywhere else, and on
confirm calls `deleteFolders(ids)` — which cascades through
`collectFolderAndDescendantIds` for *each* selected folder the same way the
single-folder `deleteFolder` does, so nested subfolders/notes are cleaned up
too.

## 5. Bug fix found while testing: deleting an open note out from under the editor

While testing cascading folder deletes, deleting a folder that contained the
*currently open* note left the editor showing stale content instead of
navigating away (unlike the dedicated "Delete Note" button, which already
navigated home). The redirect-when-missing check in `NoteEditor.jsx` was
only running inside the effect that re-syncs `title`/`content` on note
switch, which deliberately doesn't re-run on every `notes` change (see
[`05_note_overwrite_selection_and_ui_fixes.md`](./05_note_overwrite_selection_and_ui_fixes.md)).
Split into its own effect that *does* depend on `notes`:

```jsx
useEffect(() => {
  if (noteId && !existingNote) {
    navigate('/', { replace: true })
  }
}, [noteId, existingNote, navigate])
```

so any deletion path - the note's own delete button, its sidebar row, or a
cascading folder delete - now consistently navigates away when the open note
stops existing.

## Commands reference

No new commands were introduced in this step — see
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
