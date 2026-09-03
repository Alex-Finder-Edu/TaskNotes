const HEX_RE = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i

export function isValidHex(value) {
  return HEX_RE.test(value.trim())
}

export function normalizeHex(value) {
  const trimmed = value.trim()
  if (trimmed.length === 4) {
    // #abc -> #aabbcc
    const [, r, g, b] = trimmed
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return trimmed.toLowerCase()
}

export function hexToRgb(hex) {
  const normalized = normalizeHex(hex)
  const r = parseInt(normalized.slice(1, 3), 16)
  const g = parseInt(normalized.slice(3, 5), 16)
  const b = parseInt(normalized.slice(5, 7), 16)
  return { r, g, b }
}

export function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
