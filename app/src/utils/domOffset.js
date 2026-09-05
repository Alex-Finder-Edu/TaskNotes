// Maps between "raw offsets" (character positions in the note's plain
// markdown string) and DOM positions inside the live preview editor.
//
// The editor renders one <div> per line as a direct child of the root, and
// every character of a line's raw text is always present somewhere in that
// line's DOM subtree (markdown syntax like ** or [[ is only ever hidden via
// CSS, never removed) - so a line's `textContent` is always exactly equal to
// its raw text. That invariant is what makes this mapping reliable: the
// raw offset is just "sum of previous lines' lengths (+1 per newline) plus
// the offset within the current line's textContent".

export function domPositionToRawOffset(root, node, offset) {
  const lineDivs = Array.from(root.children)
  let lineIndex = lineDivs.findIndex((div) => div === node || div.contains(node))
  if (lineIndex === -1) lineIndex = lineDivs.length - 1
  if (lineIndex < 0) return 0
  const lineDiv = lineDivs[lineIndex]

  let raw = 0
  for (let i = 0; i < lineIndex; i++) {
    raw += lineDivs[i].textContent.length + 1
  }

  let within = 0
  if (node.nodeType === Node.TEXT_NODE) {
    const walker = document.createTreeWalker(lineDiv, NodeFilter.SHOW_TEXT)
    let current = walker.nextNode()
    while (current) {
      if (current === node) {
        within += offset
        break
      }
      within += current.textContent.length
      current = walker.nextNode()
    }
  } else {
    const children = Array.from(node.childNodes)
    for (let i = 0; i < offset && i < children.length; i++) {
      within += children[i].textContent.length
    }
  }

  return raw + within
}

function findTextPosition(lineDiv, offset) {
  if (lineDiv.textContent.length === 0) {
    return { node: lineDiv, offset: 0 }
  }
  const walker = document.createTreeWalker(lineDiv, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  let remaining = offset
  while (node) {
    if (remaining <= node.textContent.length) {
      return { node, offset: remaining }
    }
    remaining -= node.textContent.length
    node = walker.nextNode()
  }
  return { node: lineDiv, offset: lineDiv.childNodes.length }
}

export function rawOffsetToDomPosition(root, rawOffset) {
  const lineDivs = Array.from(root.children)
  let remaining = rawOffset
  for (const div of lineDivs) {
    const len = div.textContent.length
    if (remaining <= len) {
      return findTextPosition(div, remaining)
    }
    remaining -= len + 1
  }
  const last = lineDivs[lineDivs.length - 1]
  return last ? findTextPosition(last, last.textContent.length) : { node: root, offset: 0 }
}

export function getLineIndexForOffset(content, offset) {
  const clamped = Math.max(0, Math.min(offset, content.length))
  return content.slice(0, clamped).split('\n').length - 1
}
