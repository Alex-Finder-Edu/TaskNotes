# Tutorial: Fix Table Rendering and Editing

Implements `prompts/28_fix_render_live_preview_table.txt` — makes Live
Preview render tables as real grids like Side Preview does, and fixes four
Side Preview table bugs: an oversized initial width, a stray scrollbar, a
background flash on cell focus, and an inability to type a trailing space
into a cell. Also makes Enter insert a new row directly below whichever cell
the caret is in, not just the table's last row.

## Live Preview table rendering

Live Preview (`LiveMarkdownEditor.jsx`) renders one `contentEditable` line
per raw line of text; before this change a table's `| a | b |` rows just
fell through to plain-paragraph decoration; showing raw pipes instead of a
grid. `utils/liveMarkdownDecorate.jsx` gains:

- `computeTableStates(lines, fenceStates)` — a per-line pass mirroring the
  block-level table detection already in `markdown.jsx`'s `renderMarkdown`
  (reusing its now-exported `isTableRow`/`isTableSeparator`/`splitTableRow`/
  `parseTableAligns` helpers), tagging each line as a table `header`,
  `separator`, or `body` row plus that table's column alignments.
- `decorateTableRow(...)` — decorates one table-row line. Header/body cells
  get wrapped in `<span class="lp-table-cell">`; the leading/trailing pipes
  (and interior `|` separators) get wrapped in the same hidden-unless-active
  `md-syntax` span used elsewhere in this file. The separator row is either
  shown as plain raw text (caret on it) or not rendered at all (`display:
  none`, caret elsewhere).

The key trick making this look like an actual table without restructuring
the DOM (`domOffset.js` requires `root.children` to stay exactly one `<div>`
per line, so lines can't be wrapped in a `<table>`): giving each table-row
line's div `display: table-row` and its cells `display: table-cell`. Browsers
auto-generate an anonymous table around any contiguous run of table-row-ish
boxes, so header/body rows still get real column-aligned table layout - and
because a hidden (`display: none`) separator row contributes no box, hiding
it doesn't break that contiguous run, so header and body stay in the same
anonymous table.

`LiveMarkdownEditor.jsx` computes `tableStates` alongside the existing
`fenceStates` and, per line, calls `decorateTableRow` instead of `decorateLine`
when the line is part of a table. `LiveMarkdownEditor.css` adds the
`lp-table-row`/`lp-table-header`/`lp-table-cell`/`lp-table-separator(-active)`
rules.

## Side Preview fixes (`markdown.jsx` / `NoteEditor.css`)

- **Trailing-space bug**: `splitTableRow` used to `.trim()` each cell, so
  every keystroke's commit -> re-parse round trip silently stripped a
  trailing space the instant it was typed. Replaced with `stripPadding`,
  which removes at most one leading and one trailing space (the single
  padding space `serializeTable` always adds around a cell), so any
  additional space the user types is preserved across the round trip.
- **Enter inserts a row below any cell**: `MarkdownTable`'s per-cell
  `onKeyDown` now calls `insertRowAfter(rowIdx)` (header is `rowIdx: -1`)
  instead of the old `handleFinalRowKeyDown`, which only fired on the
  table's last row.
- **Initial width**: cell `<input>`s no longer `flex: 1; width: 100%`
  (which reported an effectively unbounded max-content width to the table's
  auto-layout algorithm, stretching the table to fill the pane). Each column
  now gets a `size` attribute computed from its widest current cell text
  (`colSizes` in `MarkdownTable`), and `.md-table` is `width: auto`.
- **Scrollbar**: `.md-table-scroll` changed from `overflow-x: auto` to
  `overflow: visible`.
- **Cell focus background**: removed `.md-table-cell-input:focus`'s
  `background`/`border-radius` override.
- **+/- buttons**: `.md-table-col-controls button` / `.md-table-row-controls
  button` are bigger (26px, up from 18px) with a permanent `--accent-bg`
  background (previously transparent, only tinted on hover).

## Commands reference

No new commands were introduced in this step.
