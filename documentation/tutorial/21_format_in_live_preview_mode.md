# Tutorial: Keep Formatting Active in Live Preview Mode

Implements `prompts/23_format_in_live_preview_mode.txt` - refines Live
Preview (see [`20_live_preview_mode.md`](./20_live_preview_mode.md)) so that
markdown formatting stays rendered even where the cursor is, revealing only
the specific syntax characters relevant to the caret's position instead of
flattening the whole line to raw text.

## The behavior

- **Headings**: placing the cursor anywhere on a heading line reveals its
  `#` characters while the heading itself keeps rendering at its heading
  size/weight. Adding or removing `#` characters live-updates the heading
  level.
- **Bold / italic / inline code**: placing the cursor inside one formatted
  run (or at either of its boundaries) reveals just that run's markers
  (`**`, `_`, `` ` ``); the text stays bold/italic/monospaced, and other
  formatted runs on the same line stay collapsed.
- **Links**: `[[internal]]` and `[text](url)` links stay collapsed to their
  rendered form unless the cursor sits inside them or at either edge, in
  which case their syntax is revealed. Ctrl/Cmd+click navigates - internal
  links jump to the note, external links open in a new tab.
- Block markers for quotes, list bullets/numbers, and horizontal rules
  follow the same whole-line rule as headings.

## Why per-token, not per-line

The previous implementation ([`20_live_preview_mode.md`](./20_live_preview_mode.md))
made the *entire* active line raw text the moment the cursor touched it -
correct for headings, but too coarse for a line like `**bold** and *italic*`:
moving the cursor into "bold" would also un-format "italic" on the same
line, which reads as flickery. Formatting needed to stay applied while only
the relevant syntax reveals.

## Tracking caret position within a line, not just which line

`LiveMarkdownEditor.jsx` previously only tracked `activeLineIndex` (which
line the caret is on) - enough to decide whether to show a whole line raw,
but not which formatted run within that line the caret is touching. A new
`selectionRange` state (`{ start, end }`, raw offsets into the whole note)
is now updated alongside `activeLineIndex` on every selection change
(`updateActiveSelection`, replacing the old `setActiveLineFromOffset`), so
the component re-renders when the caret moves between runs on the same line,
not only when it crosses to a different line.

## Decorator: per-token active ranges instead of raw-line fallback

`utils/liveMarkdownDecorate.jsx` no longer has a "just render raw text"
escape hatch for the active line. Instead:

- `decorateLine` takes an `activeRange` ({start, end} in raw offsets
  *relative to the line*, or `null` if the caret isn't on this line). Block
  markers (heading `#`s, quote `>`, list markers, hr) use `activeRange !==
  null` directly, since those reveal for the whole line.
- `decorateInline` now tracks, as it walks a line's text, the absolute
  line-relative offset of each token (bold/italic/code/link) it finds -
  needed because the old version only ever cared about the token's content,
  never its position. Each token's `[start, end)` is compared against
  `activeRange` via `rangesOverlap`, which treats the caret sitting exactly
  at either boundary as "active" too (so revealing markers happens the
  instant the caret reaches an edge, not only once it's strictly inside).
- The syntax spans' CSS class becomes `md-syntax md-syntax-visible` when
  active instead of just `md-syntax`; `LiveMarkdownEditor.css` adds a rule
  overriding `display: none` back to `display: inline` (dimmed via
  `opacity`) for that combined class.

Recursive tokens (e.g. inline code inside a bold run) pass their nested
content's line-relative starting offset down through the recursion, so
`activeRange` comparisons stay correct at any nesting depth.

## External links can now be clicked

Live Preview's external link span (`[text](url)`) previously had no click
behavior at all - unlike the read-only renderer (`utils/markdown.jsx`),
which renders a real `<a target="_blank">`. Since Live Preview's link is a
`<span>` inside a `contentEditable` region (a real `<a>` there would fight
with caret placement on plain click), it now gets the same Ctrl/Cmd+click
convention already used for internal `[[links]]`: a modified click opens the
URL via `window.open(..., '_blank', 'noopener,noreferrer')`, while a plain
click just moves the caret.

## Commands reference

No new commands were introduced in this step. See
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
