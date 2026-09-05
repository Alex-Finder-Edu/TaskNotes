// Finds the [[ ... ]] pair the cursor currently sits inside, if any. Returns
// the offsets needed both to filter the link autocomplete list and to splice
// a chosen note's title back into the text. Shared by every note editing
// surface (plain textarea and the live preview editor) so the [[ behavior
// stays identical between them.
export function findLinkContext(value, cursor) {
  const openIdx = value.lastIndexOf('[[', cursor)
  if (openIdx === -1) return null
  const queryStart = openIdx + 2
  const closeIdx = value.indexOf(']]', queryStart)
  if (closeIdx === -1 || cursor < queryStart || cursor > closeIdx) return null
  return { queryStart, end: closeIdx + 2, query: value.slice(queryStart, cursor) }
}
