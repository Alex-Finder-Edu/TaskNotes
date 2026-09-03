import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFolderPath, useNotes } from '../context/NotesContext.jsx'
import { buildNoteGraph } from '../utils/links.js'
import './GraphView.css'

function folderPathLabel(folders, folderId) {
  const path = getFolderPath(folders, folderId)
  return path.length ? path.map((folder) => folder.name).join(' / ') : 'Root'
}

const WIDTH = 1000
const HEIGHT = 700
const ITERATIONS = 250
const MIN_ZOOM = 0.4
const MAX_ZOOM = 3
const ZOOM_STEP = 0.2
const PAN_STEP = 80

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 5 5 12 12 19" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function ZoomInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  )
}

function ZoomOutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  )
}

// A small Fruchterman-Reingold force layout: nodes repel each other, edges
// pull their endpoints together, and both forces are cooled down over the
// iterations so the layout settles instead of oscillating forever.
function computeLayout(notes, edges) {
  const positions = new Map()
  if (notes.length === 0) return positions

  // Symmetric starting positions (e.g. an exact square/triangle) are a
  // degenerate fixed point for the force simulation below - nodes that feel
  // identical forces stay collinear/coincident forever. A little random
  // jitter breaks the symmetry so the layout can actually spread out.
  const angleStep = (2 * Math.PI) / notes.length
  const radius = Math.min(WIDTH, HEIGHT) * 0.35
  notes.forEach((note, i) => {
    positions.set(note.id, {
      x: WIDTH / 2 + Math.cos(i * angleStep) * radius + (Math.random() - 0.5) * 30,
      y: HEIGHT / 2 + Math.sin(i * angleStep) * radius + (Math.random() - 0.5) * 30,
    })
  })

  if (notes.length === 1) return positions

  // The final layout is rescaled to fit the canvas (see below), so what
  // matters is the *ratio* between repulsion and centering pull, not their
  // absolute size. A full-strength repulsion radius (k) paired with a weak
  // centering pull lets weakly-connected nodes drift arbitrarily far from
  // the rest of the graph - fine physically, but the rescale then crushes
  // every other node together to accommodate that one outlier. Damping k
  // and strengthening the centering pull keeps outliers from wandering off.
  const area = WIDTH * HEIGHT
  const k = Math.sqrt(area / notes.length) * 0.3
  const gravity = 0.6
  const pad = 40

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const displacement = new Map(notes.map((note) => [note.id, { x: 0, y: 0 }]))

    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const a = positions.get(notes[i].id)
        const b = positions.get(notes[j].id)
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
        const force = (k * k) / dist
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        const da = displacement.get(notes[i].id)
        const db = displacement.get(notes[j].id)
        da.x += fx
        da.y += fy
        db.x -= fx
        db.y -= fy
      }
    }

    edges.forEach(({ source, target }) => {
      const a = positions.get(source)
      const b = positions.get(target)
      if (!a || !b) return
      const dx = a.x - b.x
      const dy = a.y - b.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
      const force = (dist * dist) / k
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      const da = displacement.get(source)
      const db = displacement.get(target)
      da.x -= fx
      da.y -= fy
      db.x += fx
      db.y += fy
    })

    // A pull toward the center keeps unconnected/loosely-connected nodes
    // from drifting arbitrarily far from the main cluster under pure
    // repulsion - without it, the eventual rescale-to-fit step (below)
    // shrinks the whole layout down to fit a few outliers, crushing
    // everything else together.
    notes.forEach((note) => {
      const pos = positions.get(note.id)
      const d = displacement.get(note.id)
      d.x += (WIDTH / 2 - pos.x) * gravity
      d.y += (HEIGHT / 2 - pos.y) * gravity
    })

    // Displacement is capped per-iteration ("temperature") so the layout
    // settles instead of oscillating, but positions are otherwise left
    // unconstrained here - clamping to the canvas mid-simulation would let
    // nodes hit the wall and slide along it, collapsing the layout onto a
    // line. The whole result is rescaled to fit the canvas once, below.
    const temperature = Math.max(WIDTH, HEIGHT) * 0.05 * (1 - iter / ITERATIONS)
    notes.forEach((note) => {
      const d = displacement.get(note.id)
      const dist = Math.sqrt(d.x * d.x + d.y * d.y) || 0.01
      const limited = Math.min(dist, temperature)
      const pos = positions.get(note.id)
      pos.x += (d.x / dist) * limited
      pos.y += (d.y / dist) * limited
    })
  }

  const xs = [...positions.values()].map((p) => p.x)
  const ys = [...positions.values()].map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const scale = Math.min((WIDTH - 2 * pad) / spanX, (HEIGHT - 2 * pad) / spanY, 1)

  positions.forEach((pos) => {
    pos.x = WIDTH / 2 + (pos.x - (minX + spanX / 2)) * scale
    pos.y = HEIGHT / 2 + (pos.y - (minY + spanY / 2)) * scale
  })

  return positions
}

export default function GraphView() {
  const { notes, folders } = useNotes()
  const navigate = useNavigate()
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [hoveredNoteId, setHoveredNoteId] = useState(null)
  const svgWrapperRef = useRef(null)
  const panRef = useRef(pan)
  const dragRef = useRef(null)

  const edges = useMemo(() => buildNoteGraph(notes), [notes])
  const positions = useMemo(() => computeLayout(notes, edges), [notes, edges])

  const degree = useMemo(() => {
    const counts = new Map()
    edges.forEach(({ source, target }) => {
      counts.set(source, (counts.get(source) ?? 0) + 1)
      counts.set(target, (counts.get(target) ?? 0) + 1)
    })
    return counts
  }, [edges])

  useEffect(() => {
    const el = svgWrapperRef.current
    if (!el) return

    // Wheel events are attached passively by React by default, which
    // silently ignores preventDefault() - a native listener is needed so
    // scrolling the wheel over the graph zooms it instead of scrolling
    // the page underneath it.
    function handleWheel(e) {
      e.preventDefault()
      setZoom((z) => clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)))
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  useEffect(() => {
    panRef.current = pan
  }, [pan])

  useEffect(() => {
    const wrapper = svgWrapperRef.current
    if (!wrapper) return

    // Panning by dragging the background: only starts when the mousedown
    // target isn't a node (so clicking/dragging a node still just opens it,
    // it doesn't also start a pan). Screen-pixel deltas are converted into
    // viewBox units using the SVG's rendered size, so a drag always tracks
    // the cursor 1:1 regardless of the current zoom level.
    function handleMouseDown(e) {
      if (e.button !== 0 || e.target.closest('.graph-node')) return
      const rect = wrapper.querySelector('.graph-svg').getBoundingClientRect()
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: panRef.current.x,
        originY: panRef.current.y,
        scaleX: WIDTH / rect.width,
        scaleY: HEIGHT / rect.height,
      }
    }

    function handleMouseMove(e) {
      const drag = dragRef.current
      if (!drag) return
      setPan({
        x: drag.originX + (e.clientX - drag.startX) * drag.scaleX,
        y: drag.originY + (e.clientY - drag.startY) * drag.scaleY,
      })
    }

    function handleMouseUp() {
      dragRef.current = null
    }

    wrapper.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      wrapper.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  function panBy(dx, dy) {
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }))
  }

  return (
    <main className="graph-view">
      <h2 className="graph-view-title">Graph View</h2>
      {notes.length === 0 ? (
        <p className="graph-view-empty">No notes yet.</p>
      ) : (
        <div className="graph-svg-wrapper" ref={svgWrapperRef}>
          <div className="graph-zoom-controls">
            <button
              type="button"
              className="graph-zoom-button"
              title="Zoom in"
              onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            >
              <ZoomInIcon />
            </button>
            <button
              type="button"
              className="graph-zoom-button"
              title="Zoom out"
              onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            >
              <ZoomOutIcon />
            </button>
          </div>
          <div className="graph-pan-controls">
            <button
              type="button"
              className="graph-control-button graph-pan-up"
              title="Pan Up"
              onClick={() => panBy(0, -PAN_STEP)}
            >
              <ArrowUpIcon />
            </button>
            <button
              type="button"
              className="graph-control-button graph-pan-left"
              title="Pan Left"
              onClick={() => panBy(-PAN_STEP, 0)}
            >
              <ArrowLeftIcon />
            </button>
            <button
              type="button"
              className="graph-control-button graph-pan-right"
              title="Pan Right"
              onClick={() => panBy(PAN_STEP, 0)}
            >
              <ArrowRightIcon />
            </button>
            <button
              type="button"
              className="graph-control-button graph-pan-down"
              title="Pan Down"
              onClick={() => panBy(0, PAN_STEP)}
            >
              <ArrowDownIcon />
            </button>
          </div>
          <svg className="graph-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet">
            <g transform={`translate(${pan.x}, ${pan.y})`}>
              <g transform={`translate(${WIDTH / 2}, ${HEIGHT / 2}) scale(${zoom}) translate(${-WIDTH / 2}, ${-HEIGHT / 2})`}>
                <g className="graph-edges">
                  {edges.map(({ source, target }) => {
                    const a = positions.get(source)
                    const b = positions.get(target)
                    if (!a || !b) return null
                    return <line key={`${source}-${target}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                  })}
                </g>
                <g className="graph-nodes">
                  {notes.map((note) => {
                    const pos = positions.get(note.id)
                    if (!pos) return null
                    const nodeRadius = 6 + Math.min(degree.get(note.id) ?? 0, 8) * 1.2
                    return (
                      <g
                        key={note.id}
                        className="graph-node"
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={() => navigate(`/notes/${note.id}`)}
                        onMouseEnter={() => setHoveredNoteId(note.id)}
                        onMouseLeave={() => setHoveredNoteId((id) => (id === note.id ? null : id))}
                      >
                        <circle r={nodeRadius} />
                        <text y={nodeRadius + 14}>{note.title}</text>
                        {hoveredNoteId === note.id && (
                          <text className="graph-node-folder" y={nodeRadius + 28}>
                            {folderPathLabel(folders, note.folderId)}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </g>
              </g>
            </g>
          </svg>
        </div>
      )}
    </main>
  )
}
