import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Users, Calendar, DollarSign, Edit2,
  CheckCircle2, Clock, AlertTriangle, RotateCcw, Plus, X, Check,
} from 'lucide-react'
import { SectionCard, StatCard, EmptyState, Skeleton } from '@/components/ui/Cards'
import { StatusBadge, PriorityBadge, Badge } from '@/components/ui/Badge'
import { ProgressBar, ProgressRing } from '@/components/ui/Progress'
import { Avatar, AvatarGroup } from '@/components/ui/Avatar'
import { formatCurrency, formatDate, timeAgo } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/ui/Modal'
import api from '@/lib/api'

const TABS = ['Overview', 'Tasks', 'Content', 'Team']

const STATUS_COLOUR = {
  idea: 'var(--color-fg-3)', draft: 'var(--color-fg-2)', in_review: 'var(--color-warning)',
  revision_needed: 'var(--color-danger)', approved: 'var(--color-success)',
  awaiting_client: 'var(--color-info)', scheduled: 'var(--color-accent)', published: 'var(--color-success)',
}

const TASK_COLUMNS = [
  { id: 'todo',           label: 'To Do',       icon: Clock,         colour: 'var(--color-fg-3)' },
  { id: 'in_progress',    label: 'In Progress',  icon: RotateCcw,     colour: 'var(--color-accent)' },
  { id: 'review',         label: 'Review',       icon: AlertTriangle, colour: 'var(--color-warning)' },
  { id: 'revision_needed',label: 'Revision',     icon: AlertTriangle, colour: 'var(--color-danger)' },
  { id: 'done',           label: 'Done',         icon: CheckCircle2,  colour: 'var(--color-success)' },
]

const TYPE_LABEL = {
  social_media_management: 'Social Media', meta_ads: 'Meta Ads', reels: 'Reels',
  graphics: 'Graphics', carousels: 'Carousels', video_production: 'Video',
  website_development: 'Website Dev', website_maintenance: 'Web Maint.',
  content_writing: 'Content', photography: 'Photo', custom: 'Custom',
}

const CATEGORY_META = {
  shooting: { label: '📹 Shoot', colour: 'var(--color-info)' },
  reel_editing: { label: '✂️ Reel', colour: 'var(--color-accent)' },
  video_editing: { label: '🎬 Video', colour: 'var(--color-accent)' },
  graphic_design: { label: '🎨 Design', colour: 'var(--color-warning)' },
  carousel_design: { label: '🃏 Carousel', colour: 'var(--color-warning)' },
  caption_writing: { label: '✍️ Caption', colour: 'var(--color-success)' },
  ad_copy: { label: '📝 Ad Copy', colour: 'var(--color-success)' },
  meta_ads_management: { label: '📢 Ads', colour: 'var(--color-danger)' },
  meta_ad_creative: { label: '🖼 Creative', colour: 'var(--color-danger)' },
  web_development: { label: '💻 Web', colour: 'var(--color-fg-2)' },
  web_maintenance: { label: '🔧 Maint.', colour: 'var(--color-fg-2)' },
  content_planning: { label: '📋 Plan', colour: 'var(--color-fg-2)' },
  scheduling: { label: '📅 Schedule', colour: 'var(--color-fg-2)' },
  client_report: { label: '📊 Report', colour: 'var(--color-info)' },
  internal: { label: '🏢 Internal', colour: 'var(--color-fg-3)' },
  review: { label: '👀 Review', colour: 'var(--color-warning)' },
}

function TaskCard({ task, onMove }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const catMeta = CATEGORY_META[task.category] || { label: task.category, colour: 'var(--color-fg-3)' }
  const movableTo = TASK_COLUMNS.filter(c => c.id !== task.status).slice(0, 3)
  return (
    <div className="card p-3 text-sm space-y-2 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-fg leading-snug">{task.title}</p>
        <div className="relative flex-shrink-0">
          <button onClick={() => setMenuOpen(o => !o)} className="btn btn-ghost btn-icon" style={{ width: 24, height: 24, minHeight: 24 }}>
            <span className="text-fg-3 text-base leading-none">⋮</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg py-1 min-w-[130px]">
              {movableTo.map(col => (
                <button key={col.id} onClick={() => { onMove(task._id, col.id); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--color-surface-3)] transition-colors text-fg-2">
                  Move → {col.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
          style={{ background: `${catMeta.colour}18`, color: catMeta.colour }}>
          {catMeta.label}
        </span>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.dueDate && (
        <p className="text-[10px] text-fg-3">Due {formatDate(task.dueDate, { year: undefined })}</p>
      )}
      {(task.assignedTo || []).length > 0 && (
        <AvatarGroup users={(task.assignedTo || []).map(u => ({ name: u.name || u }))} max={3} size="xs" />
      )}
    </div>
  )
}

function StatusSelect({ status, onChangeStatus }) {
  const [open, setOpen] = useState(false)
  const statuses = ['planning', 'active', 'on_hold', 'completed', 'cancelled']
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1">
        <StatusBadge status={status} />
        <Edit2 size={10} className="text-fg-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg py-1 min-w-[140px]">
          {statuses.map(s => (
            <button key={s} onClick={() => { onChangeStatus(s); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--color-surface-3)] transition-colors ${s === status ? 'text-accent font-semibold' : 'text-fg-2'}`}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [project, setProject] = useState(null)
  const [tasks, setTasks]     = useState([])
  const [content, setContent] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')

  // Edit project modal
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving]     = useState(false)

  // Add team member modal
  const [teamModalOpen, setTeamModalOpen]   = useState(false)
  const [teamForm, setTeamForm]             = useState({ userId: '', projectRole: '' })
  const [teamSaving, setTeamSaving]         = useState(false)

  // Add milestone inline form
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [milestoneForm, setMilestoneForm]         = useState({ title: '', dueDate: '' })
  const [milestoneSaving, setMilestoneSaving]     = useState(false)

  const fetchProject = async () => {
    const res = await api.getProject(id)
    setProject(res.data)
  }

  const fetchTasks = async () => {
    const res = await api.getTasks(`?projectId=${id}&limit=100`)
    setTasks(res.data)
  }

  const fetchContent = async () => {
    const res = await api.getContent(`?projectId=${id}&limit=100`)
    setContent(res.data)
  }

  useEffect(() => {
    Promise.all([fetchProject(), fetchTasks(), fetchContent()])
      .catch(() => { toast.error('Project not found'); navigate('/projects') })
      .finally(() => setLoading(false))
  }, [id])

  const openTeamModal = async () => {
    setTeamForm({ userId: '', projectRole: '' })
    setTeamModalOpen(true)
    if (!allUsers.length) {
      try { const res = await api.getUsers('?limit=100'); setAllUsers(res.data) } catch {}
    }
  }

  const handleAddMember = async () => {
    if (!teamForm.userId) { toast.error('Select a user'); return }
    setTeamSaving(true)
    try {
      await api.addTeamMember(id, { userId: teamForm.userId, projectRole: teamForm.projectRole })
      toast.success('Member added')
      setTeamModalOpen(false)
      fetchProject()
    } catch (err) { toast.error(err.message) }
    finally { setTeamSaving(false) }
  }

  const handleRemoveMember = async (userId) => {
    try {
      await api.removeTeamMember(id, userId)
      toast.success('Member removed')
      fetchProject()
    } catch (err) { toast.error(err.message) }
  }

  const handleAddMilestone = async () => {
    if (!milestoneForm.title) { toast.error('Title is required'); return }
    setMilestoneSaving(true)
    try {
      await api.addMilestone(id, { title: milestoneForm.title, dueDate: milestoneForm.dueDate || null })
      toast.success('Milestone added')
      setMilestoneForm({ title: '', dueDate: '' })
      setShowMilestoneForm(false)
      fetchProject()
    } catch (err) { toast.error(err.message) }
    finally { setMilestoneSaving(false) }
  }

  const handleToggleMilestone = async (milestoneId) => {
    try {
      await api.toggleMilestone(id, milestoneId)
      fetchProject()
    } catch (err) { toast.error(err.message) }
  }

  const openEdit = () => {
    setEditForm({
      name: project.name || '',
      description: project.description || '',
      priority: project.priority || 'medium',
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : '',
      budget: project.budget || '',
      overallProgress: project.overallProgress ?? 0,
    })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      await api.updateProject(id, {
        ...editForm,
        budget: Number(editForm.budget) || 0,
        overallProgress: Number(editForm.overallProgress) || 0,
      })
      toast.success('Project updated')
      setEditOpen(false)
      fetchProject()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const changeStatus = async (status) => {
    try {
      await api.changeProjectStatus(id, { status })
      toast.success(`Status → ${status.replace(/_/g, ' ')}`)
      fetchProject()
    } catch (err) { toast.error(err.message) }
  }

  const moveTask = async (taskId, newStatus) => {
    try { await api.changeTaskStatus(taskId, { status: newStatus }); fetchTasks() }
    catch (err) { toast.error(err.message) }
  }

  if (loading) return (
    <div className="space-y-4 animate-slide-up">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
  if (!project) return null

  const openTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled')
  const doneTasks = tasks.filter(t => t.status === 'done')

  return (
    <div className="space-y-4 sm:space-y-5 animate-slide-up">
      {/* Back */}
      <button onClick={() => navigate('/projects')} className="flex items-center gap-1.5 text-sm text-fg-3 hover:text-fg transition-colors -mb-2">
        <ArrowLeft size={15} /> Back to Projects
      </button>

      {/* Hero */}
      <div className="card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-fg">{project.name}</h1>
            </div>
            {project.clientId && (
              <button onClick={() => navigate(`/clients/${project.clientId._id}`)}
                className="text-sm text-accent hover:underline mb-2 block">
                {project.clientId.companyName}
              </button>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <StatusSelect status={project.status} onChangeStatus={changeStatus} />
              <PriorityBadge priority={project.priority} />
              <span className="text-xs font-mono text-fg-3">{project.projectId}</span>
            </div>
            {project.description && (
              <p className="text-sm text-fg-2 mt-3 leading-relaxed">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <ProgressRing value={project.overallProgress ?? 0} size={64} />
            <button onClick={openEdit} className="btn btn-secondary btn-sm gap-1.5">
              <Edit2 size={13} /> Edit
            </button>
          </div>
        </div>

        {/* Type badges + dates */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-[var(--color-border)]">
          <div className="flex flex-wrap gap-1">
            {(project.type || []).map(t => (
              <Badge key={t} variant="accent">{TYPE_LABEL[t] ?? t}</Badge>
            ))}
          </div>
          {project.startDate && (
            <span className="text-xs text-fg-3">
              Start: <span className="text-fg-2">{formatDate(project.startDate, { year: undefined })}</span>
            </span>
          )}
          {project.endDate && (
            <span className="text-xs text-fg-3">
              Due: <span className="text-fg-2 font-medium">{formatDate(project.endDate, { year: undefined })}</span>
            </span>
          )}
          {project.budget > 0 && (
            <span className="text-xs text-fg-3">
              Budget: <span className="text-fg-2 font-medium">{formatCurrency(project.budget)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard label="Open Tasks" value={openTasks.length} sub={`${doneTasks.length} done`} icon={CheckCircle2} variant="accent" />
        <StatCard label="Team Size" value={(project.teamMembers || []).length} sub="Members" icon={Users} variant="success" />
        <StatCard label="Progress" value={`${project.overallProgress ?? 0}%`} sub="Overall" icon={CheckCircle2} variant="warning" />
        <StatCard label="Content" value={content.length} sub={`${content.filter(c => c.status === 'published').length} published`} icon={Calendar} variant="danger" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t ? 'border-accent text-accent' : 'border-transparent text-fg-3 hover:text-fg'}`}>
            {t}
            {t === 'Tasks' && tasks.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">{tasks.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="Project Manager">
            {project.projectManagerId ? (
              <div className="flex items-center gap-3">
                <Avatar name={project.projectManagerId.name} size="lg" />
                <div>
                  <p className="font-semibold text-sm text-fg">{project.projectManagerId.name}</p>
                  <p className="text-xs text-fg-3">{project.projectManagerId.email}</p>
                </div>
              </div>
            ) : <p className="text-sm text-fg-3">No PM assigned</p>}
          </SectionCard>

          <SectionCard title="Progress">
            <ProgressBar value={project.overallProgress ?? 0} />
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { label: 'To Do', count: tasks.filter(t => t.status === 'todo').length },
                { label: 'In Progress', count: tasks.filter(t => t.status === 'in_progress').length },
                { label: 'Done', count: doneTasks.length },
              ].map(s => (
                <div key={s.label} className="text-center p-2 rounded-lg bg-[var(--color-surface-2)]">
                  <p className="text-lg font-bold text-fg">{s.count}</p>
                  <p className="text-[10px] text-fg-3">{s.label}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Milestones" className="lg:col-span-2"
            actions={
              <button className="btn btn-ghost btn-sm gap-1 text-xs" onClick={() => setShowMilestoneForm(s => !s)}>
                <Plus size={13} /> Add
              </button>
            }>
            {/* Inline add form */}
            {showMilestoneForm && (
              <div className="flex flex-col sm:flex-row gap-2 mb-3 p-3 rounded-xl bg-[var(--color-surface-2)]">
                <input className="input flex-1 text-sm" placeholder="Milestone title *"
                  value={milestoneForm.title} onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))} />
                <input type="date" className="input sm:w-40 text-sm"
                  value={milestoneForm.dueDate} onChange={e => setMilestoneForm(f => ({ ...f, dueDate: e.target.value }))} />
                <div className="flex gap-1.5">
                  <button className="btn btn-primary btn-sm gap-1" onClick={handleAddMilestone} disabled={milestoneSaving}>
                    <Check size={13} /> {milestoneSaving ? '…' : 'Add'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowMilestoneForm(false); setMilestoneForm({ title: '', dueDate: '' }) }}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            )}
            {(project.milestones || []).length === 0 && !showMilestoneForm ? (
              <p className="text-sm text-fg-3 py-2">No milestones yet — click Add to create one.</p>
            ) : (
              <div className="space-y-2">
                {(project.milestones || []).map((m) => (
                  <div key={m._id} className="flex items-center gap-3 py-1">
                    <button
                      onClick={() => handleToggleMilestone(m._id)}
                      className={`w-4 h-4 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-colors ${m.completed ? 'bg-[var(--color-success)] border-[var(--color-success)]' : 'border-[var(--color-border)] hover:border-accent'}`}>
                      {m.completed && <Check size={9} color="white" strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${m.completed ? 'line-through text-fg-3' : 'text-fg'}`}>{m.title}</p>
                      {m.dueDate && <p className="text-xs text-fg-3">{formatDate(m.dueDate, { year: undefined })}</p>}
                    </div>
                    {m.completed && <Badge variant="success" className="text-[10px]">Done</Badge>}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Tasks Kanban */}
      {tab === 'Tasks' && (
        tasks.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No tasks yet" description="Tasks assigned to this project will appear here" />
        ) : (
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <div className="flex gap-3 min-w-max sm:min-w-0 sm:grid sm:grid-cols-3 lg:grid-cols-5">
              {TASK_COLUMNS.map(col => {
                const colTasks = tasks.filter(t => t.status === col.id)
                return (
                  <div key={col.id} className="w-64 sm:w-auto">
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <col.icon size={13} style={{ color: col.colour }} />
                      <span className="text-xs font-semibold text-fg-2">{col.label}</span>
                      <span className="ml-auto text-xs text-fg-3">{colTasks.length}</span>
                    </div>
                    <div className="space-y-2 min-h-[80px]">
                      {colTasks.map(task => (
                        <TaskCard key={task._id} task={task} onMove={moveTask} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}

      {/* Content */}
      {tab === 'Content' && (
        content.length === 0 ? (
          <EmptyState icon={Calendar} title="No content items" description="Content calendar items for this project will appear here" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {content.map(item => {
              const colour = STATUS_COLOUR[item.status] ?? 'var(--color-fg-3)'
              return (
                <div key={item._id} className="card p-3 sm:p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm text-fg leading-snug">{item.title}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={{ background: `${colour}20`, color: colour }}>
                      {item.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="neutral" className="text-[10px]">{item.contentType?.replace(/_/g, ' ')}</Badge>
                    {(item.platform || []).map(p => (
                      <Badge key={p} variant="neutral" className="text-[10px]">{p}</Badge>
                    ))}
                  </div>
                  {item.scheduledAt && (
                    <p className="text-[10px] text-fg-3">Scheduled: {formatDate(item.scheduledAt, { year: undefined })}</p>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Team */}
      {tab === 'Team' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button className="btn btn-primary btn-sm gap-1.5" onClick={openTeamModal}>
              <Plus size={14} /> Add Member
            </button>
          </div>
          {(project.teamMembers || []).length === 0 ? (
            <EmptyState icon={Users} title="No team members" description="Click Add Member to assign people to this project" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {project.teamMembers.map((m, i) => (
                <div key={i} className="card p-4 flex items-center gap-3">
                  <Avatar name={m.userId?.name || 'Unknown'} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-fg truncate">{m.userId?.name || 'Unknown'}</p>
                    <p className="text-xs text-fg-3 truncate">{m.userId?.role?.replace(/_/g, ' ')}</p>
                    {m.projectRole && (
                      <Badge variant="neutral" className="text-[10px] mt-1">{m.projectRole}</Badge>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveMember(m.userId?._id || m.userId)}
                    className="btn btn-ghost btn-icon text-fg-3 hover:text-[var(--color-danger)] transition-colors flex-shrink-0"
                    style={{ width: 28, height: 28, minHeight: 28 }}
                    title="Remove member">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Team Member modal */}
      <Modal isOpen={teamModalOpen} onClose={() => setTeamModalOpen(false)} title="Add Team Member" size="sm"
        footer={
          <><button className="btn btn-secondary" onClick={() => setTeamModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddMember} disabled={teamSaving}>
            {teamSaving ? 'Adding…' : 'Add Member'}
          </button></>
        }>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-fg-2 mb-1">Team Member *</label>
            <select className="input" value={teamForm.userId} onChange={e => setTeamForm(f => ({ ...f, userId: e.target.value }))}>
              <option value="">Select person</option>
              {allUsers
                .filter(u => u.role !== 'client' && !(project.teamMembers || []).some(m => (m.userId?._id || m.userId) === u._id))
                .map(u => <option key={u._id} value={u._id}>{u.name} — {u.role?.replace(/_/g, ' ')}</option>)
              }
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-2 mb-1">Project Role</label>
            <input className="input" placeholder="e.g. Lead Designer, Copywriter…"
              value={teamForm.projectRole} onChange={e => setTeamForm(f => ({ ...f, projectRole: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Project" size="md"
        footer={
          <><button className="btn btn-secondary" onClick={() => setEditOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button></>
        }>
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Project Name *</label>
          <input className="input" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Description</label>
          <textarea className="input" rows={3} value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Priority</label>
            <select className="input" value={editForm.priority || 'medium'} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}>
              {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
            </select></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Overall Progress (%)</label>
            <input type="number" min={0} max={100} className="input" value={editForm.overallProgress ?? 0} onChange={e => setEditForm(f => ({ ...f, overallProgress: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Start Date</label>
            <input type="date" className="input" value={editForm.startDate || ''} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-fg-2 mb-1">Due Date</label>
            <input type="date" className="input" value={editForm.endDate || ''} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} /></div>
          </div>
          <div><label className="block text-xs font-medium text-fg-2 mb-1">Budget (₹)</label>
          <input type="number" className="input" value={editForm.budget || ''} onChange={e => setEditForm(f => ({ ...f, budget: e.target.value }))} /></div>
        </div>
      </Modal>
    </div>
  )
}
