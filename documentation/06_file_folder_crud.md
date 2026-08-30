# Tutorial: CRUD for Notes and Folders

This adds full create/rename/delete for notes and folders, a real folder
hierarchy (subfolders, collapse/expand, tree lines), folder-aware note
creation, and a final fix for the sidebar's resize overlap bug.

## 1. Data model: folders get a parent and a collapsed flag

`NotesContext` folders now carry `parentId` (`null` for a root folder, or
another folder's `id`) and `collapsed` (boolean). Notes carry `folderId`
(`null` for the root). `addFolder(parentId)` and `addNote(title, content,
folderId)` accept these; new context functions round out the CRUD set:

- `renameFolder(id, name)` / `renameNote(id, title)`
- `deleteFolder(id)` — also deletes every descendant folder and any note
  inside them, found via a breadth-first walk over `parentId` links
  (`collectFolderAndDescendantIds` in `NotesContext.jsx`).
- `deleteNote(id)`
- `toggleFolderCollapsed(id)`

## 2. Rendering the tree

`Sidebar.jsx` renders folders recursively: a `FolderNode` component looks up
its own children (`folders.filter(f => f.parentId === folder.id)` and the
equivalent for notes) and renders a nested `FolderNode`/`NoteRow` for each,
wrapped in a `.tree-children` container. That container's CSS
(`margin-left` + `padding-left` + `border-left` in `Sidebar.css`) is what
draws the vertical line connecting a subfolder to its parent — each nesting
level adds one more indent + line automatically, no manual depth math
needed.

Each folder with children shows a chevron button
(`toggleFolderCollapsed`) that swap between a right-pointing and
down-pointing [chevron icon](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/path)
based on `folder.collapsed`; collapsed folders simply don't render their
`.tree-children` block.

## 3. Selecting a folder as the creation target

Clicking a folder's row (not its icons) selects it — tracked as
`selectedFolderId` state in `Sidebar`, toggling off if you click the same
folder again. The **New Folder** button now calls `addFolder(selectedFolderId)`,
so a folder created while another is selected becomes its child (a
subfolder) instead of a root folder.

**New Note** (a new button added below **New Folder**) doesn't create a note
immediately — like the existing "+ New Note" flow, it still needs a title.
Instead it navigates to `/notes/new` carrying the selected folder id in
[router state](https://reactrouter.com/api/hooks/useNavigate):

```jsx
navigate('/notes/new', { state: { folderId: selectedFolderId } })
```

`NoteEditor` reads it back with [`useLocation`](https://reactrouter.com/api/hooks/useLocation)
(`location.state?.folderId ?? null`) when the note is actually saved, so the
note ends up filed under whichever folder was selected at the moment **New
Note** was clicked (or the root, if none was).

## 4. Rename and delete, with a shared confirm modal

Every sidebar row (folder or note) got a pencil (rename) and trash (delete)
icon on its right side. Pencil swaps the row's label for a small
`<input>` (autofocused, pre-filled, `Enter` commits / `Escape` cancels /
blur commits) validated with the same `validateFilename` used for notes,
since folder names are also used as real filesystem folder names.

Delete — both here and the new **Delete Note** button next to **Save Note**
in the editor — opens a reusable `ConfirmModal` component
(`src/components/ConfirmModal.jsx`) instead of a native
[`window.confirm`](https://developer.mozilla.org/en-US/docs/Web/API/Window/confirm)
(which can't be styled and blocks the whole page). It's a plain overlay +
centered dialog with configurable title/message/button labels, so the same
component drives all three confirmation flows (delete note from the editor,
delete note from the sidebar, delete folder from the sidebar) just with
different props. Deleting a note that's currently open navigates back home
afterward; deleting a folder cascades to its descendants via `deleteFolder`.

## 5. Bug fix: sidebar overlapping the New Folder button on resize

The sidebar's width was a pure percentage (`--sidebar-width: 12.5%`), so on
a narrow window it could shrink below what the action buttons need, and
part of the button visually sat under/behind the rest of the sidebar. Fixed
by using [`max()`](https://developer.mozilla.org/en-US/docs/Web/CSS/max) in
`index.css`:

```css
--sidebar-width: max(12.5%, 220px);
```

The sidebar (and the `.app-content` it's paired with via the same variable)
now never gets narrower than 220px, comfortably fitting the action buttons
and sidebar rows at their natural size without needing to scroll
horizontally to see them.

## Commands reference

No new commands were introduced in this step — see
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
