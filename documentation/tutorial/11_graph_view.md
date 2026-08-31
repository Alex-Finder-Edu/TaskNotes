# Tutorial: Graph View

Implements `prompts/13_graph_view.txt` — an Obsidian-style Graph View: a new
sidebar button that opens a full-page graph of all notes, with an edge drawn
between any two notes connected by a `[[...]]` internal link ([`10_internal_note_links.md`](./10_internal_note_links.md)).
Clicking a node opens that note.

## Turning links into an edge list

`app/src/utils/links.js` is a small, dependency-free graph builder:

- `extractLinkedTitles(content)` regex-matches every `[[Title]]` in a note's
  content and returns the de-duplicated set of titles.
- `buildNoteGraph(notes)` resolves each of those titles to a note
  (case-insensitive, same matching rule `markdown.jsx` uses for rendering),
  and produces an undirected, de-duplicated edge list — a link from A to B
  and a link from B to A both collapse to one edge, and a note linking to
  itself is dropped. Any title that doesn't match a real note is silently
  skipped (the broken-link case is `markdown.jsx`'s concern, not the
  graph's).

## Laying the graph out: force simulation + rescale

There's no charting dependency in this project, so `GraphView.jsx` implements
a small Fruchterman-Reingold-style force simulation directly: every pair of
nodes repels each other (proportional to `k²/distance`), every edge pulls
its two endpoints together (proportional to `distance²/k`), and a
"temperature" that cools linearly over 250 iterations shrinks how far a node
can move per step so the layout settles instead of oscillating forever.

Two bugs showed up while dialing this in, both worth calling out since
they're easy to reintroduce:

1. **Clamping positions to the canvas mid-simulation collapses the layout
   onto a line.** The first version clamped `x`/`y` into `[pad, WIDTH-pad]`
   inside every iteration. Once several connected nodes got pushed against
   the same wall, clamping pinned them to that boundary's exact coordinate
   while letting them keep sliding along the other axis — three notes ended
   up perfectly collinear along the bottom edge. The fix: let the
   simulation run completely unconstrained, and only fit the *finished*
   layout to the canvas afterward, by computing its bounding box and
   applying one uniform translate + scale. A degenerate/zero-size bounding
   box (a single node, or every node landing on the same point) falls back
   to centering with no scale change.

2. **A weak centering pull lets an unconnected node wander arbitrarily far
   from everything else**, and because step 1's rescale fits the *whole*
   bounding box (outlier included) into the canvas, one distant, unconnected
   note was enough to shrink every other node down into an unreadably tiny,
   overlapping cluster. Fixed by tuning two constants together: damping the
   repulsion radius `k` to 30% of the textbook `sqrt(area / nodeCount)`
   value, and strengthening the per-node centering pull to `0.6 ×
   distance-from-center` (up from an initial `0.05` that repulsion
   overpowered completely). What matters isn't either constant's absolute
   value — the whole thing gets rescaled anyway — it's the *ratio* between
   repulsion and centering strength, since that ratio is what determines
   how far outliers drift relative to the rest of the graph before the
   simulation cools down.

Symmetric starting positions (nodes placed evenly around a circle) are
themselves a degenerate fixed point — nodes that start out feeling identical
forces from every neighbor stay locked in that arrangement — so a small
random jitter is added to each node's initial position to break the
symmetry before the simulation starts.

Node radius scales mildly with degree (in-graph connection count, capped)
so more-linked notes read as slightly more prominent, matching the visual
convention Obsidian's own graph view uses.

## Sizing the SVG

The graph renders into an `<svg viewBox="0 0 1000 700">` scaled responsively
via CSS. The first attempt gave it `min-height: 60vh` and let flexbox
(`flex: 1`) handle the rest — but an `<svg>` is a *replaced element*: with no
explicit `height`, the browser falls back to sizing it from the viewBox's
intrinsic aspect ratio applied to its (very wide) available width, which blew
the element up to well over 1000px tall and pushed most of the graph below
the fold, silently, with no visual indication anything was wrong (the
node circles were still there — just off-screen). The fix was to give the
`<svg>` an explicit `height: 65vh` instead of `min-height`, which is enough
to make `height` a definite value and bypass the aspect-ratio fallback
entirely.

## Sidebar entry point and click-through

`Sidebar.jsx` gained a `GraphIcon` (three outer nodes connected to a center
one) and a "Graph View" button above "New Folder", calling
`navigate('/graph')` — the same `useNavigate` pattern "New Note" already
uses. `App.jsx` registers the `/graph` route rendering `GraphView`, which
replaces the note editor in the main content area exactly like any other
route. Clicking a node in the SVG calls `navigate(`/notes/${note.id}`)`,
reusing the existing note editor route.

## Commands reference

No new commands were introduced in this step — see
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
