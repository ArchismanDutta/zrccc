import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Mail, Phone, Globe } from 'lucide-react'
import { PageHeader, EmptyState } from '@/components/ui/Cards'
import { StatusBadge, Badge, PriorityBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { formatCurrency } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/api'

const SERVICE_LABELS = {
  social_media_management: 'Social Media', meta_ads: 'Meta Ads', reels: 'Reels', graphics: 'Graphics',
  carousels: 'Carousels', video_production: 'Video', website_development: 'Website Dev',
  website_maintenance: 'Website Maint.', content_writing: 'Content Writing', photography: 'Photography',
}
const ALL_SERVICES = Object.keys(SERVICE_LABELS)
const EMPTY_FORM = { companyName: '', contactName: '', contactEmail: '', contactPhone: '', website: '', industry: '', services: [], 'contract.monthlyValue': '', priority: 'medium' }

export default function ClientsPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  const fetchClients = async () => {
    try { const res = await api.getClients('?limit=100'); setClients(res.data) }
    catch { toast.error('Failed to load clients') }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchClients() }, [])

  const filtered = clients.filter(c => {
    const matchSearch = (c.companyName || '').toLowerCase().includes(search.toLowerCase()) || (c.contactName || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })
  const totalMRR = filtered.reduce((s, c) => s + (c.contract?.monthlyValue || 0), 0)

  const toggleService = (svc) => setForm(f => ({ ...f, services: f.services.includes(svc) ? f.services.filter(s => s !== svc) : [...f.services, svc] }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.companyName) { toast.error('Company name is required'); return }
    setSaving(true)
    try {
      await api.createClient({ companyName: form.companyName, contactName: form.contactName, contactEmail: form.contactEmail, contactPhone: form.contactPhone, website: form.website, industry: form.industry, services: form.services, contract: { monthlyValue: Number(form['contract.monthlyValue']) || 0 }, priority: form.priority })
      toast.success('Client created!'); setModalOpen(false); setForm({ ...EMPTY_FORM }); fetchClients()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4 sm:space-y-6 animate-slide-up">
      <PageHeader title="Clients" subtitle={`${clients.length} total · ${formatCurrency(totalMRR)}/mo MRR`}>
        <button className="btn btn-primary gap-1.5 text-sm" onClick={() => setModalOpen(true)}><Plus size={16} /> Add Client</button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
          <input className="input pl-9" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option><option value="active">Active</option><option value="onboarding">Onboarding</option><option value="paused">Paused</option><option value="churned">Churned</option>
        </select>
      </div>

      {/* Client Cards */}
      {filtered.length === 0 ? (
        <EmptyState icon={Globe} title="No clients found" description="Try adjusting your search or filters" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map(client => (
            <div key={client._id} className="card card-hover p-3 sm:p-4 cursor-pointer" onClick={() => navigate(`/clients/${client._id}`)}>
              <div className="flex items-start gap-2.5 sm:gap-3 mb-3">
                <Avatar name={client.companyName} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="font-semibold text-sm text-fg truncate">{client.companyName}</h3>
                    {client.priority === 'vip' && <span title="VIP">⭐</span>}
                  </div>
                  <p className="text-xs text-fg-3 truncate">{client.contactName}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <StatusBadge status={client.status} /><PriorityBadge priority={client.priority} />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {(client.services || []).slice(0, 4).map(s => <Badge key={s} variant="neutral" className="text-[10px]">{SERVICE_LABELS[s] ?? s}</Badge>)}
                {(client.services || []).length > 4 && <Badge variant="neutral" className="text-[10px]">+{client.services.length - 4}</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-1 sm:gap-2 py-2.5 sm:py-3 border-t border-b border-[var(--color-border)] mb-3">
                <div className="text-center"><p className="text-xs font-bold text-fg">{formatCurrency(client.contract?.monthlyValue || 0)}</p><p className="text-[10px] text-fg-3">MRR</p></div>
                <div className="text-center border-x border-[var(--color-border)]"><p className="text-xs font-bold text-fg">{client.healthScore ?? '—'}</p><p className="text-[10px] text-fg-3">Health</p></div>
                <div className="text-center"><p className="text-xs font-bold text-fg truncate">{client.accountManagerId?.name || '—'}</p><p className="text-[10px] text-fg-3">AM</p></div>
              </div>
              <div className="flex gap-2">
                {client.contactEmail && <a href={`mailto:${client.contactEmail}`} onClick={e => e.stopPropagation()} className="btn btn-ghost btn-sm flex-1 text-xs gap-1"><Mail size={12} /> Email</a>}
                {client.contactPhone && <a href={`tel:${client.contactPhone}`} onClick={e => e.stopPropagation()} className="btn btn-ghost btn-sm flex-1 text-xs gap-1"><Phone size={12} /> Call</a>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add New Client" size="md" footer={
        <><button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
        <button className="btn btn-primary gap-1.5" onClick={handleSubmit} disabled={saving}>{saving ? 'Creating…' : 'Create Client'}</button></>
      }>
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Company Name *</label>
          <input className="input" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder="e.g. StyleHub Pvt Ltd" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Contact Name</label><input className="input" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Contact Email</label><input className="input" type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Phone</label><input className="input" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Website</label><input className="input" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Monthly Value (₹)</label><input className="input" type="number" value={form['contract.monthlyValue']} onChange={e => setForm(f => ({ ...f, 'contract.monthlyValue': e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Priority</label><select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="vip">VIP</option>
            </select></div>
          </div>
          <div><label className="block text-xs font-medium text-fg-2 mb-2">Services</label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {ALL_SERVICES.map(svc => (
              <label key={svc} className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] sm:text-xs cursor-pointer border transition-colors ${form.services.includes(svc) ? 'bg-accent/10 border-accent text-accent' : 'border-[var(--color-border)] text-fg-3 hover:border-[var(--color-fg-3)]'}`}>
                <input type="checkbox" checked={form.services.includes(svc)} onChange={() => toggleService(svc)} className="sr-only" />{SERVICE_LABELS[svc]}
              </label>
            ))}
          </div></div>
        </div>
      </Modal>
    </div>
  )
}
