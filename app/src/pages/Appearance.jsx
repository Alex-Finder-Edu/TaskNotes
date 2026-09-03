import { useState } from 'react'
import { useTheme } from '../context/ThemeContext.jsx'
import { isValidHex, normalizeHex } from '../utils/color.js'
import './Appearance.css'

const DEFAULT_ACCENT = '#aa3bff'

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  )
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

const MODE_OPTIONS = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'System', Icon: SystemIcon },
]

export default function Appearance() {
  const { mode, setMode, accent, setAccent } = useTheme()
  const effectiveAccent = accent ?? DEFAULT_ACCENT
  const [hexError, setHexError] = useState(null)

  function commitHex(value) {
    const trimmed = value.trim()
    if (!isValidHex(trimmed)) {
      setHexError('Enter a hex color like #aa3bff')
      return
    }
    setHexError(null)
    setAccent(normalizeHex(trimmed))
  }

  return (
    <main className="appearance">
      <h1>Appearance</h1>
      <p className="appearance-subtitle">Pick a theme and accent color for reading and writing notes.</p>

      <section className="appearance-section">
        <h2>Theme</h2>
        <div className="theme-mode-grid">
          {MODE_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              className={`theme-mode-card${mode === value ? ' selected' : ''}`}
              onClick={() => setMode(value)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="appearance-section">
        <h2>Accent color</h2>
        <div className="accent-picker">
          <input
            type="color"
            className="accent-color-input"
            value={effectiveAccent}
            onChange={(e) => {
              setHexError(null)
              setAccent(e.target.value)
            }}
            title="Pick accent color"
          />
          <input
            key={effectiveAccent}
            type="text"
            className="accent-hex-input"
            defaultValue={effectiveAccent}
            onBlur={(e) => commitHex(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitHex(e.currentTarget.value)
            }}
            placeholder="#aa3bff"
          />
          {accent !== null && (
            <button type="button" className="accent-reset-button" onClick={() => setAccent(null)}>
              Reset to default
            </button>
          )}
        </div>
        {hexError && <p className="accent-error">{hexError}</p>}
      </section>

      <section className="appearance-section">
        <h2>Preview</h2>
        <div className="appearance-preview">
          <h2>Q3 Planning</h2>
          <p>
            Ship the graph view, tighten onboarding, and close out the{' '}
            <span className="appearance-preview-link">[[Budget Draft]]</span> before the leadership sync.
          </p>
        </div>
      </section>
    </main>
  )
}
