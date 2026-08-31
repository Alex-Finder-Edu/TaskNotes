# Tutorial: Graph View Zoom Controls

Implements `prompts/14_graph_controls.txt` — Obsidian-style zoom controls for
the Graph View ([`11_graph_view.md`](./11_graph_view.md)): a `+`/`-` button
pair in the graph's top-right corner, plus mouse-wheel zoom.

## Scaling the graph without recomputing the layout

Zoom is a single `zoom` number in state (`useState(1)`, clamped to
`[0.4, 3]`), applied as one extra `<g>` wrapping the existing edges/nodes
groups:

```jsx
<g transform={`translate(${WIDTH / 2}, ${HEIGHT / 2}) scale(${zoom}) translate(${-WIDTH / 2}, ${-HEIGHT / 2})`}>
```

Translating to the canvas center, scaling, then translating back is what
makes the zoom expand outward from the center of the graph rather than from
the SVG's `(0, 0)` corner — the same pattern used elsewhere for the node
positions themselves. No layout recomputation is needed; zoom is purely a
view transform over the already-settled force-simulation positions.

## Wheel zoom needs a non-passive listener

The zoom buttons are plain `onClick` handlers. Mouse-wheel zoom looks like
it should just be an `onWheel` prop on the SVG, but React (since v17)
attaches `wheel` listeners at the root as **passive**, which silently
ignores `event.preventDefault()` — the page would scroll *and* zoom the
graph at the same time, with no error to signal why the scroll didn't stop.

The fix is a `useEffect` that attaches a native listener directly to the
wrapper element with `{ passive: false }`:

```js
useEffect(() => {
  const el = svgWrapperRef.current
  function handleWheel(e) {
    e.preventDefault()
    setZoom((z) => clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)))
  }
  el.addEventListener('wheel', handleWheel, { passive: false })
  return () => el.removeEventListener('wheel', handleWheel)
}, [])
```

Scrolling up (`deltaY < 0`) zooms in; scrolling down zooms out — matching
the button semantics and Obsidian's own convention.

## Layout changes

The zoom buttons are positioned `absolute` in the graph's top-right corner,
which needs a `position: relative` ancestor that wasn't there before — the
`<svg>` itself can't be that ancestor (you can't absolutely position a
sibling *inside* an SVG using regular CSS), so a `.graph-svg-wrapper` div now
wraps both the button row and the `<svg>`, taking over the `height: 65vh`
sizing that previously lived directly on the SVG element.

## Commands reference

No new commands were introduced in this step — see
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
