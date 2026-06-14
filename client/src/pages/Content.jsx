import { useState, useEffect, useRef } from 'react'
import { Plus, ChevronLeft, ChevronRight, X, ThumbsUp, ThumbsDown } from 'lucide-react'
import { PageHeader } from '@/components/ui/Cards'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/api'

const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DAYS_SHORT = ['S','M','T','W','T','F','S']

const STATUS_COLOUR = {
  idea: 'var(--color-fg-3)', draft: 'var(--color-fg-2)', in_review: 'var(--color-warning)',
  revision_needed: 'var(--color-danger)', approved: 'var(--color-success)',
  awaiting_client: 'var(--color-info)', scheduled: 'var(--color-accent)', published: 'var(--color-success)',
}

const ALL_STATUSES = [
  { id: 'idea',            label: 'Idea' },
  { id: 'draft',           label: 'Draft' },
  { id: 'in_review',       label: 'In Review' },
  { id: 'revision_needed', label: 'Revision Needed' },
  { id: 'approved',        label: 'Approved' },
  { id: 'awaiting_client', label: 'Awaiting Client' },
  { id: 'scheduled',       label: 'Scheduled' },
  { id: 'published',       label: 'Published' },
]

const TYPE_OPTIONS    = ['reel','static_post','carousel','story','video','meta_ad_creative']
const PLATFORM_OPTIONS = ['instagram','facebook','youtube','website']
const TYPE_LABEL = {
  reel: 'Reel', static_post: 'Static Post', carousel: 'Carousel',
  story: 'Story', video: 'Video', meta_ad_creative: 'Ad Creative',
}

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayOfMonth(y, m) { return new Date(y, m, 1).getDay() }

const EMPTY_FORM = {
  title: '', contentType: '', projectId: '', clientId: '', platform: [],
  assignedTo: [], caption: '', hashtags: '', weekNumber: 1,
  scheduledDate: '', priority: 'medium',
}

// ─── Day Overflow Popover ────────────────────────────────────
function DayPopover({ items, onSelect, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} className="absolute left-0 top-full mt-1 z-40 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg py-1.5 min-w-[180px] max-w-[220px]">
      <div className="flex items-center justify-between px-3 pb-1.5 border-b border-[var(--color-border)] mb-1">
        <span className="text-[10px] font-semibold text-fg-3 uppercase tracking-wide">{items.length} items</span>
        <button onClick={onClose} className="text-fg-3 hover:text-fg"><X size={12} /></button>
      </div>
      {items.map(item => {
        const colour = STATUS_COLOUR[item.status] ?? 'var(--color-fg-3)'
        return (
          <button key={item._id} onClick={() => { onSelect(item); onClose() }}
            className="w-full text-left px-3 py-1.5 hover:bg-[var(--color-surface-3)] transition-colors flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colour }} />
            <span className="text-xs text-fg truncate">{item.title}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Content Edit/View Modal ─────────────────────────────────
function ContentModal({ item, isCreate, form, setForm, users, projects, clients, saving, onSave, onStatusChange, onApprove, onReject, onClose }) {
  const [rejectFeedback, setRejectFeedback] = useState('')
  const [showReject, setShowReject] = useState(false)

  const togglePlatform = p => setForm(f => ({ ...f, platform: f.platform.includes(p) ? f.platform.filter(x => x !== p) : [...f.platform, p] }))
  const toggleAssignee = id => setForm(f => ({ ...f, assignedTo: f.assignedTo.includes(id) ? f.assignedTo.filter(x => x !== id) : [...f.assignedTo, id] }))

  const footer = (
    <>
      <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
      {!isCreate && item?.status === 'in_review' && (
        <>
          <button className="btn btn-ghost gap-1 text-[var(--color-danger)]" onClick={() => setShowReject(s => !s)}>
            <ThumbsDown size={14} /> Reject
          </button>
          <button className="btn btn-ghost gap-1 text-[var(--color-success)]" onClick={onApprove}>
            <ThumbsUp size={14} /> Approve
          </button>
        </>
      )}
      <button className="btn btn-primary" onClick={onSave} disabled={saving}>
        {saving ? 'Saving…' : isCreate ? 'Add Content' : 'Save Changes'}
      </button>
    </>
  )

  return (
    <Modal isOpen onClose={onClose} title={isCreate ? 'Add Content' : (item?.title ?? 'Edit Content')} size="md" footer={footer}>
      <div className="space-y-3">
        {/* Reject feedback panel */}
        {showReject && (
          <div className="p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-danger)] space-y-2">
            <label className="block text-xs font-medium text-fg-2">Rejection feedback *</label>
            <textarea className="input resize-none" rows={2} value={rejectFeedback} onChange={e => setRejectFeedback(e.target.value)} placeholder="What needs to change?" />
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm text-xs" onClick={() => setShowReject(false)}>Cancel</button>
              <button className="btn btn-sm text-xs" style={{ background: 'var(--color-danger)', color: '#fff' }}
                onClick={() => { onReject(rejectFeedback); setShowReject(false) }}>
                Send Feedback
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-fg-2 mb-1">Title *</label>
          <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. StyleHub Monsoon Reel" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-fg-2 mb-1">Content Type *</label>
            <select className="input" value={form.contentType} onChange={e => setForm(f => ({ ...f, contentType: e.target.value }))}>
              <option value="">Select type</option>
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-2 mb-1">{isCreate ? 'Priority' : 'Status'}</label>
            {isCreate ? (
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option><option value="medium">Medium</option>
                <option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            ) : (
              <select className="input" value={form.status ?? item?.status}
                onChange={e => onStatusChange(e.target.value)}>
                {ALL_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-fg-2 mb-1">Caption / Script</label>
          <textarea className="input resize-none" rows={3} value={form.caption}
            onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
            placeholder="Write the post caption, script, or creative brief…" />
        </div>

        <div>
          <label className="block text-xs font-medium text-fg-2 mb-1">Hashtags</label>
          <input className="input" value={form.hashtags}
            onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))}
            placeholder="#brand #monsoon #reel (space-separated)" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-fg-2 mb-1">Scheduled Date</label>
            <input type="date" className="input" value={form.scheduledDate}
              onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-2 mb-1">Week # (fallback)</label>
            <select className="input" value={form.weekNumber} onChange={e => setForm(f => ({ ...f, weekNumber: Number(e.target.value) }))}>
              {[1,2,3,4,5].map(w => <option key={w} value={w}>Week {w}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-fg-2 mb-1">Client *</label>
            <select className="input" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
              <option value="">Select client</option>
              {clients.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-2 mb-1">Project *</label>
            <select className="input" value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-fg-2 mb-2">Platforms</label>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORM_OPTIONS.map(p => (
              <label key={p} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer border transition-colors ${form.platform.includes(p) ? 'bg-accent/10 border-accent text-accent' : 'border-[var(--color-border)] text-fg-3'}`}>
                <input type="checkbox" checked={form.platform.includes(p)} onChange={() => togglePlatform(p)} className="sr-only" />
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-fg-2 mb-2">Assign To</label>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {users.filter(u => u.role !== 'client').map(u => (
              <label key={u._id} className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs cursor-pointer border transition-colors ${form.assignedTo.includes(u._id) ? 'bg-accent/10 border-accent text-accent' : 'border-[var(--color-border)] text-fg-3'}`}>
                <input type="checkbox" checked={form.assignedTo.includes(u._id)} onChange={() => toggleAssignee(u._id)} className="sr-only" />
                {u.name}
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function ContentPage() {
  const { toast } = useToast()
  const now = new Date()
  const [year, setYear]       = useState(now.getFullYear())
  const [month, setMonth]     = useState(now.getMonth())
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [clients, setClients]   = useState([])
  const [users, setUsers]       = useState([])

  // Modal state
  const [modalOpen, setModalOpen]   = useState(false)
  const [editItem, setEditItem]     = useState(null)   // null = create mode
  const [form, setForm]             = useState({ ...EMPTY_FORM })
  const [saving, setSaving]         = useState(false)

  // Day overflow popover
  const [overflowDay, setOverflowDay] = useState(null)

  // Filters
  const [clientFilter, setClientFilter]   = useState('')
  const [projectFilter, setProjectFilter] = useState('')

  const plannedMonth = `${year}-${String(month + 1).padStart(2, '0')}`

  const fetchContent = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ plannedMonth, limit: 200 })
      if (clientFilter)  params.set('clientId', clientFilter)
      if (projectFilter) params.set('projectId', projectFilter)
      const res = await api.getContent(`?${params}`)
      setItems(res.data)
    } catch { toast.error('Failed to load content') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchContent() }, [year, month, clientFilter, projectFilter])

  const loadFormDeps = async () => {
    if (projects.length && clients.length && users.length) return
    const [pRes, cRes, uRes] = await Promise.allSettled([
      api.getProjects('?limit=100'),
      api.getClients('?limit=100'),
      api.getUsers('?limit=100'),
    ])
    if (pRes.status === 'fulfilled') setProjects(pRes.value.data || [])
    if (cRes.status === 'fulfilled') setClients(cRes.value.data || [])
    if (uRes.status === 'fulfilled') setUsers(uRes.value.data || [])
  }

  const openCreate = async (date = null) => {
    setEditItem(null)
    setForm({ ...EMPTY_FORM, scheduledDate: date || '' })
    setModalOpen(true)
    await loadFormDeps()
  }

  const openEdit = async (item) => {
    setEditItem(item)
    setForm({
      title:         item.title || '',
      contentType:   item.contentType || '',
      projectId:     item.projectId?._id || item.projectId || '',
      clientId:      item.clientId?._id || item.clientId || '',
      platform:      item.platform || [],
      assignedTo:    (item.assignedTo || []).map(u => u._id || u),
      caption:       item.caption || '',
      hashtags:      Array.isArray(item.hashtags) ? item.hashtags.join(' ') : (item.hashtags || ''),
      weekNumber:    item.weekNumber || 1,
      scheduledDate: item.scheduledAt ? item.scheduledAt.split('T')[0] : '',
      priority:      item.priority || 'medium',
    })
    setModalOpen(true)
    await loadFormDeps()
  }

  const handleSave = async () => {
    if (!form.title || !form.contentType) { toast.error('Title and type are required'); return }
    if (!form.clientId || !form.projectId) { toast.error('Client and project are required'); return }
    setSaving(true)
    try {
      const hashtags = form.hashtags.trim() ? form.hashtags.trim().split(/\s+/) : []
      const scheduledAt = form.scheduledDate ? new Date(form.scheduledDate).toISOString() : undefined

      if (editItem) {
        await api.updateContent(editItem._id, {
          title: form.title, contentType: form.contentType,
          projectId: form.projectId, clientId: form.clientId,
          platform: form.platform, assignedTo: form.assignedTo,
          caption: form.caption, hashtags,
          weekNumber: form.weekNumber, priority: form.priority,
          ...(scheduledAt !== undefined && { scheduledAt }),
        })
        toast.success('Content updated')
      } else {
        await api.createContent({
          title: form.title, contentType: form.contentType,
          projectId: form.projectId, clientId: form.clientId,
          platform: form.platform, assignedTo: form.assignedTo,
          caption: form.caption, hashtags,
          weekNumber: form.weekNumber, plannedMonth, priority: form.priority,
          ...(scheduledAt && { scheduledAt }),
        })
        toast.success('Content added!')
      }
      setModalOpen(false); fetchContent()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleStatusChange = async (newStatus) => {
    if (!editItem) return
    try {
      await api.changeContentStatus(editItem._id, { status: newStatus })
      toast.success(`Status → ${newStatus.replace(/_/g, ' ')}`)
      setEditItem(prev => ({ ...prev, status: newStatus }))
      fetchContent()
    } catch (err) { toast.error(err.message) }
  }

  const handleApprove = async () => {
    if (!editItem) return
    try {
      await api.approveContent(editItem._id, {})
      toast.success('Content approved')
      setModalOpen(false); fetchContent()
    } catch (err) { toast.error(err.message) }
  }

  const handleReject = async (feedback) => {
    if (!editItem || !feedback) return
    try {
      await api.rejectContent(editItem._id, { feedback })
      toast.success('Sent for revision')
      setModalOpen(false); fetchContent()
    } catch (err) { toast.error(err.message) }
  }

  const daysInMonth  = getDaysInMonth(year, month)
  const firstDay     = getFirstDayOfMonth(year, month)

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  // Place items on days — prefer scheduledAt, fall back to weekNumber
  const itemsByDay = {}
  items.forEach(item => {
    let day = null
    if (item.scheduledAt) {
      const d = new Date(item.scheduledAt)
      if (d.getMonth() === month && d.getFullYear() === year) day = d.getDate()
    }
    if (!day && item.weekNumber) {
      day = Math.min(((item.weekNumber - 1) * 7) + (item.dayOfWeek || 1) + 1, daysInMonth)
    }
    if (!day) day = Math.min((item.weekNumber || 1) * 3, daysInMonth)
    if (!itemsByDay[day]) itemsByDay[day] = []
    itemsByDay[day].push(item)
  })

  const stats = {
    total:     items.length,
    published: items.filter(i => i.status === 'published').length,
    review:    items.filter(i => i.status === 'in_review' || i.status === 'revision_needed').length,
    draft:     items.filter(i => i.status === 'draft' || i.status === 'idea').length,
  }

  const legendItems = [
    { label: 'Published',  colour: STATUS_COLOUR.published },
    { label: 'Approved',   colour: STATUS_COLOUR.approved },
    { label: 'Scheduled',  colour: STATUS_COLOUR.scheduled },
    { label: 'In Review',  colour: STATUS_COLOUR.in_review },
    { label: 'Revision',   colour: STATUS_COLOUR.revision_needed },
    { label: 'Draft',      colour: STATUS_COLOUR.draft },
  ]

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const MAX_SHOW = isMobile ? 1 : 2

  return (
    <div className="space-y-4 sm:space-y-5 animate-slide-up">
      <PageHeader title="Content Calendar" subtitle="Plan, approve, and track all creative deliverables">
        <button className="btn btn-primary gap-1.5 text-sm" onClick={openCreate}><Plus size={16} /> Add Content</button>
      </PageHeader>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-1">
        {legendItems.map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0" style={{ background: l.colour }} />
            <span className="text-[10px] sm:text-xs text-fg-3">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="card overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <button onClick={prevMonth} className="btn btn-ghost btn-icon" style={{ width: 32, height: 32, minHeight: 32 }}><ChevronLeft size={16} /></button>
          <h2 className="font-bold text-sm sm:text-base text-fg">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="btn btn-ghost btn-icon" style={{ width: 32, height: 32, minHeight: 32 }}><ChevronRight size={16} /></button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
          {(isMobile ? DAYS_SHORT : DAYS).map((d, i) => (
            <div key={i} className="py-1.5 sm:py-2 text-center text-[10px] sm:text-[11px] font-semibold text-fg-3 uppercase tracking-wide">{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 sm:py-20">
            <div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {/* Leading empty cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e-${i}`} className="min-h-[52px] sm:min-h-[88px] lg:min-h-[108px] border-r border-b border-[var(--color-border)] bg-[var(--color-surface-2)]" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayItems = itemsByDay[day] ?? []
              const isToday  = day === now.getDate() && month === now.getMonth() && year === now.getFullYear()
              const col      = (firstDay + i) % 7
              const isWeekend = col === 0 || col === 6
              const visible  = dayItems.slice(0, MAX_SHOW)
              const overflow = dayItems.length - MAX_SHOW

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

              return (
                <div key={day}
                  onClick={() => openCreate(dateStr)}
                  className={`group relative min-h-[52px] sm:min-h-[88px] lg:min-h-[108px] border-r border-b border-[var(--color-border)] p-0.5 sm:p-1.5 cursor-pointer transition-colors hover:bg-accent/5 ${isWeekend ? 'bg-[var(--color-surface-2)] hover:bg-accent/5' : ''}`}>
                  {/* Day number + add hint */}
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] text-accent opacity-0 group-hover:opacity-100 transition-opacity font-bold pl-0.5 sm:pl-1 leading-none hidden sm:block">+</span>
                    <span className={`text-[9px] sm:text-[11px] font-semibold w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full ml-auto ${isToday ? 'bg-accent text-white' : 'text-fg-3'}`}>{day}</span>
                  </div>

                  {/* Events */}
                  <div className="space-y-0.5">
                    {visible.map(item => {
                      const colour = STATUS_COLOUR[item.status] ?? 'var(--color-fg-3)'
                      return (
                        <button key={item._id}
                          onClick={e => { e.stopPropagation(); openEdit(item) }}
                          className="w-full flex items-center gap-0.5 px-1 sm:px-1.5 py-px sm:py-0.5 rounded-md text-[8px] sm:text-[10px] font-medium truncate text-left hover:opacity-80 transition-opacity"
                          style={{ background: `${colour}18`, color: colour, border: `1px solid ${colour}30` }}>
                          <span className="truncate">{item.title}</span>
                        </button>
                      )
                    })}

                    {/* Overflow badge */}
                    {overflow > 0 && (
                      <div className="relative">
                        <button
                          onClick={e => { e.stopPropagation(); setOverflowDay(overflowDay === day ? null : day) }}
                          className="text-[8px] sm:text-[9px] text-accent font-medium pl-1 hover:underline">
                          +{overflow} more
                        </button>
                        {overflowDay === day && (
                          <DayPopover
                            items={dayItems}
                            onSelect={openEdit}
                            onClose={() => setOverflowDay(null)} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Total Planned', value: stats.total,     colour: 'var(--color-fg)' },
          { label: 'Published',     value: stats.published, colour: 'var(--color-success)' },
          { label: 'Needs Review',  value: stats.review,    colour: 'var(--color-warning)' },
          { label: 'Draft / Idea',  value: stats.draft,     colour: 'var(--color-fg-3)' },
        ].map(s => (
          <div key={s.label} className="card p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold" style={{ color: s.colour }}>{s.value}</p>
            <p className="text-[10px] sm:text-xs text-fg-3 mt-0.5 sm:mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <ContentModal
          item={editItem}
          isCreate={!editItem}
          form={form}
          setForm={setForm}
          users={users}
          projects={projects}
          clients={clients}
          saving={saving}
          onSave={handleSave}
          onStatusChange={handleStatusChange}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}
