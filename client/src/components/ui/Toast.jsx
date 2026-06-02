import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

const Ctx = createContext(null)
let idCounter = 0

const ICONS = { success: CheckCircle, error: AlertCircle, info: Info }
const COLORS = { success: 'var(--color-success)', error: 'var(--color-danger)', info: 'var(--color-info)' }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), [])

  const add = useCallback((type, message) => {
    const id = ++idCounter
    setToasts(t => [...t, { id, type, message }])
    setTimeout(() => remove(id), 4000)
  }, [remove])

  const toast = {
    success: msg => add('success', msg),
    error: msg => add('error', msg),
    info: msg => add('info', msg),
  }

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2" style={{ maxWidth: 380 }}>
        {toasts.map(t => {
          const Icon = ICONS[t.type]
          return (
            <div key={t.id} className="card flex items-start gap-2.5 px-4 py-3 shadow-lg" style={{ animation: 'slideUp .2s ease', borderLeft: `3px solid ${COLORS[t.type]}` }}>
              <Icon size={16} style={{ color: COLORS[t.type], flexShrink: 0, marginTop: 1 }} />
              <p className="text-sm text-fg flex-1">{t.message}</p>
              <button onClick={() => remove(t.id)} className="text-fg-3 hover:text-fg transition-colors flex-shrink-0"><X size={14} /></button>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes slideUp { from { opacity:0; transform: translateY(10px) } to { opacity:1; transform: translateY(0) } }`}</style>
    </Ctx.Provider>
  )
}

export function useToast() { return useContext(Ctx) }
