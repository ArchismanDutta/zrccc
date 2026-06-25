import { useState, useEffect } from 'react'
import { Briefcase, FileText, CheckCircle, Clock } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/Badge'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/api'

export default function PortalOverview() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [projects, setProjects] = useState([])
  const [content, setContent] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getProjects('?limit=100'),
      api.getContent('?limit=50'),
      api.getInvoices('?limit=50'),
    ]).then(([p, c, i]) => {
      setProjects(p.data || [])
      setContent(c.data || [])
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
  const pendingApprovals = content.filter(c => c.status === 'awaiting_client')
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
          { label: 'Pending Approvals', value: pendingApprovals.length, icon: Clock, colour: 'var(--color-warning)' },
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
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <p className="font-semibold text-sm text-fg">Active Projects</p>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {activeProjects.slice(0, 5).map(p => (
              <div key={p._id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-fg">{p.name}</p>
                  <p className="text-xs text-fg-3 mt-0.5">{(p.type || []).join(', ').replace(/_/g, ' ') || '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-fg-3">Progress</p>
                    <p className="text-sm font-semibold text-fg">{p.overallProgress || 0}%</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <p className="font-semibold text-sm text-fg">Awaiting Your Approval</p>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {pendingApprovals.slice(0, 5).map(item => (
              <div key={item._id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-fg">{item.title}</p>
                  <p className="text-xs text-fg-3 mt-0.5 capitalize">{(item.contentType || '').replace(/_/g, ' ')} · {(item.platform || []).join(', ')}</p>
                </div>
                <span className="badge badge-warning text-xs">Review</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 border-t border-[var(--color-border)]">
            <a href="/portal/content" className="text-xs text-accent font-medium hover:underline">View all content →</a>
          </div>
        </div>
      )}

      {/* Recent Invoices */}
      {unpaidInvoices.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <p className="font-semibold text-sm text-fg">Outstanding Invoices</p>
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

      {activeProjects.length === 0 && pendingApprovals.length === 0 && unpaidInvoices.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-fg-3 text-sm">Everything is up to date. No pending actions.</p>
        </div>
      )}
    </div>
  )
}
