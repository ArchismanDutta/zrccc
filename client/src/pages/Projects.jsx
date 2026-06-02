import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Grid3X3, List, Clock } from 'lucide-react'
import { PageHeader, EmptyState } from '@/components/ui/Cards'
import { StatusBadge, PriorityBadge, Badge } from '@/components/ui/Badge'
import { ProgressBar, ProgressRing } from '@/components/ui/Progress'
import { Avatar, AvatarGroup } from '@/components/ui/Avatar'
import { formatDate } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/api'

const TYPE_LABEL = {
  social_media_management: 'Social Media', meta_ads: 'Meta Ads', reels: 'Reels', graphics: 'Graphics',
  carousels: 'Carousels', video_production: 'Video', website_development: 'Website Dev',
  website_maintenance: 'Web Maint.', content_writing: 'Content', photography: 'Photo', custom: 'Custom',
}
const ALL_TYPES = Object.keys(TYPE_LABEL)

export default function ProjectsPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('grid')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', clientId: '', projectManagerId: '', type: [], priority: 'medium', startDate: '', endDate: '', budget: '' })
  const [saving, setSaving] = useState(false)

  const fetchProjects = async () => {
    try { const res = await api.getProjects('?limit=100'); setProjects(res.data) }
    catch { toast.error('Failed to load projects') } finally { setLoading(false) }
  }
  useEffect(() => { fetchProjects() }, [])

  const openModal = async () => {
    setModalOpen(true)
    try { const [cl, us] = await Promise.all([api.getClients('?limit=100'), api.getUsers('?limit=100')]); setClients(cl.data); setUsers(us.data) } catch {}
  }

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.clientId?.companyName || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const toggleType = t => setForm(f => ({ ...f, type: f.type.includes(t) ? f.type.filter(x => x !== t) : [...f.type, t] }))

  const handleSubmit = async () => {
    if (!form.name || !form.clientId || !form.projectManagerId) { toast.error('Name, client, and PM are required'); return }
    setSaving(true)
    try {
      await api.createProject({ ...form, budget: Number(form.budget) || 0 })
      toast.success('Project created!'); setModalOpen(false); setForm({ name: '', clientId: '', projectManagerId: '', type: [], priority: 'medium', startDate: '', endDate: '', budget: '' }); fetchProjects()
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4 sm:space-y-6 animate-slide-up">
      <PageHeader title="Projects" subtitle={`${projects.length} projects · ${projects.filter(p => p.status === 'active').length} active`}>
        <button className="btn btn-primary gap-1.5 text-sm" onClick={openModal}><Plus size={16} /> New Project</button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
          <input className="input pl-9" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select className="input flex-1 sm:w-40 sm:flex-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option><option value="active">Active</option><option value="planning">Planning</option><option value="on_hold">On Hold</option><option value="completed">Completed</option>
          </select>
          <div className="flex gap-1 bg-[var(--color-surface-3)] p-1 rounded-lg flex-shrink-0">
            <button onClick={() => setView('grid')} className={`btn btn-sm ${view === 'grid' ? 'bg-[var(--color-surface)] shadow-sm text-fg' : 'btn-ghost text-fg-3'}`}><Grid3X3 size={14} /></button>
            <button onClick={() => setView('list')} className={`btn btn-sm ${view === 'list' ? 'bg-[var(--color-surface)] shadow-sm text-fg' : 'btn-ghost text-fg-3'}`}><List size={14} /></button>
          </div>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map(p => (
            <div key={p._id} className="card card-hover p-3 sm:p-4 cursor-pointer" onClick={() => navigate(`/projects/${p._id}`)}>
              <div className="flex items-start gap-2.5 sm:gap-3 mb-3">
                <ProgressRing value={p.overallProgress} size={44} strokeWidth={4} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-fg leading-tight">{p.name}</h3>
                  <p className="text-xs text-fg-3 mt-0.5 truncate">{p.clientId?.companyName || '—'}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap"><StatusBadge status={p.status} /><PriorityBadge priority={p.priority} /></div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {(p.type || []).slice(0, 3).map(t => <Badge key={t} variant="accent" className="text-[10px]">{TYPE_LABEL[t] ?? t}</Badge>)}
                {(p.type || []).length > 3 && <Badge variant="neutral" className="text-[10px]">+{p.type.length - 3}</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-1 sm:gap-2 text-center py-2 sm:py-2.5 border-t border-b border-[var(--color-border)] mb-3">
                <div><p className="text-xs font-bold text-fg">{p.overallProgress}%</p><p className="text-[10px] text-fg-3">Progress</p></div>
                <div className="border-x border-[var(--color-border)]"><p className="text-xs font-bold text-fg">{p.teamMembers?.length || 0}</p><p className="text-[10px] text-fg-3">Members</p></div>
                <div><p className="text-xs font-bold text-fg">{p.milestones?.length || 0}</p><p className="text-[10px] text-fg-3">Milestones</p></div>
              </div>
              <div className="flex items-center justify-between">
                <AvatarGroup users={(p.teamMembers || []).map(m => ({ name: m.userId?.name || 'User' }))} max={3} size="xs" />
                <div className="flex items-center gap-1 text-[10px] text-fg-3"><Clock size={10} />{formatDate(p.endDate, { year: undefined })}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-container">
          <table><thead><tr><th>Project</th><th>Client</th><th>Services</th><th>Progress</th><th>Team</th><th>Status</th><th>Due</th></tr></thead>
          <tbody>{filtered.map(p => (
            <tr key={p._id} className="cursor-pointer" onClick={() => navigate(`/projects/${p._id}`)}>
              <td><p className="font-medium text-fg">{p.name}</p><p className="text-xs text-fg-3">PM: {p.projectManagerId?.name || '—'}</p></td>
              <td className="text-fg-2">{p.clientId?.companyName || '—'}</td>
              <td><div className="flex flex-wrap gap-1">{(p.type || []).slice(0, 2).map(t => <Badge key={t} variant="neutral" className="text-[10px]">{TYPE_LABEL[t]}</Badge>)}{(p.type?.length || 0) > 2 && <Badge variant="neutral" className="text-[10px]">+{p.type.length - 2}</Badge>}</div></td>
              <td style={{ minWidth: 100 }}><ProgressBar value={p.overallProgress} size="sm" /></td>
              <td><AvatarGroup users={(p.teamMembers || []).map(m => ({ name: m.userId?.name || 'User' }))} max={3} size="xs" /></td>
              <td><StatusBadge status={p.status} /></td>
              <td className="text-xs text-fg-2 whitespace-nowrap">{formatDate(p.endDate, { year: undefined })}</td>
            </tr>
          ))}</tbody></table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Project" size="md" footer={
        <><button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Creating…' : 'Create Project'}</button></>
      }>
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Project Name *</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. StyleHub Social Media Q3" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Client *</label>
            <select className="input" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
              <option value="">Select client</option>{clients.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}
            </select></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Project Manager *</label>
            <select className="input" value={form.projectManagerId} onChange={e => setForm(f => ({ ...f, projectManagerId: e.target.value }))}>
              <option value="">Select PM</option>{users.filter(u => ['super_admin','admin','project_manager'].includes(u.role)).map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Priority</label>
            <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Start Date</label>
            <input type="date" className="input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">End Date</label>
            <input type="date" className="input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
          </div>
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Contract Value (₹)</label>
          <input type="number" className="input" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} /></div>
          <div><label className="block text-xs font-medium text-fg-2 mb-2">Service Types</label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {ALL_TYPES.map(t => (
              <label key={t} className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] sm:text-xs cursor-pointer border transition-colors ${form.type.includes(t) ? 'bg-accent/10 border-accent text-accent' : 'border-[var(--color-border)] text-fg-3'}`}>
                <input type="checkbox" checked={form.type.includes(t)} onChange={() => toggleType(t)} className="sr-only" />{TYPE_LABEL[t]}
              </label>
            ))}
          </div></div>
        </div>
      </Modal>
    </div>
  )
}
