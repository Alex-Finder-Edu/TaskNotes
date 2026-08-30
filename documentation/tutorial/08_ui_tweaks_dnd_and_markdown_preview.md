# Tutorial: Inline-Edit on Create, Drag-and-Drop, Duplicate-Title Validation, and Markdown Preview

Implements `prompts/10_ui_tweaks.txt`.

## 1. New Folder/New Note now enter edit state immediately

`addFolder(parentId)` in `NotesContext.jsx` now generates the new folder's
`id` up front (outside the `setWorkspace` updater) and returns it, instead of
being a fire-and-forget call:

```js
function addFolder(parentId = null) {
  const id = crypto.randomUUID()
  setWorkspace((prev) => {
    /* ...build the folder using id... */
  })
  return id
}
```

`Sidebar.jsx` uses that returned id to drive a new `pendingEditFolderId`
state, passed down through the recursive `FolderNode` tree as `autoEditId` /
`onAutoEditConsumed`. Each `FolderNode` seeds its local `editing` state from
`folder.id === autoEditId` and, in a mount-only effect, calls
`onAutoEditConsumed()` if it matched — clearing the pending id so it can't
accidentally reopen a rename field if the same folder unmounts/remounts later
(e.g. via collapse/expand).

If a folder is selected when **New Folder** is clicked, that folder is
expanded first (`expandFolders(new Set([selectedFolderId]))`, a function
`NotesContext` already had internally for the breadcrumb's `focusFolder` and
which is now also exported) so the new child folder's edit field is visible
rather than hidden inside a collapsed parent.

**New Note** got the same expand-on-select treatment. Since new notes are
edited on their own page rather than inline in the sidebar, "edit state" for
a note means autofocusing `NoteEditor`'s title input:

```jsx
useEffect(() => {
  if (!noteId) {
    titleInputRef.current?.focus()
  }
}, [noteId, location.key])
```

`location.key` (unique per navigation, from `useLocation()`) is in the
dependency list alongside `noteId` so this refires even when clicking **New
Note** again while already sitting on the new-note screen — a plain `noteId`
dependency wouldn't change in that case since the route pattern (`/notes/new`)
is the same both times.

## 2. Duplicate note-title validation

`NoteEditor.jsx`'s `handleSave` now checks, after filename validation passes,
whether any other note in the same target folder already has the same title
(case-insensitive, trimmed):

```js
const isDuplicate = notes.some(
  (note) =>
    note.folderId === targetFolderId &&
    note.id !== existingNote?.id &&
    note.title.trim().toLowerCase() === trimmedTitle.toLowerCase(),
)
```

`targetFolderId` is `existingNote.folderId` when editing, or
`location.state?.folderId` when creating — matching whatever folder the save
will actually land the note in. On a match, save is blocked and an error
renders in the same `.note-title-error` slot used for filename errors.

## 3. Drag-and-drop reparenting

A small shared helper, `src/utils/dnd.js`, wraps the native HTML5 drag data
transfer behind a single custom MIME type (`application/x-notetasks-item`) so
folders and notes can be told apart on drop:

```js
export const DND_MIME_TYPE = 'application/x-notetasks-item'
export function setDragPayload(e, type, id) { /* dataTransfer.setData(...) */ }
export function readDragPayload(e) { /* JSON.parse(dataTransfer.getData(...)) */ }
```

Both `NoteRow` and `FolderNode` in `Sidebar.jsx` are `draggable` (disabled
while renaming, so drag doesn't fight text selection in the rename input).
`FolderNode`'s row is also a drop target — `onDragOver`/`onDrop` call the two
new `NotesContext` mutators:

```js
function moveFolder(id, parentId) {
  // no-op if id === parentId, or if parentId is id's own descendant
  // (collectFolderAndDescendantIds guards against disconnecting the tree)
}
function moveNote(id, folderId) {
  // just reassigns note.folderId
}
```

Dropping a folder onto itself or one of its own descendants is a no-op
(guarded in `moveFolder` itself, and short-circuited before the call for the
self-drop case). Each folder row's drop handler calls `e.stopPropagation()`
so a drop lands on the *innermost* folder under the cursor rather than also
bubbling up.

`.sidebar-list` itself is a drop target too, for moving something back to the
root (`parentId`/`folderId` of `null`). This needed one CSS fix:
`.sidebar-list` previously shrink-wrapped its content height, so dropping
into the empty space *below* the tree (a natural place to aim for "move to
root") landed on the plain `.sidebar` container instead, which has no drop
handlers and silently did nothing. Adding `flex: 1` to `.sidebar-list` makes
it fill the sidebar's remaining height, so the whole area below the tree is
a valid root-drop target.

Folder rows get a `.drag-over` class (dashed outline) while something is
dragged over them, toggled via `onDragEnter`/`onDragLeave`.

## 4. Markdown Side Preview / Markdown Edit toggle

Two new tab-style buttons render above `NoteEditor`'s title/save row —
**Side Preview** (default) and **Markdown Edit** — backed by a `viewMode`
state (`'preview' | 'markdown'`). `Markdown Edit` shows the textarea exactly
as before, full width. `Side Preview` renders a flex row: the same editable
textarea on the left, and a live-rendered preview panel on the right that
updates on every keystroke.

Rather than adding a markdown-parsing dependency and rendering its HTML
output via `dangerouslySetInnerHTML` (an XSS surface for user-authored
content), `src/utils/markdown.jsx` is a small dependency-free parser that
builds React elements directly. It covers the common subset: headings,
`**bold**`/`*italic*`, `` `inline code` ``, fenced code blocks, blockquotes,
unordered/ordered lists, horizontal rules, links, and paragraphs. Link
`href`s are passed through a `SAFE_URL_PATTERN` allowlist
(`http(s)/mailto/#//`) before being used, so a stray `javascript:` link
in note content can't execute on click.

```js
export function renderMarkdown(markdown) {
  // block-level parser: walks lines, groups them into headings / code
  // fences / blockquotes / lists / paragraphs, and calls parseInline()
  // on each span of text for **bold**, *italic*, `code`, and [links](url)
}
```

## Commands reference

No new commands were introduced in this step — see
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
