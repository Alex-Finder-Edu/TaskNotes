# Tutorial: Live Preview Mode

Implements `prompts/22_live_preview_mode_notes.txt` - an Obsidian-style "Live
Preview" editing mode for notes, added as a new default view mode alongside
the existing Markdown Edit and Side Preview modes.

## Why a plain `<textarea>` couldn't do this

Live Preview needs each line to show *rendered* markdown (bold text actually
bold, headings actually large) except the line the cursor is on, which shows
the raw markdown syntax so it can be edited. A `<textarea>` can only ever
show plain text, so this mode is a new component,
`LiveMarkdownEditor.jsx`, built on a `contentEditable` `<div>` instead.

## The core trick: never remove markdown syntax from the DOM

The naive approach - parse each line, strip out `**`/`` ` ``/etc., and render
styled elements - would make it impossible to reliably map a click or a
keystroke back to a position in the raw markdown string, because the
rendered text and the raw text would have different lengths and structure.

Instead, `utils/liveMarkdownDecorate.jsx` acts as a *decorator*, not a
parser: every character of a line is always reproduced somewhere in the
output. Syntax characters like `**` or `[[` get wrapped in
`<span class="md-syntax">` (hidden via `display: none` in CSS) instead of
being deleted. This keeps an invisible invariant: a decorated line's
`textContent` is always character-for-character identical to its raw text.

That invariant is what makes `utils/domOffset.js` possible -
`domPositionToRawOffset`/`rawOffsetToDomPosition` convert between "the
cursor is at character 47 of the note" and "the cursor is in this DOM text
node at this offset" by walking `textContent` lengths, with no special
casing needed for what's currently hidden.

The currently active line (wherever the cursor is) skips decoration
entirely and renders as flat, unstyled text - this is deliberate: it's the
simplest way to guarantee the raw markdown is fully visible and editable
exactly as typed, matching the prompt's "markdown characters will be
displayed when cursor is placed on the same line" requirement.

## Editing without letting the browser touch the DOM

`contentEditable` normally lets the browser mutate the DOM directly on every
keystroke, which would fight with React re-rendering the decorated lines.
Instead, every edit is intercepted via a native `beforeinput` listener
(`handleBeforeInput` in `LiveMarkdownEditor.jsx`) that calls
`e.preventDefault()` and manually splices the change into the raw string
based on `e.inputType` (`insertText`, `deleteContentBackward`,
`insertParagraph`, ...). React re-renders from that new string, and the
caret is restored afterwards via `rawOffsetToDomPosition`.

Note: `e.getTargetRanges()` was deliberately **not** used for this, even
though it looks like the "correct" API for `beforeinput`. Chrome computes it
from rendered geometry, and a hidden `md-syntax` span has no visual box - so
a backspace that merges two lines can resolve its target range to just after
the last *visible* character, silently dropping hidden markdown syntax at
the end of the previous line. The selection offsets tracked via
`selectionchange` (computed from `textContent.length`, not geometry) don't
have this problem.

React's synthetic `onBeforeInput` prop also turned out not to fire
reliably for `contentEditable` edits in this React version, so `beforeinput`
and `paste` are attached as native listeners in a `useEffect` instead of as
JSX props.

## Bridging the existing toolbar

The Bold/Italic/Heading/Code/Link toolbar buttons in `NoteEditor.jsx`
(`wrapSelection`, `toggleHeading`) already work against a plain object with
`selectionStart`/`selectionEnd`/`value`/`focus()`/`setSelectionRange()` -
the same shape a `<textarea>` ref has. `LiveMarkdownEditor` exposes exactly
that shape via `useImperativeHandle`, so those functions needed no changes
at all to work in Live Preview mode too.

## Commands reference

No new commands were introduced in this step. See
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
