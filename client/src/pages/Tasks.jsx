import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, CheckCircle2, Clock, AlertTriangle, RotateCcw, ChevronDown } from 'lucide-react'
import { PageHeader } from '@/components/ui/Cards'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/lib/auth'
import api from '@/lib/api'

const CATEGORY_META = {
  shooting:            { label: '📹 Shoot',    colour: 'var(--color-info)' },
  reel_editing:        { label: '✂️ Reel',     colour: 'var(--color-accent)' },
  video_editing:       { label: '🎬 Video',    colour: 'var(--color-accent)' },
  graphic_design:      { label: '🎨 Design',   colour: 'var(--color-warning)' },
  carousel_design:     { label: '🃏 Carousel', colour: 'var(--color-warning)' },
  caption_writing:     { label: '✍️ Caption',  colour: 'var(--color-success)' },
  ad_copy:             { label: '📝 Ad Copy',  colour: 'var(--color-success)' },
  meta_ads_management: { label: '📢 Ads',      colour: 'var(--color-danger)' },
  meta_ad_creative:    { label: '🖼 Creative', colour: 'var(--color-danger)' },
  web_development:     { label: '💻 Web',      colour: 'var(--color-fg-2)' },
  web_maintenance:     { label: '🔧 Maint.',   colour: 'var(--color-fg-2)' },
  content_planning:    { label: '📋 Plan',     colour: 'var(--color-fg-2)' },
  scheduling:          { label: '📅 Schedule', colour: 'var(--color-fg-2)' },
  client_report:       { label: '📊 Report',   colour: 'var(--color-info)' },
  internal:            { label: '🏢 Internal', colour: 'var(--color-fg-3)' },
  review:              { label: '👀 Review',   colour: 'var(--color-warning)' },
}
const ALL_CATEGORIES = Object.keys(CATEGORY_META)

const COLUMNS = [
  { id: 'todo',            label: 'To Do',       icon: Clock,         colour: 'var(--color-fg-3)' },
  { id: 'in_progress',     label: 'In Progress', icon: RotateCcw,     colour: 'var(--color-accent)' },
  { id: 'review',          label: 'In Review',   icon: AlertTriangle, colour: 'var(--color-warning)' },
  { id: 'revision_needed', label: 'Revision',    icon: AlertTriangle, colour: 'var(--color-danger)' },
  { id: 'done',            label: 'Done',        icon: CheckCircle2,  colour: 'var(--color-success)' },
]

const ALL_STATUSES = [
  { id: 'todo',            label: 'To Do' },
  { id: 'in_progress',     label: 'In Progress' },
  { id: 'review',          label: 'In Review' },
  { id: 'revision_needed', label: 'Revision Needed' },
  { id: 'done',            label: 'Done' },
  { id: 'cancelled',       label: 'Cancelled' },
]

const EMPTY = { title: '', description: '', category: '', projectId: '', assignedTo: [], priority: 'medium', dueDate: '', estimatedHours: '', status: 'todo', isRecurring: false, recurringFrequency: 'weekly' }

// ─── Status Dropdown for kanban card ────────────────────────
function QuickStatusMenu({ task, onMove }) {
  const [open, setOpen] = useState(false)
  const next = { todo: 'in_progress', in_progress: 'review', review: 'done', revision_needed: 'in_progress' }[task.status]

  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
        {next ? 'Move' : '…'} <ChevronDown size={9} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg py-1 min-w-[148px]">
          {ALL_STATUSES.filter(s => s.id !== task.status).map(s => (
            <button key={s.id}
              onClick={e => { e.stopPropagation(); onMove(task._id, s.id); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--color-surface-3)] transition-colors text-fg-2">
              → {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Task Form (shared by create + edit) ─────────────────────
function TaskForm({ form, setForm, users, projects }) {
  const toggleAssignee = uid => setForm(f => ({ ...f, assignedTo: f.assignedTo.includes(uid) ? f.assignedTo.filter(x => x !== uid) : [...f.assignedTo, uid] }))

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-fg-2 mb-1">Title *</label>
        <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Design StyleHub June Batch" />
      </div>
      <div>
        <label className="block text-xs font-medium text-fg-2 mb-1">Description</label>
        <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details, requirements, notes…" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-fg-2 mb-1">Category *</label>
          <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            <option value="">Select category</option>
            {ALL_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-fg-2 mb-1">Project</label>
          <select className="input" value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
            <option value="">None</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-fg-2 mb-1">Priority</label>
          <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            <option value="low">Low</option><option value="medium">Medium</option>
            <option value="high">High</option><option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-fg-2 mb-1">Status</label>
          <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            {ALL_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-fg-2 mb-1">Due Date</label>
          <input type="date" className="input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-fg-2 mb-1">Est. Hours</label>
          <input type="number" className="input" value={form.estimatedHours} onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-fg-2 mb-2">Assign To</label>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {users.filter(u => u.role !== 'client').map(u => (
            <label key={u._id}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs cursor-pointer border transition-colors ${form.assignedTo.includes(u._id) ? 'bg-accent/10 border-accent text-accent' : 'border-[var(--color-border)] text-fg-3'}`}>
              <input type="checkbox" checked={form.assignedTo.includes(u._id)} onChange={() => toggleAssignee(u._id)} className="sr-only" />
              {u.name}
            </label>
          ))}
        </div>
      </div>

      {/* Recurring */}
      <div className="pt-1 border-t border-[var(--color-border)]">
        <label className="flex items-center gap-2.5 cursor-pointer w-fit">
          <div
            onClick={() => setForm(f => ({ ...f, isRecurring: !f.isRecurring }))}
            className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${form.isRecurring ? 'bg-accent' : 'bg-[var(--color-surface-3)]'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isRecurring ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-xs font-medium text-fg-2">Recurring task</span>
        </label>
        {form.isRecurring && (
          <div className="mt-2 flex items-center gap-2">
            <label className="text-xs text-fg-3 flex-shrink-0">Repeat every</label>
            <select className="input text-xs py-1" style={{ maxWidth: 140 }}
              value={form.recurringFrequency}
              onChange={e => setForm(f => ({ ...f, recurringFrequency: e.target.value }))}>
              <option value="daily">Day</option>
              <option value="weekly">Week</option>
              <option value="biweekly">2 Weeks</option>
              <option value="monthly">Month</option>
            </select>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function TasksPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user: me } = useAuth()
  const [tasks, setTasks]       = useState([])
  const [projects, setProjects] = useState([])
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [view, setView]         = useState('kanban')
  const [search, setSearch]     = useState('')
  const [projectFilter, setProjectFilter]   = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [myTasks, setMyTasks]               = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask, setEditTask]   = useState(null)
  const [form, setForm]           = useState({ ...EMPTY })
  const [saving, setSaving]       = useState(false)

  const fetchTasks = async () => {
    try { const res = await api.getTasks('?limit=200'); setTasks(res.data || []) }
    catch { toast.error('Failed to load tasks') }
    finally { setLoading(false) }
  }

  const loadFormDeps = async () => {
    const [pRes, uRes] = await Promise.allSettled([api.getProjects('?limit=100'), api.getUsers('?limit=100')])
    if (pRes.status === 'fulfilled') setProjects(pRes.value.data || [])
    if (uRes.status === 'fulfilled') setUsers(uRes.value.data || [])
  }

  useEffect(() => { fetchTasks() }, [])
  useEffect(() => {
    const handler = () => { setEditTask(null); setForm({ ...EMPTY }); setModalOpen(true); loadFormDeps() }
    window.addEventListener('shortcut:new', handler)
    return () => window.removeEventListener('shortcut:new', handler)
  }, [])

  const openCreate = async () => {
    setEditTask(null)
    setForm({ ...EMPTY })
    setModalOpen(true)
    if (!projects.length) await loadFormDeps()
  }

  const openEdit = async (task) => {
    setEditTask(task)
    setForm({
      title:              task.title || '',
      description:        task.description || '',
      category:           task.category || '',
      projectId:          task.projectId?._id || task.projectId || '',
      assignedTo:         (task.assignedTo || []).map(u => u._id || u),
      priority:           task.priority || 'medium',
      dueDate:            task.dueDate ? task.dueDate.split('T')[0] : '',
      estimatedHours:     task.estimatedHours || '',
      status:             task.status || 'todo',
      isRecurring:        task.isRecurring || false,
      recurringFrequency: task.recurringConfig?.frequency || 'weekly',
    })
    setModalOpen(true)
    if (!projects.length) await loadFormDeps()
  }

  const handleSave = async () => {
    if (!form.title || !form.category) { toast.error('Title and category are required'); return }
    setSaving(true)
    try {
      const recurringPayload = {
        isRecurring: form.isRecurring,
        recurringConfig: form.isRecurring ? { frequency: form.recurringFrequency } : undefined,
      }
      if (editTask) {
        await api.updateTask(editTask._id, {
          title: form.title, description: form.description, category: form.category,
          projectId: form.projectId || null, assignedTo: form.assignedTo,
          priority: form.priority, dueDate: form.dueDate || null,
          estimatedHours: Number(form.estimatedHours) || 0,
          ...recurringPayload,
        })
        if (form.status !== editTask.status) {
          await api.changeTaskStatus(editTask._id, { status: form.status })
        }
        toast.success('Task updated')
      } else {
        await api.createTask({
          title: form.title, description: form.description, category: form.category,
          projectId: form.projectId || null, assignedTo: form.assignedTo,
          priority: form.priority, dueDate: form.dueDate || null,
          estimatedHours: Number(form.estimatedHours) || 0,
          ...recurringPayload,
        })
        toast.success('Task created!')
      }
      setModalOpen(false); fetchTasks()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const moveTask = async (taskId, newStatus) => {
    try { await api.changeTaskStatus(taskId, { status: newStatus }); fetchTasks() }
    catch (err) { toast.error(err.message) }
  }

  // Unique assignees derived from loaded tasks (no extra fetch)
  const assigneeOptions = [...new Map(
    tasks.flatMap(t => t.assignedTo || []).map(u => [u._id || u, u.name || u])
  ).entries()].map(([id, name]) => ({ id, name }))

  const filtered = tasks.filter(t => {
    const matchSearch   = t.title.toLowerCase().includes(search.toLowerCase()) || (t.projectId?.name || '').toLowerCase().includes(search.toLowerCase())
    const matchProject  = projectFilter === 'all' || (t.projectId?._id || t.projectId) === projectFilter
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter
    const matchAssignee = assigneeFilter === 'all' || (t.assignedTo || []).some(u => (u._id || u) === assigneeFilter)
    const matchMyTasks  = !myTasks || (t.assignedTo || []).some(u => (u._id || u) === (me?.id || me?._id))
    return matchSearch && matchProject && matchPriority && matchAssignee && matchMyTasks
  })

  const byStatus = s => filtered.filter(t => t.status === s)

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4 sm:space-y-5 animate-slide-up">
      <PageHeader title="Tasks" subtitle={`${tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length} open · ${tasks.filter(t => t.status === 'done').length} done`}>
        <div className="flex gap-1 bg-[var(--color-surface-3)] p-1 rounded-lg">
          {['kanban', 'list'].map(v => (
            <button key={v} onClick={() => setView(v)} className={`btn btn-sm capitalize ${view === v ? 'bg-[var(--color-surface)] text-fg shadow-sm' : 'btn-ghost text-fg-3'}`}>{v}</button>
          ))}
        </div>
        <button className="btn btn-primary gap-1.5 text-sm" onClick={openCreate}><Plus size={16} /> Add Task</button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
          <input className="input pl-9" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-40" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
          <option value="all">All Projects</option>
          {[...new Map(tasks.filter(t => t.projectId).map(t => [t.projectId._id || t.projectId, t.projectId?.name || t.projectId])).entries()].map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select className="input sm:w-36" value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}>
          <option value="all">All Assignees</option>
          {assigneeOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className="input sm:w-32" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="all">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button
          onClick={() => setMyTasks(v => !v)}
          className={`btn btn-sm whitespace-nowrap transition-colors ${myTasks ? 'btn-primary' : 'btn-secondary'}`}>
          My Tasks {myTasks && `(${filtered.length})`}
        </button>
      </div>

      {/* Kanban */}
      {view === 'kanban' ? (
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-3 px-3 sm:-mx-4 sm:px-4 lg:-mx-5 lg:px-5 scrollbar-thin snap-x snap-mandatory sm:snap-none">
          {COLUMNS.map(col => {
            const colTasks = byStatus(col.id)
            const Icon = col.icon
            return (
              <div key={col.id} className="flex-shrink-0 w-[280px] sm:w-72 snap-start">
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={14} style={{ color: col.colour }} />
                  <span className="text-xs sm:text-sm font-semibold text-fg">{col.label}</span>
                  <span className="ml-auto text-[10px] sm:text-xs font-medium text-fg-3 bg-[var(--color-surface-3)] px-1.5 sm:px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <div className="space-y-2 sm:space-y-2.5">
                  {colTasks.map(task => {
                    const cat = CATEGORY_META[task.category]
                    const isDue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
                    const assignee = task.assignedTo?.[0]
                    return (
                      <div key={task._id}
                        className="card p-3 sm:p-3.5 cursor-pointer hover:border-[var(--color-accent-ring)] transition-colors"
                        onClick={() => navigate(`/tasks/${task._id}`)}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="text-[13px] sm:text-sm font-medium text-fg leading-snug">
                            {task.isRecurring && <span className="mr-1 text-accent text-[10px]" title="Recurring">🔁</span>}
                            {task.title}
                          </p>
                          <PriorityBadge priority={task.priority} />
                        </div>
                        {task.description && (
                          <p className="text-[10px] text-fg-3 mb-1.5 line-clamp-2 leading-relaxed">{task.description}</p>
                        )}
                        {cat && <span className="text-[10px] font-medium" style={{ color: cat.colour }}>{cat.label}</span>}
                        <p className="text-[10px] text-fg-3 mt-1 mb-2 sm:mb-2.5 truncate">{task.projectId?.name || '—'}</p>
                        <div className="flex items-center justify-between">
                          <Avatar name={assignee?.name || 'Unassigned'} size="xs" />
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-medium ${isDue ? 'text-[var(--color-danger)]' : 'text-fg-3'}`}>
                              {isDue ? '⚠ ' : ''}{task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                            </span>
                            <QuickStatusMenu task={task} onMove={moveTask} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <button onClick={openCreate}
                    className="w-full py-2 sm:py-2.5 border-2 border-dashed border-[var(--color-border)] rounded-xl text-xs text-fg-3 hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-1">
                    <Plus size={13} /> Add task
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List view */
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Task</th><th>Category</th><th>Project</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Due</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const cat = CATEGORY_META[t.category]
                const isDue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
                const a = t.assignedTo?.[0]
                return (
                  <tr key={t._id} className="cursor-pointer" onClick={() => navigate(`/tasks/${t._id}`)}>
                    <td>
                      <p className="font-medium text-fg whitespace-nowrap">
                        {t.isRecurring && <span className="mr-1 text-accent text-[10px]" title="Recurring">🔁</span>}
                        {t.title}
                      </p>
                      {t.description && <p className="text-xs text-fg-3 mt-0.5 max-w-[200px] truncate">{t.description}</p>}
                    </td>
                    <td>{cat && <span className="text-xs whitespace-nowrap" style={{ color: cat.colour }}>{cat.label}</span>}</td>
                    <td className="text-fg-3 text-xs whitespace-nowrap">{t.projectId?.name || '—'}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Avatar name={a?.name || '—'} size="xs" />
                        <span className="text-xs text-fg-2 whitespace-nowrap">{a?.name || '—'}</span>
                      </div>
                    </td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className={`text-xs font-medium whitespace-nowrap ${isDue ? 'text-[var(--color-danger)]' : 'text-fg-2'}`}>
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <select className="input py-1 text-[10px]" style={{ minHeight: 28, minWidth: 110 }}
                        value={t.status} onChange={e => moveTask(t._id, e.target.value)}>
                        {ALL_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTask ? `Edit Task` : 'Add Task'}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            {editTask && (
              <button className="btn btn-ghost text-[var(--color-danger)] text-sm"
                onClick={() => { moveTask(editTask._id, 'cancelled'); setModalOpen(false) }}>
                Cancel Task
              </button>
            )}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editTask ? 'Save Changes' : 'Create Task'}
            </button>
          </>
        }>
        <TaskForm form={form} setForm={setForm} users={users} projects={projects} />
      </Modal>
    </div>
  )
}
