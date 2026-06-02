/**
 * THEME PRESETS — each defines an accent colour in HSL
 * The design system derives all accent shades from these 3 values.
 */
export const THEME_PRESETS = [
  { id: 'indigo',   label: 'Indigo',    h: 238, s: 76, l: 58, emoji: '🔷' },
  { id: 'violet',   label: 'Violet',    h: 258, s: 72, l: 58, emoji: '💜' },
  { id: 'blue',     label: 'Ocean',     h: 210, s: 80, l: 50, emoji: '🌊' },
  { id: 'cyan',     label: 'Cyan',      h: 190, s: 70, l: 44, emoji: '🩵' },
  { id: 'teal',     label: 'Teal',      h: 172, s: 60, l: 40, emoji: '🟢' },
  { id: 'emerald',  label: 'Emerald',   h: 152, s: 64, l: 40, emoji: '💚' },
  { id: 'rose',     label: 'Rose',      h: 343, s: 76, l: 54, emoji: '🌹' },
  { id: 'amber',    label: 'Amber',     h: 38,  s: 92, l: 50, emoji: '🟡' },
  { id: 'orange',   label: 'Sunset',    h: 24,  s: 88, l: 52, emoji: '🌅' },
  { id: 'slate',    label: 'Slate',     h: 215, s: 20, l: 46, emoji: '🩶' },
]

export const DEFAULT_THEME_ID = 'indigo'

/**
 * Apply a theme preset to the document root CSS variables.
 * This is a pure DOM mutation — no React re-render required.
 */
export function applyTheme(preset) {
  const root = document.documentElement
  root.style.setProperty('--accent-h', String(preset.h))
  root.style.setProperty('--accent-s', `${preset.s}%`)
  root.style.setProperty('--accent-l', `${preset.l}%`)
}

/** Persist theme choice */
export function saveTheme(id) {
  localStorage.setItem('zrc-theme-id', id)
}

/** Load persisted theme (returns preset object) */
export function loadTheme() {
  const id = localStorage.getItem('zrc-theme-id') ?? DEFAULT_THEME_ID
  return THEME_PRESETS.find(t => t.id === id) ?? THEME_PRESETS[0]
}

/** Dark mode helpers */
export function setDarkMode(isDark) {
  document.documentElement.classList.toggle('dark', isDark)
  localStorage.setItem('zrc-dark', isDark ? '1' : '0')
}

export function loadDarkMode() {
  const stored = localStorage.getItem('zrc-dark')
  if (stored !== null) return stored === '1'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
