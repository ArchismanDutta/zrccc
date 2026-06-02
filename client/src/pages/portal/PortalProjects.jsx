import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/api'

export default function PortalProjects() {
  const { toast } = useToast()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getProjects('?limit=100')
      .then(r => setProjects(r.data || []))
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-fg">My Projects</h1>
        <p className="text-sm text-fg-3 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
      </div>

      {projects.length === 0 ? (
        <div className="card p-12 text-center text-fg-3 text-sm">No projects assigned yet.</div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => (
            <div key={p._id} className="card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-fg">{p.name}</p>
                  <p className="text-xs text-fg-3 font-mono mt-0.5">{p.projectId}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>

              {p.description && <p className="text-sm text-fg-2 mb-3">{p.description}</p>}

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-fg-3">Progress</span>
                  <span className="text-xs font-semibold text-fg">{p.overallProgress || 0}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${p.overallProgress || 0}%` }} />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-fg-3">
                {p.startDate && <span>Start: {formatDate(p.startDate)}</span>}
                {p.endDate && <span>End: {formatDate(p.endDate)}</span>}
                {(p.type || []).length > 0 && (
                  <span className="capitalize">{(p.type || []).map(t => t.replace(/_/g, ' ')).join(', ')}</span>
                )}
              </div>

              {/* Milestones */}
              {(p.milestones || []).length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                  <p className="text-xs font-semibold text-fg-2 mb-2">Milestones</p>
                  <div className="space-y-1.5">
                    {p.milestones.map(m => (
                      <div key={m._id} className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${m.completed ? 'bg-[var(--color-success)] border-[var(--color-success)]' : 'border-[var(--color-border)]'}`} />
                        <span className={`text-xs ${m.completed ? 'line-through text-fg-3' : 'text-fg-2'}`}>{m.title}</span>
                        {m.dueDate && <span className="text-[10px] text-fg-3 ml-auto">{formatDate(m.dueDate)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
