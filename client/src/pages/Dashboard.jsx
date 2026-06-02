import { useState, useEffect } from 'react'
import {
  Users, Briefcase, DollarSign, CheckSquare, ArrowRight,
  Calendar, Image, Video, Star, Clock
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { StatCard, PageHeader, SectionCard } from '@/components/ui/Cards'
import { StatusBadge, PriorityBadge, Badge } from '@/components/ui/Badge'
import { ProgressRing } from '@/components/ui/Progress'
import { Avatar } from '@/components/ui/Avatar'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import api from '@/lib/api'

const CONTENT_TYPE_ICON = { reel: Video, carousel: Image, meta_ad_creative: Star, static_post: Image, video: Video, story: Image, default: Calendar }
const CATEGORY_EMOJI = { shooting:'📹', reel_editing:'✂️', video_editing:'🎬', graphic_design:'🎨', carousel_design:'🃏', caption_writing:'✍️', meta_ads_management:'📢', meta_ad_creative:'🖼', web_development:'💻', content_planning:'📋', client_report:'📊', internal:'🏢' }
const TASK_BREAKDOWN_COLOURS = ['var(--color-accent)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-info)', 'var(--color-fg-3)']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs" style={{ minWidth: 140 }}>
      <p className="font-semibold text-fg mb-1">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>)}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [kpis, setKpis] = useState({})
  const [revenue, setRevenue] = useState([])
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [content, setContent] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  const isSuperAdmin = user?.role === 'super_admin'

  useEffect(() => {
    (async () => {
      try {
        const base = [
          api.getDashboard(),
          api.getProjects('?status=active&limit=4'),
          api.getTasks('?status=todo,in_progress,review&limit=5&sort=-priority'),
          api.getContent('?status=in_review,revision_needed,approved&limit=4'),
        ]
        const financePromises = isSuperAdmin
          ? [api.getRevenueChart(6), api.getInvoices('?status=overdue,partial,sent&limit=4')]
          : [Promise.resolve(null), Promise.resolve(null)]
        const [dash, proj, task, cont, rev, inv] = await Promise.all([...base, ...financePromises])
        setKpis(dash.data?.kpis || {})
        setProjects(proj.data || [])
        setTasks(task.data || [])
        setContent(cont.data || [])
        if (rev) setRevenue((rev.data || []).map(d => ({
          month: ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.month],
          collected: d.collected || 0, expected: d.expected || 0,
        })))
        if (inv) setInvoices(inv.data || [])
      } catch {}
      setLoading(false)
    })()
  }, [])

  // Task breakdown from tasks
  const taskBreakdown = (() => {
    const cats = {}
    tasks.forEach(t => { const c = t.category || 'other'; cats[c] = (cats[c] || 0) + 1 })
    return Object.entries(cats).slice(0, 5).map(([name, value], i) => ({ name: name.replace(/_/g, ' '), value, colour: TASK_BREAKDOWN_COLOURS[i] || 'var(--color-fg-3)' }))
  })()

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /></div>

  const firstName = (user?.name || 'User').split(' ')[0]

  return (
    <div className="space-y-4 sm:space-y-6 animate-slide-up">
      <PageHeader title={`Good morning, ${firstName} 👋`} subtitle="Here's what's happening at ZRC Media Network today" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {isSuperAdmin && <StatCard label="Active Clients" value={kpis.activeClients ?? 0} sub={`${kpis.onboardingClients ?? 0} onboarding`} icon={Users} variant="accent" />}
        <StatCard label="Active Projects" value={kpis.activeProjects ?? 0} sub={`${kpis.dueTodayTasks ?? 0} tasks due today`} icon={Briefcase} variant="success" />
        {isSuperAdmin && <StatCard label="Revenue" value={formatCurrency(kpis.collectedThisMonth || 0)} sub={`Expected ${formatCurrency(kpis.expectedMRR || 0)}`} icon={DollarSign} variant="warning" />}
        <StatCard label="Open Tasks" value={kpis.openTasks ?? 0} sub={`${kpis.pendingTasks ?? 0} pending`} icon={CheckSquare} variant="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {isSuperAdmin && (
          <div className="lg:col-span-2">
            <SectionCard title="Revenue Trend" subtitle="Expected vs collected">
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={revenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-expected" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-fg-3)" stopOpacity={0.15} /><stop offset="95%" stopColor="var(--color-fg-3)" stopOpacity={0} /></linearGradient>
                    <linearGradient id="grad-collected" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2} /><stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-fg-3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-fg-3)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="expected" name="Expected" stroke="var(--color-fg-3)" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#grad-expected)" />
                  <Area type="monotone" dataKey="collected" name="Collected" stroke="var(--color-accent)" strokeWidth={2} fill="url(#grad-collected)" />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>
        )}

        <SectionCard title="Task Breakdown" subtitle="Open tasks by category">
          {taskBreakdown.length > 0 ? (<>
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart><Pie data={taskBreakdown} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value">
                  {taskBreakdown.map((e, i) => <Cell key={i} fill={e.colour} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v + ' tasks', n]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-1">
              {taskBreakdown.map(t => (
                <div key={t.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.colour }} />
                  <span className="text-fg-2 flex-1 capitalize">{t.name}</span>
                  <span className="font-semibold text-fg">{t.value}</span>
                </div>
              ))}
            </div>
          </>) : <p className="text-sm text-fg-3 text-center py-8">No tasks yet</p>}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Active Projects" subtitle="In progress" actions={<a href="/projects" className="btn btn-ghost btn-sm text-xs gap-1">View all <ArrowRight size={12} /></a>}>
          <div className="space-y-3">
            {projects.map(p => (
              <div key={p._id} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] transition-colors cursor-pointer">
                <ProgressRing value={p.overallProgress} size={44} strokeWidth={4} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-sm font-semibold text-fg truncate">{p.name}</p>
                    <PriorityBadge priority={p.priority} />
                  </div>
                  <p className="text-xs text-fg-3 truncate">{p.clientId?.companyName || '—'} • {(p.type || []).join(', ')}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Clock size={10} className="text-fg-3 flex-shrink-0" />
                    <span className="text-[10px] text-fg-3">Due {p.endDate ? new Date(p.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</span>
                    <span className="text-[10px] text-fg-3 ml-auto">PM: {p.projectManagerId?.name || '—'}</span>
                  </div>
                </div>
              </div>
            ))}
            {projects.length === 0 && <p className="text-sm text-fg-3 text-center py-4">No active projects</p>}
          </div>
        </SectionCard>

        <SectionCard title="Content Queue" subtitle="Awaiting review or action" actions={<a href="/content" className="btn btn-ghost btn-sm text-xs gap-1">Calendar <ArrowRight size={12} /></a>}>
          <div className="space-y-2">
            {content.map(c => {
              const Icon = CONTENT_TYPE_ICON[c.contentType] ?? CONTENT_TYPE_ICON.default
              return (
                <div key={c._id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-accent-ghost"><Icon size={15} className="text-accent" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{c.title}</p>
                    <p className="text-xs text-fg-3">{c.clientId?.displayName || c.clientId?.companyName || '—'} • {c.assignedTo?.[0]?.name || '—'}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              )
            })}
            {content.length === 0 && <p className="text-sm text-fg-3 text-center py-4">No pending content</p>}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Tasks Due Soon" subtitle="Top priority" actions={<a href="/tasks" className="btn btn-ghost btn-sm text-xs gap-1">All tasks <ArrowRight size={12} /></a>}>
          <div className="space-y-2">
            {tasks.map(t => (
              <div key={t._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer">
                <span className="text-base flex-shrink-0">{CATEGORY_EMOJI[t.category] || '📋'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{t.title}</p>
                  <p className="text-xs text-fg-3">{t.assignedTo?.[0]?.name || '—'} • {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</p>
                </div>
                <PriorityBadge priority={t.priority} />
              </div>
            ))}
            {tasks.length === 0 && <p className="text-sm text-fg-3 text-center py-4">No upcoming tasks</p>}
          </div>
        </SectionCard>

        {isSuperAdmin && (
          <SectionCard title="Outstanding Payments" subtitle="Clients with pending invoices" actions={<a href="/finance" className="btn btn-ghost btn-sm text-xs gap-1">Finance <ArrowRight size={12} /></a>}>
            <div className="space-y-3">
              {invoices.map(inv => {
                const owed = (inv.totalAmount || 0) - (inv.paidAmount || 0)
                const isOverdue = inv.status === 'overdue'
                return (
                  <div key={inv._id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] transition-colors cursor-pointer">
                    <Avatar name={inv.clientId?.companyName || '—'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{inv.clientId?.companyName || '—'}</p>
                      <p className="text-xs text-fg-3">{isOverdue ? <span className="text-[var(--color-danger)]">Overdue</span> : 'Pending'} • {inv.invoiceNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-fg">{formatCurrency(owed)}</p>
                      <Badge variant={isOverdue ? 'danger' : 'warning'} className="text-[10px]">{inv.status}</Badge>
                    </div>
                  </div>
                )
              })}
              {invoices.length === 0 && <p className="text-sm text-fg-3 text-center py-4">All clear!</p>}
              {invoices.length > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                  <span className="text-xs font-semibold text-fg-3">Total Outstanding</span>
                  <span className="text-sm font-bold text-[var(--color-danger)]">{formatCurrency(invoices.reduce((s, i) => s + ((i.totalAmount || 0) - (i.paidAmount || 0)), 0))}</span>
                </div>
              )}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  )
}
