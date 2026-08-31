# Tutorial: Graph View Pan Controls

Implements `prompts/15_graph_view_move_controls.txt` — pan controls for the
Graph View ([`11_graph_view.md`](./11_graph_view.md),
[`12_graph_view_zoom_controls.md`](./12_graph_view_zoom_controls.md)): four
arrow buttons ("Pan Up"/"Down"/"Left"/"Right") arranged in a cross below the
zoom buttons, plus click-and-drag panning on the graph background.

## Pan as a second, outer transform

Pan is a `{ x, y }` offset in state, applied as an *outer* `<g>` wrapping the
existing zoom `<g>`:

```jsx
<g transform={`translate(${pan.x}, ${pan.y})`}>
  <g transform={`translate(${WIDTH / 2}, ${HEIGHT / 2}) scale(${zoom}) translate(${-WIDTH / 2}, ${-HEIGHT / 2})`}>
    ...
  </g>
</g>
```

The ordering matters: because pan wraps the zoom group rather than living
inside it, a pan offset of N viewBox units always moves the rendered content
by the same N units regardless of the current zoom level — panning doesn't
get diluted or amplified by zooming in/out first. The four buttons just call
a shared `panBy(dx, dy)` with a fixed `PAN_STEP` (80 viewBox units) in the
appropriate direction.

## Drag-to-pan: converting screen pixels to viewBox units

Dragging the background pans the same way the buttons do. The tricky part is
that mouse coordinates arrive in screen pixels, but pan lives in viewBox
units, and the ratio between them changes with the browser window size (the
`viewBox="0 0 1000 700"` SVG is scaled responsively via CSS). The fix:
capture the SVG's rendered size on `mousedown` and use it to build a
per-axis scale factor:

```js
const rect = svg.getBoundingClientRect()
scaleX = WIDTH / rect.width
scaleY = HEIGHT / rect.height
```

Then every `mousemove` converts its screen-pixel delta through that factor
before adding it to the pan offset captured at drag start. Because the pan
`<g>` isn't nested inside the zoom `<g>` (see above), this stays a 1:1
screen-pixel-to-content mapping regardless of zoom — the point under the
cursor tracks the cursor exactly while dragging.

Drag tracking uses the same pattern as the sidebar's resize handle
(`Sidebar.jsx`'s `draggingRef` + `window` `mousemove`/`mouseup` listeners):
a ref holds the in-progress drag's starting state, and global listeners
(registered once, not re-subscribed per pan update) update `pan` on move and
clear the ref on mouseup. A `mousedown` that lands on a node
(`e.target.closest('.graph-node')`) is ignored so dragging a node still just
clicks it, rather than starting a pan.

`.graph-svg-wrapper` gets `cursor: grab`, switching to `grabbing` (and
`user-select: none`, so dragging doesn't select page text) via the `:active`
pseudo-class — no JS-driven dragging state needed just for the cursor, since
`:active` already tracks "mouse button held down over this element."

## Cross-shaped button layout

`.graph-pan-controls` is a 3-column, 3-row CSS grid with only four of the
nine cells populated (`grid-column`/`grid-row` placed directly per button),
positioned `absolute` below the zoom controls. The four arrow icons follow
the same inline-SVG convention as the rest of the app's icons.

## Commands reference

No new commands were introduced in this step — see
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
