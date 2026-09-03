# Tutorial: Bug Fixing & UI Changes

Implements `prompts/19_bug_fixing_and_ui_changes.txt` — five fixes plus one
investigated-but-not-reproduced console error.

## 1. Multi-line preview collapsing to one line

`utils/markdown.jsx`'s block parser gathered consecutive non-blank lines into
a paragraph, then joined them with `paraLines.join(' ')` before parsing
inline formatting - a deliberate choice for standard markdown "soft line
break" semantics, but not what this app's users expect from a preview that's
supposed to mirror the editor 1:1. Fixed by joining with `'\n'` instead (same
fix applied to blockquotes), plus `white-space: pre-wrap` on
`.note-editor-preview p`/`blockquote` in `NoteEditor.css` - without it the
`\n` characters are present in the DOM but collapse visually under normal
CSS whitespace handling.

## 2. Toolbar position

The formatting toolbar from [`16_note_toolbar_formatting.md`](./16_note_toolbar_formatting.md)
rendered as its own row below `.note-editor-button-row`. Moved into that row,
between `.note-editor-actions` (Save/Delete) and `.note-view-toggle` (Side
Preview/Markdown Edit) - a JSX reorder only, no new CSS needed since
`.note-toolbar` was already a flex item.

## 3. Disambiguating same-named notes in the link autocomplete

`LinkAwareTextarea` only rendered `note.title` per autocomplete row - two
notes named "Ideas" in different folders were indistinguishable while typing
`[[`. It now takes a `folders` prop (passed from `NoteEditor`) and renders a
second, smaller line per row via `folderPathLabel()` (a thin wrapper around
`getFolderPath` from `NotesContext`, joining ancestor folder names with
`" / "`, or `"Root"` for a top-level note) - the same breadcrumb style
already used by the note editor's own breadcrumb bar.

## 4. Drag-and-drop target area

Folders previously only accepted a drop (and only showed the hover
highlight) when the pointer was exactly over the folder's own row -
`onDragOver`/`onDragEnter`/`onDragLeave`/`onDrop` lived on
`.sidebar-folder-row`. They've moved up to wrap the entire `.tree-node` (row
+ its expanded `.tree-children`), so hovering anywhere in a folder's block -
including over its own notes or the empty space around them - counts as
hovering that folder.

This introduces the classic HTML5 drag-and-drop flicker problem: `dragenter`/
`dragleave` bubble like `mouseover`/`mouseout`, so moving the pointer between
child elements inside that same block re-fires enter/leave pairs that bubble
up. A plain boolean would flash the highlight off every time the pointer
crossed a child element's edge. The fix is the standard counter pattern -
`dragCounterRef` increments on every `dragenter` and decrements on every
`dragleave`, with the highlight only clearing when the count returns to zero
- so the highlight stays on continuously while the pointer is anywhere in the
block, not just while it's over one specific element within it.

Nested folders still isolate correctly without extra work: each `FolderNode`
recursively wraps its *own* `.tree-node` in the same handlers with
`e.stopPropagation()`, so hovering inside a nested subfolder's block
increments *that* subfolder's counter and never reaches its parent's - the
parent only highlights for pointer movement in the parts of its block not
already claimed by a child folder.

The CSS moved with it: `.sidebar-folder-row.drag-over`'s dashed
outline/background became `.tree-node.drag-over`, so the highlight now
visually covers the whole dropped-on area instead of just the row.

## 5. Folder path on Graph View hover

Each node's `<title>` (a plain OS tooltip showing just the note title) is
replaced with hover state (`hoveredNoteId`, set via `onMouseEnter`/
`onMouseLeave` on the node's `<g>`) that conditionally renders a second SVG
`<text>` line below the note title, positioned via the same `nodeRadius`
math already used for the title's own offset. It reuses the same
`folderPathLabel()`/`getFolderPath()` pattern as fix #3 rather than duplicating
breadcrumb logic. A plain SVG `<title>` can't be multi-line or styled, which
is why this needed a real element instead of extending the native tooltip.

## 6. The reported console error

```
Uncaught TypeError: Cannot read properties of undefined (reading 'startTime')
    at et.reportAllChanges (<anonymous>:2:19429)
```

`reportAllChanges` is a real option name from the `web-vitals` library, but
this repo has no such dependency (`grep`ed `package.json` and `src/` for
`web-vitals`, `reportAllChanges`, and `PerformanceObserver` - no matches),
and the stack trace's `<anonymous>` frames with no source file mean it isn't
part of this app's bundle at all. Loading the app fresh and reading the
console (via the browser devtools MCP tooling) showed no such error from
this app. This is almost certainly a browser extension's content script
(e.g. a performance/web-vitals monitoring extension) running in the page
context - nothing in this codebase to fix. Flagging this back rather than
making a speculative change against a bug that isn't reproducible from our
own code.

## Commands reference

No new commands were introduced in this step. See
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
