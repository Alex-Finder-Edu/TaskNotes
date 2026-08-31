# Tutorial: Internal Note Links (`[[...]]`)

Implements `prompts/12_add_internal_links.txt` — an Obsidian-style internal
link feature: typing `[[` auto-pairs a closing `]]`, an autocomplete shows
matching notes, and the resulting `[[Note Title]]` renders as a clickable
link in the preview pane.

## Auto-pairing `[[`

`LinkAwareTextarea` (`app/src/components/LinkAwareTextarea.jsx`) intercepts
`onKeyDown` for the `[` key. If the character immediately before the cursor
is already `[` (i.e. this keystroke completes a `[[` pair) and nothing is
selected, the default keystroke is prevented and the component manually
splices in `[` + `]]`, then places the cursor between the two bracket pairs.

Controlled `<textarea>`s reset `selectionStart`/`selectionEnd` to the end of
the value on every React re-render unless told otherwise, so the desired
cursor position is stashed in a ref (`pendingSelectionRef`) and applied in a
`useLayoutEffect` that runs after each render — right after the DOM value
updates, before the browser paints.

## Autocomplete: filtering and positioning

On every selection change (`onSelect`) or programmatic cursor move, the
component looks backward from the cursor for the nearest `[[`, and forward
for the matching `]]`. If the cursor sits between them, that's "link
context": the substring between the brackets becomes the filter query
against `notes` (a case-insensitive substring match on title), capped at 50
results so the list stays scrollable rather than unbounded.

Positioning the dropdown under the caret is the fiddly part — a plain
`<textarea>` exposes no API for a caret's pixel coordinates. The standard
workaround (used here) is a hidden "mirror" `<div>`: it copies the
textarea's box model and font metrics (padding, border, font family/size/
weight, line-height, letter-spacing) via `getComputedStyle`, fills it with
the text up to the caret, appends a marker `<span>` for the caret character,
measures that span's `offsetTop`/`offsetLeft`, and removes the div. Caret
Y also gets `- textarea.scrollTop`, X gets `- textarea.scrollLeft`, so the
dropdown tracks correctly if the note is scrolled.

## Selecting a match

Arrow Up/Down move a highlighted index (looping); Enter selects the
highlighted note; Escape closes the dropdown without changing anything, so
`[[Nonexistent]]` typed and then escaped stays as literal text rather than
being auto-resolved. Clicking a list item uses `onMouseDown` with
`preventDefault()` (not `onClick`) — this stops the textarea from ever
blurring, so the selection can be applied by directly editing
`textarea.value`'s backing state without having to refocus.

Selecting a match replaces the text between the brackets with the note's
title and repositions the cursor right after the closing `]]`, using the
same `pendingSelectionRef` + `useLayoutEffect` mechanism as the auto-pairing
step.

## Rendering `[[Title]]` as a link

`renderMarkdown` (`app/src/utils/markdown.jsx`) gained a new inline token in
`INLINE_PATTERN` for `[[...]]`, checked before the existing `[text](url)`
pattern. A `linkContext` argument (`{ notes, onNoteLinkClick }`) is threaded
through every recursive `parseInline` call site so nested inline content
(e.g. a link inside **bold** text) still resolves correctly.

At render time, the bracketed title is matched case-insensitively against
`notes`. A match renders as `<a class="md-internal-link">`; no match renders
the same element with an added `md-internal-link-broken` class (dashed red
underline, matching the "broken link" convention notes apps like Obsidian
use) so a typo or a link to a not-yet-created note is visually distinct
without being a dead click. Both cases intercept the click
(`e.preventDefault()`), and a real match calls `onNoteLinkClick(note.id)`,
which `NoteEditor.jsx` wires to `navigate(`/notes/${id}`)`.

## Commands reference

No new commands were introduced in this step — see
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
