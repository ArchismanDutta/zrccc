import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, Shield } from 'lucide-react'
import { PageHeader, SectionCard } from '@/components/ui/Cards'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/api'

const ENTITY_OPTIONS = ['', 'Client', 'Project', 'Task', 'Invoice', 'Payment', 'User', 'Ticket', 'Expense', 'SalaryRecord']

const ACTION_COLOR = (action) => {
  if (action.includes('create'))       return 'success'
  if (action.includes('delete') || action.includes('archive')) return 'danger'
  if (action.includes('login') || action.includes('auth'))     return 'accent'
  return 'neutral'
}

function formatAction(action) {
  return action.replace(/\./g, ' › ').replace(/_/g, ' ')
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

export default function AuditLogPage() {
  const { toast } = useToast()
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const LIMIT = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page)
      params.set('limit', LIMIT)
      if (search) params.set('search', search)
      if (entityFilter) params.set('entity', entityFilter)
      const res = await api.getAuditLogs(`?${params}`)
      setLogs(res.data ?? [])
      setTotal(res.pagination?.total ?? 0)
    } catch (err) {
      toast.error(err.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [page, search, entityFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-5 animate-slide-up">
      <PageHeader
        title="Audit Log"
        subtitle={`${total.toLocaleString()} events recorded`}
        icon={<Shield size={20} />}
      />

      <SectionCard>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <form onSubmit={handleSearch} className="relative flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
              <input
                className="input pl-9 text-sm"
                placeholder="Search action, entity, or user…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
          <select
            className="input text-sm sm:w-44"
            value={entityFilter}
            onChange={e => { setEntityFilter(e.target.value); setPage(1) }}
          >
            <option value="">All Entities</option>
            {ENTITY_OPTIONS.filter(Boolean).map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <button
            className="btn btn-ghost btn-sm gap-1.5"
            onClick={() => fetchLogs()}
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Log table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-fg-3 text-center py-12">No audit events found</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {logs.map(log => (
              <div key={log._id} className="flex items-start gap-3 py-3 hover:bg-[var(--color-surface-2)] -mx-4 px-4 transition-colors">
                <Avatar name={log.userId?.name || log.userName || '?'} size="sm" className="mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-fg">{log.userId?.name || log.userName || 'System'}</span>
                    <Badge variant={ACTION_COLOR(log.action)} className="text-[10px] capitalize">
                      {formatAction(log.action)}
                    </Badge>
                    {log.entity && (
                      <Badge variant="neutral" className="text-[10px]">{log.entity}</Badge>
                    )}
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-xs text-fg-3 mt-0.5 truncate">
                      {JSON.stringify(log.details).slice(0, 120)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-fg-3">{timeAgo(log.createdAt)}</span>
                    {log.ipAddress && (
                      <span className="text-[11px] text-fg-3">{log.ipAddress}</span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-fg-3 flex-shrink-0 hidden sm:block">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border)]">
            <p className="text-xs text-fg-3">
              Page {page} of {totalPages} · {total.toLocaleString()} total
            </p>
            <div className="flex gap-2">
              <button
                className="btn btn-ghost btn-sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >Previous</button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >Next</button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
