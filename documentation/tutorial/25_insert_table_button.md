# Tutorial: Insert Table Button

Implements `prompts/27_add_insert_table_button.txt` — a note-toolbar button
that inserts a 2x2 Markdown table, plus interactive editing for tables
rendered in the Side Preview pane: hover controls to add/remove rows and
columns, Enter-to-add-a-row, and sortable columns.

## Toolbar button

`NoteEditor.jsx` gets a new `insertTable()` handler alongside the existing
`wrapSelection`/`toggleHeading` toolbar actions, wired to a new `TableIcon`
button placed after the internal-link button. It reads the current
selection out of `editorRef` (the same ref shared by all three editor
surfaces - Markdown Edit, Live Preview, and the split-view textarea) and
splices in:

```
| Header 1 | Header 2 |
| --- | --- |
| Cell 1 | Cell 2 |
| Cell 3 | Cell 4 |
```

Blank lines are padded in before/after the table only where needed (no
padding at the very start/end of the note, a single `\n` if already at a
line start, `\n\n` otherwise) so the inserted table always starts life as
its own block instead of fusing into a neighboring paragraph.

## Parsing tables in `markdown.jsx`

`renderMarkdown`'s block loop gained a table case: a line containing `|`
immediately followed by a separator line (cells matching `:?-+:?`) is
parsed as a table. `splitTableRow` splits a row on unescaped `|`
(`\|` stays a literal pipe), `parseTableAligns` reads left/center/right
alignment from the separator line, and body rows are collected until a
non-table line and normalized to the header's column count. `isBlockBoundary`
now also treats a table row as a boundary, so a table is never swallowed
into a preceding paragraph.

A valid table (`MarkdownTable`) is only rendered when the header and
separator have the same cell count; otherwise the line falls through to the
existing paragraph handling as it did before.

## Editable `MarkdownTable`

Table cells render as plain `<input>`s (raw cell text, not further parsed as
inline markdown - keeping cell editing simple was a deliberate scope cut)
bound directly to the note's Markdown source. Every edit - a keystroke, a
row/column add or remove, a sort - rebuilds the table's Markdown lines with
`serializeTable` and calls `linkContext.onTableChange(startLine, endLine,
newLines)`, which `NoteEditor.jsx` uses to splice those lines back into
`content` by line index. There's no separate "table state" - the rendered
table is always a direct function of the note's raw text, the same as
everything else `renderMarkdown` produces.

- **Add/remove rows**: hovering the strip directly below the table's last
  row reveals a `+`/`-` control (`.md-table-row-hover`); `+` appends a blank
  row, `-` removes the last one. Pressing Enter in any cell of the table's
  current last row does the same as clicking `+` (`handleFinalRowKeyDown`,
  attached to the header row's inputs when there are no body rows yet, or to
  the last body row's inputs otherwise).
- **Add/remove columns**: hovering a thin strip on the table's left or right
  edge (`.md-table-col-hover-{left,right}`, positioned just outside the
  `<table>` via absolute positioning) reveals a `+`/`-` control for that
  edge only, matching the "edge columns" wording in the prompt rather than
  offering per-column controls. `-` is disabled once a single column
  remains.
- **Sorting**: each header cell has a sort button; clicking it sorts the
  body rows by that column (numeric compare when both cells parse as
  numbers, natural string compare otherwise) and toggles direction on
  repeated clicks. Sorting is implemented as a real edit - it reorders and
  persists the underlying Markdown rows via the same `onTableChange` path -
  rather than a separate, unsaved display-only ordering.

`NoteEditor.jsx` passes `onTableChange` into `renderMarkdown`'s `linkContext`
only for the Side Preview pane (the one place in the app that renders full
Markdown blocks read-write). Live Preview's line-by-line contentEditable
surface and the raw Markdown Edit textarea are untouched - a table typed or
pasted there still shows as literal `| a | b |` text until switched to Side
Preview, consistent with how those two modes already treat other block-level
constructs.

## Commands reference

No new commands were introduced in this step.
