# Tutorial: Note Toolbar Formatting

Implements `prompts/18_note_edit_buttons.txt` — the formatting toolbar from
[`documentation/artifacts/mockups/notes/02_editing.html`](../artifacts/mockups/notes/02_editing.html)
(Bold, Italic, Heading, Code, Internal link), wired to actually apply
markdown formatting to the current text selection in the note editor.

## Reaching the textarea's DOM node through `LinkAwareTextarea`

The editor's textarea isn't rendered directly in `NoteEditor.jsx` - it's
wrapped by `LinkAwareTextarea` (which layers `[[note]]` autocomplete on top).
Applying formatting needs direct access to the underlying `<textarea>`'s
`selectionStart`/`selectionEnd`/`setSelectionRange`, so
`LinkAwareTextarea` is now wrapped in `forwardRef` with
`useImperativeHandle(forwardedRef, () => textareaRef.current)` - exposing
the raw DOM node itself rather than a custom API, since the toolbar needs
the same primitives a plain `<textarea ref>` would give it. `NoteEditor`
passes one `editorRef` to whichever of its two `LinkAwareTextarea` instances
is currently mounted (markdown-only view vs. split view render one each,
never both), so the toolbar works in either view mode.

## Wrap/unwrap as one function, not five

`wrapSelection(open, close)` in `NoteEditor.jsx` handles Bold (`**`/`**`),
Italic (`*`/`*`), Code (`` ` ``/`` ` ``) and the internal link button
(`[[`/`]]`) - one function parameterized by the marker pair rather than one
per button. It also toggles: if the selection is already surrounded by the
markers (checked from outside the selection, e.g. selecting just `bold`
inside `**bold**`) or already contains them (selecting `**bold**` itself),
clicking again removes them instead of double-wrapping. An empty selection
still inserts both markers with the cursor left between them, so the button
works whether or not text is selected - not just when text is selected, even
though that's the primary case the prompt describes.

`toggleHeading()` is separate since it's a line prefix (`## `) rather than a
wrap: it locates the start/end of the line containing the selection and
toggles the prefix there, independent of what's actually selected within
that line.

## Restoring the selection after a programmatic edit

Calling `setContent(newValue)` re-renders the controlled `<textarea>` with
new text, which drops whatever the browser's native selection was. Both
formatting functions compute where the selection *should* end up (e.g. the
wrapped text, still selected, shifted by the marker length) and stash it in
a `pendingSelectionRef`, then a `useLayoutEffect` with no dependency array
(so it runs after every render, mirroring the same pattern already used
inside `LinkAwareTextarea` for its `[[` auto-close feature) applies it via
`el.focus(); el.setSelectionRange(start, end)` once the DOM has the new
value. Running after every render is cheap here since the effect is a no-op
whenever `pendingSelectionRef.current` is `null`.

## Commands reference

No new commands were introduced in this step. See
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
