# Tutorial: Fix Live Preview Table Layout

Implements `prompts/29_fix_table_layout.txt` — fixes a column-misalignment
bug in Live Preview's table rendering (added in step 28) and adds the
row/column add-remove controls Live Preview was missing (Side Preview
already had them).

## The misalignment bug

`decorateTableRow` (in `liveMarkdownDecorate.jsx`) renders each table-row
line's cells as `<span class="lp-table-cell">` siblings inside a
`display: table-row` line-div; the browser auto-groups contiguous
table-row-ish line-divs into an anonymous table, which is what makes them
line up in columns at all (see step 28's tutorial for why - the
`contentEditable` root's children must stay exactly one div per raw line, so
the rows can't be wrapped in a real `<table>`).

The bug: the leading/trailing pipes and (while a row is active) its visible
`md-syntax` markers were rendered as bare `<span>` *siblings* of the
`lp-table-cell` spans, not nested inside them. Per CSS 2.1 §17.2.1, a
table-row's in-flow children that aren't themselves table-cells get wrapped
in a browser-generated anonymous cell - so every visible pipe span silently
added a phantom column, shifting that row's real cells out of alignment with
the rows around it. This only showed up once a row's syntax became visible
(i.e. once the caret was on it), matching the reported "gets misaligned each
time the cursor is placed in any of the table cells" - and a table's last row
being permanently indented if it happened to render with a differing set of
edge cells.

The fix: `decorateTableRow` now accumulates pipe/edge syntax spans into a
`pendingSyntax` buffer as it walks a row's tokens, and only flushes them by
nesting them *inside* the next (or, for a trailing pipe, the previous)
`lp-table-cell` span. A row's direct children are now always exactly N
`lp-table-cell` spans (N = the table's column count), regardless of whether
that row is active - so the anonymous table's columns line up consistently
whether a row is showing raw pipes or not.

## Row/column controls in Live Preview

Unlike Side Preview's `MarkdownTable` (a normal React component with its own
local hover state), Live Preview has no per-table wrapper element to attach
hover strips to - its `contentEditable` root's children must remain exactly
one div per line. So the controls are a separate absolutely-positioned
overlay, sized from the table's rendered geometry rather than living in the
document flow:

- `liveMarkdownDecorate.jsx` now exports `computeTableBlocks(lines,
  fenceStates)`, which `computeTableStates` is rewritten to build on top of.
  A block is `{ headerLine, sepLine, endLine, colCount, aligns }` - the raw
  line-range and shape of one table.
- `LiveMarkdownEditor.jsx` keeps a `lineElsRef` array (populated via a ref
  callback on each line-div) and, in its existing per-render
  `useLayoutEffect`, measures each block's header-row and last-visible-row
  `getBoundingClientRect()` to compute a `top/left/width/bottom` overlay box
  relative to `wrapperRef` (mirroring how the link-autocomplete popup is
  already positioned). These boxes are stored in `tableOverlays` state,
  compared before `setState` to avoid re-render loops (the same pattern the
  file already uses for `caretPos`/`linkCtx`).
- For each overlay box, a row-hover strip below it and two column-hover
  strips at its left/right edges are rendered as siblings of the
  `contentEditable` root (not inside it), reusing the row/column control
  look from Side Preview (`.lp-table-row-controls` / `.lp-table-col-controls`
  in `LiveMarkdownEditor.css`).
- Clicking a control calls one of four new `markdown.jsx` exports -
  `insertBlankTableRow`, `removeLastTableRow`, `insertTableColumn`,
  `removeTableColumn` - each taking `(lines, block[, side])` and returning a
  new lines array, which is joined back into a string and passed to
  `onChange`. These mirror `MarkdownTable`'s row/column edit logic but work
  directly off a `block`'s raw line range instead of parsed header/body-row
  arrays, since Live Preview has no such parsed state of its own.

## Commands reference

No new commands were introduced in this step.
