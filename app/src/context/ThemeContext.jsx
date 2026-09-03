import { createContext, useContext, useEffect, useState } from 'react'
import { hexToRgba, isValidHex, normalizeHex } from '../utils/color.js'

const MODE_KEY = 'timeline-theme-mode'
const ACCENT_KEY = 'timeline-theme-accent'
const MODES = ['light', 'dark', 'system']

const ThemeContext = createContext(null)

function readStoredMode() {
  const stored = localStorage.getItem(MODE_KEY)
  return MODES.includes(stored) ? stored : 'system'
}

function readStoredAccent() {
  const stored = localStorage.getItem(ACCENT_KEY)
  return stored && isValidHex(stored) ? normalizeHex(stored) : null
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readStoredMode)
  const [accent, setAccentState] = useState(readStoredAccent)

  useEffect(() => {
    const root = document.documentElement
    if (mode === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', mode)
    }
    localStorage.setItem(MODE_KEY, mode)
  }, [mode])

  useEffect(() => {
    const root = document.documentElement
    if (accent) {
      root.style.setProperty('--accent', accent)
      root.style.setProperty('--accent-bg', hexToRgba(accent, 0.12))
      root.style.setProperty('--accent-border', hexToRgba(accent, 0.5))
      localStorage.setItem(ACCENT_KEY, accent)
    } else {
      root.style.removeProperty('--accent')
      root.style.removeProperty('--accent-bg')
      root.style.removeProperty('--accent-border')
      localStorage.removeItem(ACCENT_KEY)
    }
  }, [accent])

  function setAccent(hex) {
    if (hex === null) {
      setAccentState(null)
      return
    }
    if (!isValidHex(hex)) return
    setAccentState(normalizeHex(hex))
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
