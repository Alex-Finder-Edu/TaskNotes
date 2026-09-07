import { useMemo, useState } from 'react'
import './TagInput.css'

// Obsidian-style hierarchical tag input: chips for already-added tags, plus
// a free-text field that filters `suggestions` (every tag already used
// elsewhere) into a dropdown - so typing "computer_science/fullstack"
// surfaces "computer_science/fullstack/frontend" etc. Mirrors the
// interaction of LinkAwareTextarea's internal-link autocomplete, the
// pattern the mockup this implements was explicitly modeled on.
export default function TagInput({ tags, onChange, suggestions = [], placeholder }) {
  const [draft, setDraft] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [focused, setFocused] = useState(false)

  const matches = useMemo(() => {
    const query = draft.trim().toLowerCase()
    if (!query) return []
    return suggestions.filter((tag) => !tags.includes(tag) && tag.toLowerCase().includes(query)).slice(0, 8)
  }, [draft, suggestions, tags])

  function addTag(rawValue) {
    const value = rawValue.trim()
    if (!value || tags.includes(value)) {
      setDraft('')
      return
    }
    onChange([...tags, value])
    setDraft('')
    setActiveIndex(0)
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag))
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown' && matches.length > 0) {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % matches.length)
    } else if (e.key === 'ArrowUp' && matches.length > 0) {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + matches.length) % matches.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      addTag(matches[activeIndex] ?? draft)
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    } else if (e.key === 'Escape') {
      setDraft('')
    }
  }

  const showDropdown = focused && draft.trim().length > 0

  return (
    <div className="tag-input">
      <div className="tag-chip-list">
        {tags.map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
            <button
              type="button"
              className="tag-chip-remove"
              aria-label={`Remove tag ${tag}`}
              onClick={() => removeTag(tag)}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          className="tag-input-field"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
      </div>
      {showDropdown && (
        <ul className="tag-autocomplete">
          {matches.length === 0 ? (
            <li className="tag-autocomplete-empty">{`No matching tags - press Enter to create "${draft.trim()}"`}</li>
          ) : (
            matches.map((tag, i) => (
              <li
                key={tag}
                className={`tag-autocomplete-item${i === activeIndex ? ' active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  addTag(tag)
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {tag}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
