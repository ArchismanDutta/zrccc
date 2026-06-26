import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, FileText, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/Badge'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/api'

export default function PortalOverview() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [pendingContent, setPendingContent] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getProjects('?limit=100'),
      api.getContent('?status=awaiting_client&limit=10'),
      api.getInvoices('?limit=50'),
    ]).then(([p, c, i]) => {
      setProjects(p.data || [])
      setPendingContent(c.data || [])
      setInvoices(i.data || [])
    }).catch(() => toast.error('Failed to load data'))
    .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  )

  const activeProjects = projects.filter(p => p.status === 'active')
  const unpaidInvoices = invoices.filter(i => ['sent', 'partial', 'overdue'].includes(i.status))
  const totalOutstanding = unpaidInvoices.reduce((s, i) => s + ((i.totalAmount || 0) - (i.paidAmount || 0)), 0)

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-fg">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-sm text-fg-3 mt-1">Here's what's happening with your account</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Projects', value: activeProjects.length, icon: Briefcase, colour: 'var(--color-accent)' },
          { label: 'Pending Approvals', value: pendingContent.length, icon: Clock, colour: 'var(--color-warning)' },
          { label: 'Unpaid Invoices', value: unpaidInvoices.length, icon: FileText, colour: 'var(--color-danger)' },
          { label: 'Outstanding', value: formatCurrency(totalOutstanding), icon: CheckCircle, colour: 'var(--color-success)' },
        ].map(card => (
          <div key={card.label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-fg-3">{card.label}</p>
              <card.icon size={15} style={{ color: card.colour }} />
            </div>
            <p className="text-xl font-bold" style={{ color: card.colour }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <p className="font-semibold text-sm text-fg">Active Projects</p>
            <button onClick={() => navigate('/portal/projects')} className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </button>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {activeProjects.slice(0, 5).map(p => (
              <button key={p._id} onClick={() => navigate('/portal/projects')}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--color-surface-2)] transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg truncate">{p.name}</p>
                  <p className="text-xs text-fg-3 mt-0.5">{(p.type || []).map(t => t.replace(/_/g, ' ')).join(', ') || '—'}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1 rounded-full bg-[var(--color-surface-3)] overflow-hidden" style={{ maxWidth: 120 }}>
                      <div className="h-full rounded-full bg-accent" style={{ width: `${p.overallProgress || 0}%` }} />
                    </div>
                    <span className="text-[10px] text-fg-3">{p.overallProgress || 0}%</span>
                  </div>
                </div>
                <StatusBadge status={p.status} className="ml-3 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pending Approvals */}
      {pendingContent.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <p className="font-semibold text-sm text-fg">Awaiting Your Approval</p>
            <button onClick={() => navigate('/portal/content')} className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </button>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {pendingContent.slice(0, 5).map(item => (
              <button key={item._id} onClick={() => navigate('/portal/content')}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--color-surface-2)] transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{item.title}</p>
                  <p className="text-xs text-fg-3 mt-0.5 capitalize">{(item.contentType || '').replace(/_/g, ' ')} · {(item.platform || []).join(', ')}</p>
                </div>
                <span className="badge badge-warning text-xs ml-3 flex-shrink-0">Review</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Invoices */}
      {unpaidInvoices.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <p className="font-semibold text-sm text-fg">Outstanding Invoices</p>
            <button onClick={() => navigate('/portal/invoices')} className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </button>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {unpaidInvoices.slice(0, 5).map(inv => (
              <div key={inv._id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-mono font-semibold text-fg">{inv.invoiceNumber || inv.invoiceId}</p>
                  <p className="text-xs text-fg-3 mt-0.5">Due {formatDate(inv.dueDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-[var(--color-danger)]">{formatCurrency((inv.totalAmount || 0) - (inv.paidAmount || 0))}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeProjects.length === 0 && pendingContent.length === 0 && unpaidInvoices.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-fg-3 text-sm">Everything is up to date. No pending actions.</p>
        </div>
      )}
    </div>
  )
}
