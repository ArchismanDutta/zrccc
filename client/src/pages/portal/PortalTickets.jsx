import { useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight, Send, LifeBuoy } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/api'

const PRIORITIES = ['low', 'medium', 'high']
const STATUS_COLOUR   = { open: 'badge-danger', in_progress: 'badge-warning', resolved: 'badge-success' }
const PRIORITY_COLOUR = { low: 'badge-info', medium: 'badge-warning', high: 'badge-danger' }
const EMPTY_FORM = { title: '', description: '', priority: 'medium' }

export default function PortalTickets() {
  const { toast } = useToast()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [reply, setReply] = useState('')
  const [saving, setSaving] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)

  const fetchTickets = async () => {
    try {
      const r = await api.getTickets('?limit=200')
      setTickets(r.data || [])
    } catch { toast.error('Failed to load tickets') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchTickets() }, [])

  const openDetail = async (ticket) => {
    try {
      const r = await api.getTicket(ticket._id)
      setSelected(r.data)
      setReply('')
    } catch { toast.error('Failed to load ticket') }
  }

  const submitCreate = async () => {
    if (!form.title || !form.description) { toast.error('Title and description required'); return }
    setSaving(true)
    try {
      await api.createTicket(form)
      toast.success('Ticket raised! Our team will respond shortly.')
      setCreateOpen(false)
      setForm({ ...EMPTY_FORM })
      fetchTickets()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const submitReply = async () => {
    if (!reply.trim() || !selected) return
    setSendingReply(true)
    try {
      const r = await api.addTicketReply(selected._id, { message: reply.trim() })
      setSelected(r.data)
      setReply('')
      fetchTickets()
    } catch (err) { toast.error(err.message) }
    finally { setSendingReply(false) }
  }

  // Thread detail view
  if (selected) {
    return (
      <div className="space-y-4 animate-slide-up">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm gap-1 text-fg-3 hover:text-fg" onClick={() => { setSelected(null); setCreateOpen(false) }}>
            <ChevronLeft size={15} /> Back to Tickets
          </button>
        </div>

        <div className="card p-4 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-mono text-fg-3">{selected.ticketId}</p>
              <h2 className="text-base font-bold text-fg mt-0.5">{selected.title}</h2>
            </div>
            <span className={`badge text-[10px] ${STATUS_COLOUR[selected.status]} flex-shrink-0`}>
              {selected.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-fg-3">Raised {formatDate(selected.createdAt)} · Priority: <span className="capitalize">{selected.priority}</span></p>
        </div>

        {/* Original description */}
        <div className="card p-4">
          <p className="text-[10px] text-fg-3 uppercase tracking-wide mb-2">Your Message</p>
          <p className="text-sm text-fg whitespace-pre-wrap">{selected.description}</p>
        </div>

        {/* Replies */}
        {(selected.replies || []).length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] text-fg-3 uppercase tracking-wide px-1">Conversation</p>
            {selected.replies.map((r, i) => {
              const isTeam = r.userId?.role != null && r.userId.role !== 'client'
              return (
                <div key={r._id || i} className={`card p-4 ${isTeam ? 'border-accent/30' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar name={r.userId?.name || '?'} size="xs" />
                    <span className="text-xs font-semibold text-fg">{isTeam ? 'ZRC Media Support' : 'You'}</span>
                    <span className="text-[10px] text-fg-3 ml-auto">{formatDate(r.createdAt)}</span>
                  </div>
                  <p className="text-sm text-fg-2 whitespace-pre-wrap">{r.message}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Reply */}
        {selected.status !== 'resolved' ? (
          <div className="card p-3 space-y-2">
            <p className="text-[10px] text-fg-3 uppercase tracking-wide">Add Reply</p>
            <textarea
              className="input w-full resize-none text-sm"
              rows={3}
              placeholder="Write your message…"
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitReply() }}
            />
            <div className="flex justify-end">
              <button className="btn btn-primary btn-sm gap-1" onClick={submitReply} disabled={sendingReply || !reply.trim()}>
                <Send size={13} /> {sendingReply ? 'Sending…' : 'Send Reply'}
              </button>
            </div>
          </div>
        ) : (
          <div className="card p-4 text-center">
            <p className="text-sm text-fg-3">This ticket has been resolved. <button className="text-accent hover:underline" onClick={() => { setForm({ ...EMPTY_FORM }); setCreateOpen(true) }}>Open a new ticket</button> if you have another issue.</p>
          </div>
        )}

        {/* Create modal (accessible from resolved ticket CTA) */}
        <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Raise a Support Ticket" size="sm" footer={
          <><button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={submitCreate} disabled={saving}>{saving ? 'Raising…' : 'Raise Ticket'}</button></>
        }>
          <div className="space-y-3">
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Invoice not received" /></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Description *</label>
            <textarea className="input resize-none" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your issue in detail…" /></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Priority</label>
            <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select></div>
          </div>
        </Modal>
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-fg">Support</h1>
          <p className="text-sm text-fg-3 mt-0.5">Raise issues and track your support tickets</p>
        </div>
        <button className="btn btn-primary btn-sm gap-1" onClick={() => { setForm({ ...EMPTY_FORM }); setCreateOpen(true) }}>
          <Plus size={15} /> Raise a Ticket
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <LifeBuoy size={32} className="mx-auto text-fg-3" />
          <p className="text-sm text-fg-3">No support tickets yet.</p>
          <button className="btn btn-primary btn-sm gap-1 mx-auto" onClick={() => { setForm({ ...EMPTY_FORM }); setCreateOpen(true) }}>
            <Plus size={14} /> Raise your first ticket
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <div key={t._id} className="card p-4 cursor-pointer hover:border-accent/40 transition-colors flex items-center gap-3"
              onClick={() => openDetail(t)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[10px] text-fg-3">{t.ticketId}</span>
                  <span className={`badge text-[10px] ${STATUS_COLOUR[t.status]}`}>{t.status.replace(/_/g,' ')}</span>
                  <span className={`badge text-[10px] ${PRIORITY_COLOUR[t.priority]} capitalize`}>{t.priority}</span>
                </div>
                <p className="text-sm font-medium text-fg truncate">{t.title}</p>
                <p className="text-xs text-fg-3 mt-0.5">Raised {formatDate(t.createdAt)} · {t.replies?.length || 0} repl{(t.replies?.length || 0) === 1 ? 'y' : 'ies'}</p>
              </div>
              <ChevronRight size={16} className="text-fg-3 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Create Ticket Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Raise a Support Ticket" size="sm" footer={
        <><button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
        <button className="btn btn-primary" onClick={submitCreate} disabled={saving}>{saving ? 'Raising…' : 'Raise Ticket'}</button></>
      }>
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Title *</label>
          <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Invoice not received" /></div>
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Description *</label>
          <textarea className="input resize-none" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your issue in detail…" /></div>
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Priority</label>
          <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select></div>
        </div>
      </Modal>
    </div>
  )
}
