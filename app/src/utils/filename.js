const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
])

// eslint-disable-next-line no-control-regex
const INVALID_CHARS_PATTERN = /[<>:"/\\|?*\x00-\x1F]/

export function validateFilename(rawName) {
  const name = (rawName ?? '').trim()

  if (!name) {
    return { valid: false, error: 'Title cannot be empty.' }
  }
  if (INVALID_CHARS_PATTERN.test(name)) {
    return { valid: false, error: 'Title cannot contain: < > : " / \\ | ? *' }
  }
  if (/[ .]$/.test(name)) {
    return { valid: false, error: 'Title cannot end with a space or a period.' }
  }
  const baseName = name.split('.')[0].toUpperCase()
  if (WINDOWS_RESERVED_NAMES.has(baseName)) {
    return { valid: false, error: `"${baseName}" is a reserved name and cannot be used.` }
  }
  if (name.length > 255) {
    return { valid: false, error: 'Title is too long (max 255 characters).' }
  }

  return { valid: true, error: null }
}
