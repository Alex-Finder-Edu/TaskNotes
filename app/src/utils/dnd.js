export const DND_MIME_TYPE = 'application/x-notetasks-item'

export function setDragPayload(e, type, id) {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData(DND_MIME_TYPE, JSON.stringify({ type, id }))
}

export function readDragPayload(e) {
  const raw = e.dataTransfer.getData(DND_MIME_TYPE)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
