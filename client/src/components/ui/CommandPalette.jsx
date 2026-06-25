import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Users, Briefcase, CheckSquare, Calendar } from 'lucide-react'
import api from '@/lib/api'

const SECTIONS = [
  { key: 'clients',  label: 'Clients',  Icon: Users,       route: id => `/clients/${id}`,  nameKey: 'companyName', idKey: 'displayName' },
  { key: 'projects', label: 'Projects', Icon: Briefcase,   route: id => `/projects/${id}`, nameKey: 'name',        idKey: 'projectId' },
  { key: 'tasks',    label: 'Tasks',    Icon: CheckSquare, route: id => `/tasks/${id}`,    nameKey: 'title',       idKey: 'taskId' },
  { key: 'content',  label: 'Content',  Icon: Calendar,    route: () => `/content`,        nameKey: 'title',       idKey: 'contentId' },
]

const EMPTY = { clients: [], projects: [], tasks: [], content: [] }

export function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [focusIdx, setFocusIdx] = useState(0)
  const inputRef   = useRef(null)
  const debounceRef = useRef(null)

  // Reset + focus on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults(EMPTY)
      setFocusIdx(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.trim().length < 2) { setResults(EMPTY); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.search(query.trim())
        setResults(res.data || EMPTY)
        setFocusIdx(0)
      } catch (_) {}
      finally { setLoading(false) }
    }, 280)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  // Build flat list for keyboard nav
  const flat = SECTIONS.flatMap(s => (results[s.key] || []).map(r => ({ section: s, item: r })))

  const go = ({ section, item }) => {
    navigate(section.route(item._id))
    onClose()
  }

  const handleKey = (e) => {
    if (e.key === 'Escape')    { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && flat[focusIdx]) { go(flat[focusIdx]) }
  }

  if (!open) return null

  const hasResults = flat.length > 0
  const tooShort   = query.trim().length < 2

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)', paddingTop: '10vh' }}
      onClick={onClose}>
      <div
        className="w-full max-w-xl bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}>

        {/* Input bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          <Search size={15} className="text-fg-3 flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-3 outline-none"
            placeholder="Search clients, projects, tasks, content…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin flex-shrink-0" />
          )}
          <kbd className="hidden sm:flex items-center text-[10px] text-fg-3 border border-[var(--color-border)] rounded px-1.5 py-0.5 flex-shrink-0">esc</kbd>
          <button onClick={onClose} className="text-fg-3 hover:text-fg flex-shrink-0 ml-1">
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[58vh] overflow-y-auto">
          {tooShort ? (
            <p className="text-xs text-fg-3 text-center py-10">Type at least 2 characters…</p>
          ) : !loading && !hasResults ? (
            <p className="text-xs text-fg-3 text-center py-10">No results for "<span className="text-fg">{query}</span>"</p>
          ) : (
            SECTIONS.map(s => {
              const items = results[s.key] || []
              if (!items.length) return null
              const sectionStart = flat.findIndex(f => f.section.key === s.key)
              return (
                <div key={s.key}>
                  <div className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--color-surface-2)] sticky top-0">
                    <s.Icon size={11} className="text-fg-3" />
                    <span className="text-[10px] font-semibold text-fg-3 uppercase tracking-wider">{s.label}</span>
                  </div>
                  {items.map((item, i) => {
                    const absIdx   = sectionStart + i
                    const isFocused = focusIdx === absIdx
                    const name     = item[s.nameKey] || item.name || item.title || '—'
                    const subId    = item[s.idKey]
                    return (
                      <button key={item._id}
                        onMouseEnter={() => setFocusIdx(absIdx)}
                        onClick={() => go({ section: s, item })}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isFocused ? 'bg-accent/10' : 'hover:bg-[var(--color-surface-2)]'}`}>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${isFocused ? 'bg-accent text-white' : 'bg-[var(--color-surface-3)] text-fg-3'}`}>
                          <s.Icon size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-fg truncate">{name}</p>
                          {subId && subId !== name && (
                            <p className="text-[10px] text-fg-3 leading-none mt-0.5">{subId}</p>
                          )}
                        </div>
                        {item.status && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[var(--color-surface-3)] text-fg-3 flex-shrink-0 capitalize">
                            {item.status.replace(/_/g, ' ')}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        {hasResults && (
          <div className="flex items-center gap-3 px-4 py-2 border-t border-[var(--color-border)]">
            <span className="text-[10px] text-fg-3">{flat.length} result{flat.length !== 1 ? 's' : ''}</span>
            <span className="text-[10px] text-fg-3 ml-auto hidden sm:block">↑↓ navigate · ↵ open</span>
          </div>
        )}
      </div>
    </div>
  )
}
