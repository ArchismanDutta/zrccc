// lib/shortcuts.js
// Global keyboard shortcut handler. Mount once in AppLayout via useAppShortcuts().
//
// Bindings:
//   N           → dispatch 'shortcut:new'  (pages listen and open their create modal)
//   G then key  → navigate (D=dashboard T=tasks P=projects C=clients F=finance M=messages R=reports)
//   ?           → dispatch 'shortcut:help'
//
// All bindings are suppressed when focus is inside an input, textarea, select, or
// contentEditable element, and when any modifier key (⌘ / Ctrl / Alt) is held.

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const GO_ROUTES = {
  d: '/dashboard',
  t: '/tasks',
  p: '/projects',
  c: '/clients',
  f: '/finance',
  m: '/messages',
  r: '/reports',
}

const CHORD_TIMEOUT_MS = 800

function isFocusedOnInput() {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  )
}

export function useAppShortcuts() {
  const navigate = useNavigate()
  const pendingG  = useRef(false)
  const gTimer    = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (isFocusedOnInput()) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // ── G-chord resolution ──────────────────────────────────────
      if (pendingG.current) {
        clearTimeout(gTimer.current)
        pendingG.current = false
        const dest = GO_ROUTES[e.key.toLowerCase()]
        if (dest) navigate(dest)
        return
      }

      // ── Single-key bindings ──────────────────────────────────────
      switch (e.key.toLowerCase()) {
        case 'g':
          pendingG.current = true
          gTimer.current = setTimeout(() => {
            pendingG.current = false
          }, CHORD_TIMEOUT_MS)
          break

        case 'n':
          e.preventDefault()
          window.dispatchEvent(new CustomEvent('shortcut:new'))
          break

        case '?':
          window.dispatchEvent(new CustomEvent('shortcut:help'))
          break

        default:
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(gTimer.current)
    }
  }, [navigate])
}
