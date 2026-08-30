# Tutorial: Note Editor Toolbar Layout

Implements `prompts/10_ui_tweaks_2.txt` — a pure layout/markup pass over `NoteEditor.jsx`, no behavior changes.

## Restructured button row

Previously the title input and the Save/Delete buttons shared one row
(`.note-editor-header`), with the view-mode toggle buttons in their own row
above it. Now:

```
breadcrumb
note-title-input               (own row, full width)
note-editor-button-row:
  note-editor-actions: [Save Note] [Delete Note]
  note-view-toggle:    [Side Preview] [Markdown Edit]
error (if any)
textarea / split preview
```

`.note-editor-button-row` is a flex row with a 24px gap between its two
child groups (`.note-editor-actions` and `.note-view-toggle`, each a smaller
12px/6px gap internally) so the two button categories — note actions vs.
view mode — read as visually distinct clusters rather than one undifferentiated
row of four buttons.

## Consistent button height

`.view-toggle-button` previously had no explicit height (`padding: 6px 12px`
sizing it via line-height), which didn't reliably match the `36px` height on
`.save-note-button`/`.delete-note-button`. It now sets `height: 36px` and
`padding: 0 12px` the same way the other two do, so all four buttons in the
row line up exactly.

## Icons for the view-toggle buttons

Added two new inline SVG icon components in `NoteEditor.jsx`, matching the
existing `SaveIcon`/`TrashIcon` style (24x24 viewBox, `currentColor` stroke):
`SplitViewIcon` (two side-by-side rectangles, for **Side Preview**) and
`CodeIcon` (`</>`-style angle brackets, for **Markdown Edit**).

## Commands reference

No new commands were introduced in this step — see
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
