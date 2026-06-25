import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, Globe, MapPin, Building2,
  DollarSign, Briefcase, Plus, MoreHorizontal, Edit2, Check, X,
} from 'lucide-react'
import { PageHeader, SectionCard, StatCard, EmptyState, Skeleton } from '@/components/ui/Cards'
import { StatusBadge, PriorityBadge, Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { ProgressBar } from '@/components/ui/Progress'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import api from '@/lib/api'


const TABS = ['Overview', 'Projects', 'Finance']

function InfoRow({ label, value, mono }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[var(--color-border)] last:border-0">
      <span className="text-xs text-fg-3 w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-fg flex-1 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}

function StatusChip({ status, onChangeStatus }) {
  const [open, setOpen] = useState(false)
  const [churnReason, setChurnReason] = useState('')
  const [showReason, setShowReason] = useState(false)
  const statuses = ['prospect', 'onboarding', 'active', 'paused', 'churned', 'reactivated']

  const handleSelect = (s) => {
    if (s === 'churned') { setShowReason(true); setOpen(false) }
    else { onChangeStatus(s); setOpen(false) }
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1">
        <StatusBadge status={status} />
        <Edit2 size={10} className="text-fg-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg py-1 min-w-[140px]">
          {statuses.map(s => (
            <button key={s} onClick={() => handleSelect(s)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--color-surface-3)] transition-colors ${s === status ? 'text-accent font-semibold' : 'text-fg-2'}`}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      )}
      {showReason && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg p-3 w-64">
          <p className="text-xs font-semibold text-fg mb-2">Reason for churning</p>
          <textarea className="input resize-none text-xs w-full" rows={2} placeholder="e.g. budget cut, competitor…"
            value={churnReason} onChange={e => setChurnReason(e.target.value)} />
          <div className="flex gap-2 mt-2">
            <button className="btn btn-ghost btn-sm text-xs flex-1" onClick={() => { setShowReason(false); setChurnReason('') }}>Cancel</button>
            <button className="btn btn-sm text-xs flex-1" style={{ background: 'var(--color-danger)', color: '#fff' }}
              disabled={!churnReason.trim()}
              onClick={() => { onChangeStatus('churned', churnReason.trim()); setShowReason(false); setChurnReason('') }}>
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [client, setClient] = useState(null)
  const [projects, setProjects] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  const fetchClient = async () => {
    try { const res = await api.getClient(id); setClient(res.data) }
    catch { toast.error('Client not found'); navigate('/clients') }
  }

  const fetchProjects = async () => {
    try { const res = await api.getProjects(`?clientId=${id}&limit=50`); setProjects(res.data || []) }
    catch {}
  }

  const fetchInvoices = async () => {
    try { const res = await api.getInvoices(`?clientId=${id}&limit=50`); setInvoices(res.data || []) }
    catch {}
  }

  useEffect(() => {
    Promise.all([fetchClient(), fetchProjects(), fetchInvoices()]).finally(() => setLoading(false))
  }, [id])

  const openEdit = () => {
    setEditForm({
      companyName: client.companyName || '',
      contactName: client.contactName || '',
      contactEmail: client.contactEmail || '',
      contactPhone: client.contactPhone || '',
      website: client.website || '',
      industry: client.industry || '',
      notes: client.notes || '',
      'contract.monthlyValue': client.contract?.monthlyValue || '',
    })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      await api.updateClient(id, {
        companyName: editForm.companyName,
        contactName: editForm.contactName,
        contactEmail: editForm.contactEmail,
        contactPhone: editForm.contactPhone,
        website: editForm.website,
        industry: editForm.industry,
        notes: editForm.notes,
        contract: { ...client.contract, monthlyValue: Number(editForm['contract.monthlyValue']) || 0 },
      })
      toast.success('Client updated')
      setEditOpen(false)
      fetchClient()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const changeStatus = async (status, reason) => {
    try {
      await api.changeClientStatus(id, { status, ...(reason ? { reason } : {}) })
      toast.success(`Status changed to ${status}`)
      fetchClient()
    } catch (err) { toast.error(err.message) }
  }

  if (loading) return (
    <div className="space-y-4 animate-slide-up">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
  if (!client) return null

  const totalBilled = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0)
  const totalPaid = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0)

  return (
    <div className="space-y-4 sm:space-y-5 animate-slide-up">
      {/* Back nav */}
      <button onClick={() => navigate('/clients')} className="flex items-center gap-1.5 text-sm text-fg-3 hover:text-fg transition-colors -mb-2">
        <ArrowLeft size={15} /> Back to Clients
      </button>

      {/* Hero header */}
      <div className="card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Avatar name={client.companyName} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-fg">{client.companyName}</h1>
              {client.priority === 'vip' && <span title="VIP">⭐</span>}
            </div>
            {client.displayName && client.displayName !== client.companyName && (
              <p className="text-sm text-fg-3 mb-2">{client.displayName}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={client.status} onChangeStatus={changeStatus} />
              <PriorityBadge priority={client.priority} />
              {client.industry && <Badge variant="neutral">{client.industry}</Badge>}
              <span className="text-xs font-mono text-fg-3">{client.clientId}</span>
            </div>
          </div>
          <button onClick={openEdit} className="btn btn-secondary btn-sm gap-1.5 flex-shrink-0">
            <Edit2 size={13} /> Edit
          </button>
        </div>

        {/* Quick contact row */}
        <div className="flex flex-wrap gap-3 sm:gap-5 mt-4 pt-4 border-t border-[var(--color-border)]">
          {client.contactEmail && (
            <a href={`mailto:${client.contactEmail}`} className="flex items-center gap-1.5 text-xs text-fg-2 hover:text-accent transition-colors">
              <Mail size={13} /> {client.contactEmail}
            </a>
          )}
          {client.contactPhone && (
            <a href={`tel:${client.contactPhone}`} className="flex items-center gap-1.5 text-xs text-fg-2 hover:text-accent transition-colors">
              <Phone size={13} /> {client.contactPhone}
            </a>
          )}
          {client.website && (
            <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-fg-2 hover:text-accent transition-colors">
              <Globe size={13} /> {client.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {client.accountManagerId && (
            <div className="flex items-center gap-1.5 text-xs text-fg-2">
              <Avatar name={client.accountManagerId.name} size="xs" />
              AM: {client.accountManagerId.name}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard label="Monthly Value" value={formatCurrency(client.contract?.monthlyValue || 0)} sub={client.contract?.billingCycle || 'monthly'} icon={DollarSign} variant="accent" />
        <StatCard label="Active Projects" value={projects.filter(p => p.status === 'active').length} sub={`${projects.length} total`} icon={Briefcase} variant="success" />
        <StatCard label="Total Billed" value={formatCurrency(totalBilled)} sub="All invoices" icon={DollarSign} variant="warning" />
        <StatCard label="Outstanding" value={formatCurrency(totalBilled - totalPaid)} sub="Pending payment" icon={DollarSign} variant="danger" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t ? 'border-accent text-accent' : 'border-transparent text-fg-3 hover:text-fg'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Contract */}
          <SectionCard title="Contract">
            <div>
              <InfoRow label="Monthly Value" value={formatCurrency(client.contract?.monthlyValue || 0)} />
              <InfoRow label="Billing Cycle" value={client.contract?.billingCycle} />
              <InfoRow label="Currency" value={client.contract?.currency} />
              <InfoRow label="Start Date" value={formatDate(client.contract?.startDate)} />
              <InfoRow label="End Date" value={formatDate(client.contract?.endDate)} />
              <InfoRow label="Payment Terms" value={client.contract?.paymentTerms} />
              {client.contract?.terms && <InfoRow label="Terms" value={client.contract.terms} />}
            </div>
          </SectionCard>

          {/* Company info */}
          <SectionCard title="Company Info">
            <InfoRow label="Primary Contact" value={client.contactName} />
            <InfoRow label="Email" value={client.contactEmail} />
            <InfoRow label="Phone" value={client.contactPhone} />
            <InfoRow label="Website" value={client.website} />
            <InfoRow label="Industry" value={client.industry} />
            <InfoRow label="Region" value={client.region} />
            <InfoRow label="GST" value={client.gstNumber} mono />
            <InfoRow label="PAN" value={client.panNumber} mono />
            <InfoRow label="Billing Address" value={client.billingAddress} />
          </SectionCard>

          {/* Notes */}
          {client.notes && (
            <SectionCard title="Internal Notes" className="lg:col-span-2">
              <p className="text-sm text-fg-2 whitespace-pre-wrap">{client.notes}</p>
            </SectionCard>
          )}
        </div>
      )}

      {/* Projects tab */}
      {tab === 'Projects' && (
        <div className="space-y-3">
          {projects.length === 0 ? (
            <EmptyState icon={Briefcase} title="No projects yet" description="Create a project for this client to get started" />
          ) : (
            projects.map(p => (
              <div key={p._id} className="card card-hover p-4 cursor-pointer" onClick={() => navigate(`/projects/${p._id}`)}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-fg">{p.name}</h3>
                      <StatusBadge status={p.status} />
                      <PriorityBadge priority={p.priority} />
                    </div>
                    <p className="text-xs text-fg-3 font-mono">{p.projectId}</p>
                    {p.description && <p className="text-xs text-fg-2 mt-1 line-clamp-2">{p.description}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-fg">{p.overallProgress ?? 0}%</p>
                    <p className="text-[10px] text-fg-3">progress</p>
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar value={p.overallProgress ?? 0} />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex flex-wrap gap-1">
                    {(p.type || []).slice(0, 3).map(t => (
                      <Badge key={t} variant="neutral" className="text-[10px]">{t.replace(/_/g, ' ')}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-fg-3">
                    {p.endDate && <><span>Due</span> <span className="font-medium text-fg-2">{formatDate(p.endDate, { year: undefined })}</span></>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Finance tab */}
      {tab === 'Finance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 text-center">
              <p className="text-xl font-bold text-fg">{formatCurrency(totalBilled)}</p>
              <p className="text-xs text-fg-3 mt-1">Total Billed</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xl font-bold text-[var(--color-success)]">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-fg-3 mt-1">Collected</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xl font-bold text-[var(--color-danger)]">{formatCurrency(totalBilled - totalPaid)}</p>
              <p className="text-xs text-fg-3 mt-1">Outstanding</p>
            </div>
          </div>

          <SectionCard title="Invoices">
            {invoices.length === 0 ? (
              <EmptyState icon={DollarSign} title="No invoices" description="No invoices have been created for this client" />
            ) : (
              <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
                <table>
                  <thead><tr><th>Invoice</th><th>Month</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv._id}>
                        <td className="font-mono text-xs font-semibold">{inv.invoiceNumber || inv.invoiceId}</td>
                        <td className="text-sm text-fg-2">
                          {['', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][inv.month]} {inv.year}
                        </td>
                        <td className="font-semibold text-fg">{formatCurrency(inv.totalAmount)}</td>
                        <td className="font-semibold text-[var(--color-success)]">{formatCurrency(inv.paidAmount)}</td>
                        <td className="text-xs text-fg-2">{formatDate(inv.dueDate, { year: undefined })}</td>
                        <td><StatusBadge status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Client" size="md"
        footer={
          <><button className="btn btn-secondary" onClick={() => setEditOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button></>
        }>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Company Name *</label>
            <input className="input" value={editForm.companyName || ''} onChange={e => setEditForm(f => ({ ...f, companyName: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Contact Name</label>
            <input className="input" value={editForm.contactName || ''} onChange={e => setEditForm(f => ({ ...f, contactName: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Email</label>
            <input type="email" className="input" value={editForm.contactEmail || ''} onChange={e => setEditForm(f => ({ ...f, contactEmail: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Phone</label>
            <input className="input" value={editForm.contactPhone || ''} onChange={e => setEditForm(f => ({ ...f, contactPhone: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Website</label>
            <input className="input" value={editForm.website || ''} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Industry</label>
            <input className="input" value={editForm.industry || ''} onChange={e => setEditForm(f => ({ ...f, industry: e.target.value }))} /></div>
          </div>
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Monthly Value (₹)</label>
          <input type="number" className="input" value={editForm['contract.monthlyValue'] || ''} onChange={e => setEditForm(f => ({ ...f, 'contract.monthlyValue': e.target.value }))} /></div>
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Internal Notes</label>
          <textarea className="input" rows={3} value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
      </Modal>
    </div>
  )
}
