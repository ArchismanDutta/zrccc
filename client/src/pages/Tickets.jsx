import { useState, useEffect } from 'react'
import { Plus, ChevronRight, Send } from 'lucide-react'
import { PageHeader, SectionCard } from '@/components/ui/Cards'
import { Avatar } from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/lib/auth'
import api from '@/lib/api'

const STATUSES = ['open', 'in_progress', 'resolved']
const PRIORITIES = ['low', 'medium', 'high']
const PRIORITY_COLOUR = { low: 'badge-info', medium: 'badge-warning', high: 'badge-danger' }
const STATUS_COLOUR    = { open: 'badge-danger', in_progress: 'badge-warning', resolved: 'badge-success' }

const EMPTY_FORM = { clientId: '', title: '', description: '', priority: 'medium' }

export default function TicketsPage() {
  const { toast } = useToast()
  const { user }  = useAuth()
  const isAdmin   = ['super_admin', 'admin'].includes(user?.role)
  // project_manager and account_manager also have ticket create/assign/update permissions
  const canManage = ['super_admin', 'admin', 'project_manager', 'account_manager'].includes(user?.role)

  const [tickets, setTickets]         = useState([])
  const [clients, setClients]         = useState([])
  const [users,   setUsers]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [filterStatus,   setFilterStatus]   = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [selected, setSelected]       = useState(null)
  const [detailOpen, setDetailOpen]   = useState(false)
  const [createOpen, setCreateOpen]   = useState(false)
  const [form,   setForm]             = useState({ ...EMPTY_FORM })
  const [reply,  setReply]            = useState('')
  const [saving, setSaving]           = useState(false)
  const [sendingReply, setSendingReply] = useState(false)
  const [changingTicket, setChangingTicket] = useState(false)

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const q = [
        filterStatus   ? `status=${filterStatus}`     : '',
        filterPriority ? `priority=${filterPriority}` : '',
        'limit=200',
      ].filter(Boolean).join('&')
      const r = await api.getTickets(q ? `?${q}` : '')
      setTickets(r.data || [])
    } catch { toast.error('Failed to load tickets') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchTickets() }, [filterStatus, filterPriority])
  useEffect(() => {
    const handler = () => { setForm({ ...EMPTY_FORM }); setCreateOpen(true) }
    window.addEventListener('shortcut:new', handler)
    return () => window.removeEventListener('shortcut:new', handler)
  }, [])

  useEffect(() => {
    if (canManage) {
      api.getClients('?limit=200').then(r => setClients(r.data || [])).catch(() => {})
      api.getUsers('?limit=200').then(r => setUsers(r.data || [])).catch(() => {})
    }
  }, [canManage])

  const openDetail = async (ticket) => {
    try {
      const r = await api.getTicket(ticket._id)
      setSelected(r.data)
      setDetailOpen(true)
      setReply('')
    } catch { toast.error('Failed to load ticket') }
  }

  const submitCreate = async () => {
    if (!form.title || !form.description) { toast.error('Title and description required'); return }
    if (canManage && !form.clientId) { toast.error('Select a client'); return }
    setSaving(true)
    try {
      await api.createTicket(form)
      toast.success('Ticket created')
      setCreateOpen(false)
      setForm({ ...EMPTY_FORM })
      fetchTickets()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const submitReply = async () => {
    if (!reply.trim()) return
    setSendingReply(true)
    try {
      const r = await api.addTicketReply(selected._id, { message: reply.trim() })
      setSelected(r.data)
      setReply('')
      fetchTickets()
    } catch (err) { toast.error(err.message) }
    finally { setSendingReply(false) }
  }

  const changeStatus = async (ticketId, status) => {
    if (changingTicket) return
    setChangingTicket(true)
    try {
      await api.updateTicketStatus(ticketId, { status })
      toast.success('Status updated')
      const r = await api.getTicket(ticketId)
      setSelected(r.data)
      fetchTickets()
    } catch (err) { toast.error(err.message) }
    finally { setChangingTicket(false) }
  }

  const changeAssign = async (ticketId, assignedTo) => {
    if (!assignedTo || changingTicket) return
    setChangingTicket(true)
    try {
      await api.assignTicket(ticketId, { assignedTo })
      toast.success('Assigned')
      const r = await api.getTicket(ticketId)
      setSelected(r.data)
      fetchTickets()
    } catch (err) { toast.error(err.message) }
    finally { setChangingTicket(false) }
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <PageHeader title="Support Tickets" subtitle="Client support requests">
        {canManage && (
          <button className="btn btn-primary btn-sm gap-1" onClick={() => { setForm({ ...EMPTY_FORM }); setCreateOpen(true) }}>
            <Plus size={15} /> New Ticket
          </button>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select className="input" style={{ width: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
        </select>
        <select className="input" style={{ width: 130 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      <SectionCard title={`Tickets (${tickets.length})`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-fg-3 text-center py-10">No tickets found.</p>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead><tr>
                <th>ID</th><th>Client</th><th>Title</th><th>Priority</th>
                <th>Status</th><th>Assigned</th><th>Raised</th><th></th>
              </tr></thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t._id} className="cursor-pointer" onClick={() => openDetail(t)}>
                    <td><span className="font-mono text-xs text-fg-2">{t.ticketId}</span></td>
                    <td><span className="text-xs text-fg-2">{t.clientId?.companyName || t.clientId?.displayName || '—'}</span></td>
                    <td><span className="text-sm font-medium text-fg">{t.title}</span></td>
                    <td><span className={`badge text-[10px] ${PRIORITY_COLOUR[t.priority]}`}>{t.priority}</span></td>
                    <td><span className={`badge text-[10px] ${STATUS_COLOUR[t.status]}`}>{t.status.replace(/_/g,' ')}</span></td>
                    <td>
                      {t.assignedTo
                        ? <div className="flex items-center gap-1"><Avatar name={t.assignedTo.name} size="xs" /><span className="text-xs text-fg-2">{t.assignedTo.name}</span></div>
                        : <span className="text-xs text-fg-3">—</span>}
                    </td>
                    <td className="text-xs text-fg-2 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                    <td><ChevronRight size={14} className="text-fg-3" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Detail Modal */}
      {selected && (
        <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={`${selected.ticketId} — ${selected.title}`} size="lg">
          <div className="space-y-4">
            {/* Controls (admin only) */}
            {canManage && (
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="block text-[10px] text-fg-3 mb-1 uppercase tracking-wide">Status</label>
                  <select className="input text-xs" style={{ width: 140 }} value={selected.status}
                    onChange={e => changeStatus(selected._id, e.target.value)} disabled={changingTicket}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-fg-3 mb-1 uppercase tracking-wide">Assigned To</label>
                  <select className="input text-xs" style={{ width: 160 }} value={selected.assignedTo?._id || ''}
                    onChange={e => changeAssign(selected._id, e.target.value)} disabled={changingTicket}>
                    <option value="" disabled>Select assignee</option>
                    {users.filter(u => u.role !== 'client').map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[10px] text-fg-3">Priority</p>
                  <span className={`badge text-[10px] ${PRIORITY_COLOUR[selected.priority]}`}>{selected.priority}</span>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="rounded-xl bg-[var(--color-surface-2)] p-3">
              <p className="text-[10px] text-fg-3 uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-fg whitespace-pre-wrap">{selected.description}</p>
              <p className="text-[10px] text-fg-3 mt-2">Raised by {selected.raisedBy?.name} · {formatDate(selected.createdAt)}</p>
            </div>

            {/* Replies */}
            {(selected.replies || []).length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-fg-3 uppercase tracking-wide">Replies</p>
                {selected.replies.map((r, i) => {
                  const isTeam = r.userId?.role != null && r.userId.role !== 'client'
                  return (
                    <div key={r._id || i} className={`rounded-xl p-3 ${isTeam ? 'bg-accent/8 border border-accent/20' : 'bg-[var(--color-surface-2)]'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar name={r.userId?.name || '?'} size="xs" />
                        <span className="text-xs font-semibold text-fg">{r.userId?.name || 'Unknown'}</span>
                        {isTeam && <span className="badge badge-info text-[10px]">Team</span>}
                        <span className="text-[10px] text-fg-3 ml-auto">{formatDate(r.createdAt)}</span>
                      </div>
                      <p className="text-sm text-fg-2 whitespace-pre-wrap">{r.message}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Reply form */}
            {selected.status !== 'resolved' && (
              <div className="flex gap-2">
                <textarea
                  className="input flex-1 resize-none text-sm"
                  rows={2}
                  placeholder="Write a reply…"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitReply() }}
                />
                <button className="btn btn-primary btn-sm self-end gap-1" onClick={submitReply} disabled={sendingReply || !reply.trim()}>
                  <Send size={13} /> {sendingReply ? '…' : 'Send'}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Create Ticket Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Support Ticket" size="sm" footer={
        <><button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
        <button className="btn btn-primary" onClick={submitCreate} disabled={saving}>{saving ? 'Creating…' : 'Create Ticket'}</button></>
      }>
        <div className="space-y-3">
          {canManage && (
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Client *</label>
            <select className="input" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
              <option value="">Select client</option>
              {clients.map(c => <option key={c._id} value={c._id}>{c.companyName || c.displayName}</option>)}
            </select></div>
          )}
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Title *</label>
          <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Short summary of the issue" /></div>
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Description *</label>
          <textarea className="input resize-none" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue in detail…" /></div>
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Priority</label>
          <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select></div>
        </div>
      </Modal>
    </div>
  )
}
