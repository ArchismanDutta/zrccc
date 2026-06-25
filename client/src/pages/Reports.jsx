import { useState, useEffect } from 'react'
import { Users, Briefcase, DollarSign, CheckSquare, AlertCircle, FileText, BarChart3 } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { StatCard, PageHeader, SectionCard } from '@/components/ui/Cards'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/Progress'
import { Avatar } from '@/components/ui/Avatar'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/api'

const PIE_COLOURS = [
  'var(--color-accent)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-danger)',
  'var(--color-info)',
  'var(--color-fg-3)',
]

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  )
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs" style={{ minWidth: 150 }}>
      <p className="font-semibold text-fg mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs">
      <p className="font-semibold text-fg">{payload[0].name}</p>
      <p className="text-fg-2">{payload[0].value}</p>
    </div>
  )
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs">
      <p className="font-semibold text-fg mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.value} projects</p>
      ))}
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active ? 'border-accent text-accent' : 'border-transparent text-fg-3 hover:text-fg'
      }`}>
      {children}
    </button>
  )
}

// ─── Business Tab ─────────────────────────────────────────────
function BusinessTab({ kpis, revenue, clients }) {
  const clientsByStatus = (() => {
    const map = {}
    clients.forEach(c => { const s = c.status || 'unknown'; map[s] = (map[s] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  })()

  const topClients = [...clients]
    .sort((a, b) => (b.contract?.monthlyValue || 0) - (a.contract?.monthlyValue || 0))
    .slice(0, 10)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard label="Active Clients" value={kpis.activeClients ?? 0} sub={`${kpis.onboardingClients ?? 0} onboarding`} icon={Users} variant="accent" />
        <StatCard label="MRR Expected" value={formatCurrency(kpis.expectedMRR || 0)} sub="Monthly recurring" icon={DollarSign} variant="success" />
        <StatCard label="Collected This Month" value={formatCurrency(kpis.collectedThisMonth || 0)} sub={`of ${formatCurrency(kpis.expectedMRR || 0)}`} icon={DollarSign} variant="warning" />
        <StatCard label="Outstanding" value={kpis.overdueInvoices ?? 0} sub="Overdue invoices" icon={AlertCircle} variant="danger" />
      </div>

      <SectionCard title="Revenue Trend" subtitle="Expected vs collected — last 6 months">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={revenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="rpt-grad-expected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-fg-3)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--color-fg-3)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="rpt-grad-collected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-fg-3)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-fg-3)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} />
            <Tooltip content={<RevenueTooltip />} />
            <Area type="monotone" dataKey="expected" name="Expected" stroke="var(--color-fg-3)" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#rpt-grad-expected)" />
            <Area type="monotone" dataKey="collected" name="Collected" stroke="var(--color-accent)" strokeWidth={2} fill="url(#rpt-grad-collected)" />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectionCard title="Client Breakdown" subtitle="Top clients by MRR">
            <div className="table-container">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-fg-3 uppercase tracking-wide">Company</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-fg-3 uppercase tracking-wide">Status</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-fg-3 uppercase tracking-wide">Services</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-fg-3 uppercase tracking-wide">MRR</th>
                  </tr>
                </thead>
                <tbody>
                  {topClients.map(c => (
                    <tr key={c._id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={c.companyName || '—'} size="xs" />
                          <span className="font-medium text-fg truncate max-w-[160px]">{c.companyName || '—'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3"><StatusBadge status={c.status} /></td>
                      <td className="py-2.5 px-3 text-right text-fg-2">{(c.services || []).length}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-fg">{formatCurrency(c.contract?.monthlyValue || 0)}</td>
                    </tr>
                  ))}
                  {topClients.length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-sm text-fg-3">No clients found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Clients by Status">
          {clientsByStatus.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={clientsByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                    {clientsByStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {clientsByStatus.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLOURS[i % PIE_COLOURS.length] }} />
                    <span className="text-fg-2 flex-1 capitalize">{item.name.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-fg">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-fg-3 text-center py-8">No data</p>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

// ─── Projects Tab ─────────────────────────────────────────────
function ProjectsTab({ projects }) {
  const total = projects.length
  const active = projects.filter(p => p.status === 'active').length
  const completed = projects.filter(p => p.status === 'completed').length
  const onHold = projects.filter(p => p.status === 'on_hold').length

  const typeCount = (() => {
    const map = {}
    projects.forEach(p => { (p.type || []).forEach(t => { map[t] = (map[t] || 0) + 1 }) })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name: name.replace(/_/g, ' '), count }))
  })()

  const statusCount = (() => {
    const map = {}
    projects.forEach(p => { const s = p.status || 'unknown'; map[s] = (map[s] || 0) + 1 })
    return Object.entries(map)
  })()

  const statusColour = {
    active: 'var(--color-success)', completed: 'var(--color-accent)',
    on_hold: 'var(--color-warning)', planning: 'var(--color-info)', cancelled: 'var(--color-danger)',
  }

  const sortedProjects = [...projects].sort((a, b) => (a.overallProgress || 0) - (b.overallProgress || 0)).slice(0, 15)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard label="Total Projects" value={total} icon={Briefcase} variant="accent" />
        <StatCard label="Active" value={active} icon={Briefcase} variant="success" />
        <StatCard label="Completed" value={completed} icon={Briefcase} variant="info" />
        <StatCard label="On Hold" value={onHold} icon={Briefcase} variant="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Projects by Type" subtitle="Count per service type">
          {typeCount.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(160, typeCount.length * 36)}>
              <BarChart data={typeCount} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-fg-3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-fg-3)' }} axisLine={false} tickLine={false} width={150} />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="count" fill="var(--color-accent)" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-fg-3 text-center py-8">No data</p>
          )}
        </SectionCard>

        <SectionCard title="Status Breakdown">
          <div className="grid grid-cols-2 gap-3">
            {statusCount.map(([status, count], i) => (
              <div key={status} className="rounded-xl p-3 flex flex-col gap-1"
                style={{ background: 'var(--color-surface-2)', borderLeft: `3px solid ${statusColour[status] || PIE_COLOURS[i % PIE_COLOURS.length]}` }}>
                <span className="text-2xl font-bold text-fg">{count}</span>
                <span className="text-xs text-fg-3 capitalize">{status.replace(/_/g, ' ')}</span>
              </div>
            ))}
            {statusCount.length === 0 && <p className="col-span-2 text-sm text-fg-3 text-center py-4">No data</p>}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Projects List" subtitle="Sorted by progress — most behind first">
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 px-3 text-xs font-semibold text-fg-3 uppercase tracking-wide">Project</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-fg-3 uppercase tracking-wide hidden md:table-cell">Client</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-fg-3 uppercase tracking-wide">Progress</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-fg-3 uppercase tracking-wide">Status</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-fg-3 uppercase tracking-wide hidden sm:table-cell">Due</th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map(p => (
                <tr key={p._id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-colors">
                  <td className="py-2.5 px-3 font-medium text-fg max-w-[180px] truncate">{p.name}</td>
                  <td className="py-2.5 px-3 text-fg-2 hidden md:table-cell truncate max-w-[140px]">{p.clientId?.companyName || '—'}</td>
                  <td className="py-2.5 px-3 min-w-[120px]"><ProgressBar value={p.overallProgress || 0} size="sm" showPercent /></td>
                  <td className="py-2.5 px-3"><StatusBadge status={p.status} /></td>
                  <td className="py-2.5 px-3 text-right text-fg-3 text-xs hidden sm:table-cell">
                    {p.endDate ? formatDate(p.endDate, { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                </tr>
              ))}
              {sortedProjects.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-fg-3">No projects found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Tasks & Content Tab ──────────────────────────────────────
function TasksContentTab({ kpis, contentStats, tasks }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === 'done' || t.status === 'cancelled') return false
    return new Date(t.dueDate) < today
  })

  const taskByCategory = (() => {
    const map = {}
    tasks.forEach(t => { const c = t.category || 'other'; map[c] = (map[c] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
  })()

  const contentStatusColour = {
    idea: 'var(--color-fg-3)', draft: 'var(--color-info)', in_review: 'var(--color-warning)',
    approved: 'var(--color-accent)', published: 'var(--color-success)',
    revision_needed: 'var(--color-danger)', scheduled: 'var(--color-accent)',
  }

  const contentEntries = Object.entries(contentStats || {}).filter(([, v]) => v > 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard label="Open Tasks" value={kpis.openTasks ?? 0} sub="Across all projects" icon={CheckSquare} variant="accent" />
        <StatCard label="Due Today" value={kpis.dueTodayTasks ?? 0} sub="Need attention" icon={AlertCircle} variant="danger" />
        <StatCard label="In Review" value={contentStats?.in_review ?? 0} sub="Content pieces" icon={FileText} variant="warning" />
        <StatCard label="Published" value={contentStats?.published ?? 0} sub="Total published" icon={BarChart3} variant="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Tasks by Category" subtitle="All tasks breakdown">
          {taskByCategory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={taskByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                    {taskByCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {taskByCategory.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLOURS[i % PIE_COLOURS.length] }} />
                    <span className="text-fg-2 flex-1 capitalize">{item.name}</span>
                    <span className="font-semibold text-fg">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-fg-3 text-center py-8">No task data</p>
          )}
        </SectionCard>

        <SectionCard title="Content Status Breakdown">
          <div className="grid grid-cols-2 gap-3">
            {contentEntries.map(([status, count]) => (
              <div key={status} className="rounded-xl p-3 flex flex-col gap-1"
                style={{ background: 'var(--color-surface-2)', borderLeft: `3px solid ${contentStatusColour[status] || 'var(--color-fg-3)'}` }}>
                <span className="text-2xl font-bold text-fg">{count}</span>
                <span className="text-xs text-fg-3 capitalize">{status.replace(/_/g, ' ')}</span>
              </div>
            ))}
            {contentEntries.length === 0 && (
              <p className="col-span-2 text-sm text-fg-3 text-center py-4">No content data</p>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Overdue Tasks" subtitle="Past due date and not completed">
        <div className="space-y-2">
          {overdueTasks.map(t => (
            <div key={t._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--color-surface-2)] transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg truncate">{t.title}</p>
                <p className="text-xs text-fg-3 mt-0.5">Due {formatDate(t.dueDate, { day: 'numeric', month: 'short' })}</p>
              </div>
              {t.category && (
                <Badge variant="neutral" className="text-[10px] hidden sm:inline-flex capitalize">
                  {t.category.replace(/_/g, ' ')}
                </Badge>
              )}
              <StatusBadge status={t.status} />
              {t.assignedTo?.[0] && <Avatar name={t.assignedTo[0].name} size="xs" />}
            </div>
          ))}
          {overdueTasks.length === 0 && (
            <p className="text-sm text-fg-3 text-center py-8">No overdue tasks</p>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function ReportsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const isSuperAdmin = user?.role === 'super_admin'

  const [tab, setTab] = useState(isSuperAdmin ? 'business' : 'projects')
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({})
  const [contentStats, setContentStats] = useState({})
  const [revenue, setRevenue] = useState([])
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    ;(async () => {
      try {
        const base = [
          api.getDashboard(),
          api.getProjects('?limit=100'),
          api.getTasks('?limit=100'),
        ]
        const financePromises = isSuperAdmin
          ? [api.getRevenueChart(6), api.getClients('?limit=100')]
          : [Promise.resolve(null), Promise.resolve(null)]
        const [dash, proj, tsk, rev, cli] = await Promise.all([...base, ...financePromises])
        setKpis(dash.data?.kpis || {})
        setContentStats(dash.data?.contentStats || {})
        setProjects(proj.data || [])
        setTasks(tsk.data || [])
        if (rev) setRevenue((rev.data || []).map(d => ({
          month: MONTH_NAMES[d.month] || d.month,
          collected: d.collected || 0,
          expected: d.expected || 0,
        })))
        if (cli) setClients(cli.data || [])
      } catch (err) {
        console.error('Reports fetch failed:', err)
        toast.error('Failed to load report data')
      }
      setLoading(false)
    })()
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="space-y-4 sm:space-y-6 animate-slide-up">
      <PageHeader title="Reports & Analytics" subtitle="Project health and team performance" />

      <div className="flex gap-6 border-b border-[var(--color-border)] overflow-x-auto">
        {isSuperAdmin && <TabButton active={tab === 'business'} onClick={() => setTab('business')}>Business</TabButton>}
        <TabButton active={tab === 'projects'} onClick={() => setTab('projects')}>Projects</TabButton>
        <TabButton active={tab === 'tasks'} onClick={() => setTab('tasks')}>Tasks & Content</TabButton>
      </div>

      {isSuperAdmin && tab === 'business' && <BusinessTab kpis={kpis} revenue={revenue} clients={clients} />}
      {tab === 'projects' && <ProjectsTab projects={projects} />}
      {tab === 'tasks' && <TasksContentTab kpis={kpis} contentStats={contentStats} tasks={tasks} />}
    </div>
  )
}
