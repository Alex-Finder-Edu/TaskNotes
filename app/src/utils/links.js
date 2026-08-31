// Extracts [[Title]] internal links from note content and turns a note list
// into an undirected note-to-note edge list, for the Graph View.

export function extractLinkedTitles(content) {
  const pattern = /\[\[([^\]]+)\]\]/g
  const titles = new Set()
  let match
  while ((match = pattern.exec(content ?? '')) !== null) {
    titles.add(match[1].trim())
  }
  return [...titles]
}

export function buildNoteGraph(notes) {
  const byTitle = new Map(notes.map((note) => [note.title.trim().toLowerCase(), note]))
  const seenEdges = new Set()
  const edges = []

  for (const note of notes) {
    for (const title of extractLinkedTitles(note.content)) {
      const target = byTitle.get(title.toLowerCase())
      if (!target || target.id === note.id) continue
      const key = [note.id, target.id].sort().join('::')
      if (seenEdges.has(key)) continue
      seenEdges.add(key)
      edges.push({ source: note.id, target: target.id })
    }
  }

  return edges
}
