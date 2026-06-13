import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, RotateCcw, XCircle, Send, Plus, Flag, Tag } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
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

const SEVERITY_STYLES = {
  critical: { label: 'Critical', bg: 'bg-[var(--color-danger)]/10',   text: 'text-[var(--color-danger)]' },
  high:     { label: 'High',     bg: 'bg-[var(--color-warning)]/10',  text: 'text-[var(--color-warning)]' },
  medium:   { label: 'Medium',   bg: 'bg-[var(--color-info)]/10',     text: 'text-[var(--color-info)]' },
  low:      { label: 'Low',      bg: 'bg-[var(--color-success)]/10',  text: 'text-[var(--color-success)]' },
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const TERMINAL = ['done', 'cancelled']

export default function TaskDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)

  // Progress update form
  const [progressContent, setProgressContent] = useState('')
  const [progressPct, setProgressPct] = useState(0)
  const [addingProgress, setAddingProgress] = useState(false)

  // Issue report form
  const [issueTitle, setIssueTitle] = useState('')
  const [issueDesc, setIssueDesc] = useState('')
  const [issueSeverity, setIssueSeverity] = useState('medium')
  const [addingIssue, setAddingIssue] = useState(false)

  // Review form
  const [rejectNote, setRejectNote] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)

  // Status change
  const [changingStatus, setChangingStatus] = useState(false)

  const fetchTask = async () => {
    try {
      const res = await api.getTask(id)
      setTask(res.data || res)
    } catch (err) {
      toast.error('Failed to load task')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTask() }, [id])

  const handleStatusChange = async (newStatus) => {
    setChangingStatus(true)
    try {
      await api.changeTaskStatus(id, { status: newStatus })
      toast.success('Status updated')
      fetchTask()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setChangingStatus(false)
    }
  }

  const handleAddProgress = async () => {
    if (!progressContent.trim()) { toast.error('Progress content is required'); return }
    setAddingProgress(true)
    try {
      await api.addProgressUpdate(id, { content: progressContent.trim(), percentage: Number(progressPct) })
      toast.success('Progress update added')
      setProgressContent('')
      setProgressPct(0)
      fetchTask()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAddingProgress(false)
    }
  }

  const handleAddIssue = async () => {
    if (!issueTitle.trim()) { toast.error('Issue title is required'); return }
    setAddingIssue(true)
    try {
      await api.addIssueReport(id, { title: issueTitle.trim(), description: issueDesc.trim(), severity: issueSeverity })
      toast.success('Issue reported')
      setIssueTitle('')
      setIssueDesc('')
      setIssueSeverity('medium')
      fetchTask()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAddingIssue(false)
    }
  }

  const handleReview = async (decision) => {
    if (decision === 'reject' && !rejectNote.trim()) { toast.error('Please add a note for rejection'); return }
    setSubmittingReview(true)
    try {
      await api.submitTaskReview(id, { decision, note: rejectNote.trim() })
      toast.success(decision === 'approve' ? 'Task approved!' : 'Task sent back for revision')
      setShowRejectInput(false)
      setRejectNote('')
      fetchTask()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-fg-2">Task not found.</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Go back</button>
      </div>
    )
  }

  const isTerminal = TERMINAL.includes(task.status)
  const cat = CATEGORY_META[task.category]
  const canReview = task.status === 'review' && user?.permissions?.includes('tasks:review')

  // Status action buttons
  const statusActions = []
  if (!isTerminal) {
    if (task.status === 'todo') {
      statusActions.push({ label: 'Start Task', status: 'in_progress', style: 'btn-primary' })
    }
    if (task.status === 'in_progress') {
      statusActions.push({ label: 'Send to Review', status: 'review', style: 'btn-primary' })
    }
    if (task.status === 'revision_needed') {
      statusActions.push({ label: 'Back to In Progress', status: 'in_progress', style: 'btn-primary' })
    }
    if (!['done', 'cancelled', 'review'].includes(task.status)) {
      statusActions.push({ label: 'Mark Done', status: 'done', style: 'btn-secondary' })
    }
    statusActions.push({ label: 'Cancel Task', status: 'cancelled', style: 'btn-ghost text-[var(--color-danger)]' })
  }

  return (
    <div className="space-y-4 sm:space-y-5 animate-slide-up max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          className="btn btn-secondary p-2 mt-0.5 shrink-0"
          title="Go back">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-fg-3 bg-[var(--color-surface-3)] px-2 py-0.5 rounded">
              {task.taskId}
            </span>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-fg leading-snug">{task.title}</h1>
        </div>
      </div>

      {/* Status Actions Bar */}
      {statusActions.length > 0 && (
        <div className="card p-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-fg-3 mr-1">Quick actions:</span>
          {statusActions.map(a => (
            <button
              key={a.status}
              onClick={() => handleStatusChange(a.status)}
              disabled={changingStatus}
              className={`btn btn-sm ${a.style}`}>
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">

          {/* Description */}
          <div className="card p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-fg mb-3">Description</h2>
            {task.description
              ? <p className="text-sm text-fg-2 leading-relaxed whitespace-pre-wrap">{task.description}</p>
              : <p className="text-sm text-fg-3 italic">No description provided.</p>
            }
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Tag size={12} className="text-fg-3 mt-0.5" />
                {task.tags.map((tag, i) => (
                  <span key={i} className="text-[11px] bg-[var(--color-surface-3)] text-fg-2 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Progress Updates */}
          <div className="card p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-fg mb-3">Progress Updates</h2>
            {task.progressUpdates && task.progressUpdates.length > 0 ? (
              <div className="space-y-3 mb-4">
                {task.progressUpdates.map(upd => (
                  <div key={upd._id} className="flex gap-3 text-sm">
                    <div className="shrink-0 mt-0.5">
                      <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent">
                        {upd.percentage}%
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-fg-2 leading-relaxed">{upd.content}</p>
                      <p className="text-[11px] text-fg-3 mt-1">{fmtTime(upd.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-fg-3 italic mb-4">No progress updates yet.</p>
            )}

            {!isTerminal && (
              <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
                <p className="text-xs font-medium text-fg-2">Add Progress Update</p>
                <textarea
                  className="input resize-none text-sm"
                  rows={2}
                  placeholder="Describe what was done…"
                  value={progressContent}
                  onChange={e => setProgressContent(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <label className="text-xs text-fg-3 whitespace-nowrap">Completion %</label>
                    <input
                      type="number"
                      className="input text-sm w-20"
                      min={0} max={100}
                      value={progressPct}
                      onChange={e => setProgressPct(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-sm gap-1.5"
                    onClick={handleAddProgress}
                    disabled={addingProgress}>
                    <Plus size={14} />
                    {addingProgress ? 'Adding…' : 'Add Update'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Issue Reports */}
          <div className="card p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-fg mb-3">Issue Reports</h2>
            {task.issueReports && task.issueReports.length > 0 ? (
              <div className="space-y-3 mb-4">
                {task.issueReports.map(issue => {
                  const sev = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.medium
                  return (
                    <div key={issue._id} className="rounded-xl border border-[var(--color-border)] p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-fg">{issue.title}</p>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${sev.bg} ${sev.text}`}>
                          {sev.label}
                        </span>
                      </div>
                      {issue.description && (
                        <p className="text-xs text-fg-2 leading-relaxed">{issue.description}</p>
                      )}
                      <p className="text-[11px] text-fg-3 mt-1.5">{fmtTime(issue.createdAt)}</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-fg-3 italic mb-4">No issues reported.</p>
            )}

            {!isTerminal && (
              <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
                <p className="text-xs font-medium text-fg-2">Report an Issue</p>
                <input
                  className="input text-sm"
                  placeholder="Issue title"
                  value={issueTitle}
                  onChange={e => setIssueTitle(e.target.value)}
                />
                <textarea
                  className="input resize-none text-sm"
                  rows={2}
                  placeholder="Describe the issue…"
                  value={issueDesc}
                  onChange={e => setIssueDesc(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <select
                    className="input text-sm flex-1"
                    value={issueSeverity}
                    onChange={e => setIssueSeverity(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <button
                    className="btn btn-secondary btn-sm gap-1.5"
                    onClick={handleAddIssue}
                    disabled={addingIssue}>
                    <Flag size={14} />
                    {addingIssue ? 'Reporting…' : 'Report Issue'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Review Section */}
          {canReview && (
            <div className="card p-4 sm:p-5 border border-[var(--color-warning)]/30">
              <h2 className="text-sm font-semibold text-fg mb-1">Review This Task</h2>
              <p className="text-xs text-fg-3 mb-4">This task is awaiting your review. Approve to mark it done, or reject to send it back for revision.</p>

              {task.reviewNote && (
                <div className="bg-[var(--color-surface-3)] rounded-xl p-3 mb-4">
                  <p className="text-xs font-medium text-fg-2 mb-0.5">Previous review note</p>
                  <p className="text-sm text-fg-2">{task.reviewNote}</p>
                </div>
              )}

              {showRejectInput ? (
                <div className="space-y-2">
                  <textarea
                    className="input resize-none text-sm"
                    rows={3}
                    placeholder="Explain what needs to be revised…"
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      className="btn btn-sm bg-[var(--color-danger)] text-white hover:opacity-90 transition-opacity gap-1.5"
                      onClick={() => handleReview('reject')}
                      disabled={submittingReview}>
                      <XCircle size={14} />
                      {submittingReview ? 'Submitting…' : 'Send for Revision'}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setShowRejectInput(false); setRejectNote('') }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  <button
                    className="btn btn-sm bg-[var(--color-success)] text-white hover:opacity-90 transition-opacity gap-1.5"
                    onClick={() => handleReview('approve')}
                    disabled={submittingReview}>
                    <CheckCircle2 size={14} />
                    Approve
                  </button>
                  <button
                    className="btn btn-sm bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 transition-colors gap-1.5"
                    onClick={() => setShowRejectInput(true)}>
                    <XCircle size={14} />
                    Reject
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Review note (read-only, if reviewed) */}
          {task.reviewNote && !canReview && (
            <div className="card p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-fg mb-2">Review Note</h2>
              <p className="text-sm text-fg-2 leading-relaxed">{task.reviewNote}</p>
              {task.reviewedBy && (
                <p className="text-xs text-fg-3 mt-2">— {task.reviewedBy.name}</p>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Details */}
          <div className="card p-4">
            <h2 className="text-xs font-semibold text-fg-3 uppercase tracking-wider mb-3">Details</h2>
            <div className="space-y-3">

              {/* Assigned to */}
              <div>
                <p className="text-[11px] text-fg-3 mb-1.5">Assigned to</p>
                {task.assignedTo && task.assignedTo.length > 0 ? (
                  <div className="space-y-1.5">
                    {task.assignedTo.map(u => (
                      <div key={u._id} className="flex items-center gap-2">
                        <Avatar name={u.name} size="xs" />
                        <div>
                          <p className="text-xs font-medium text-fg">{u.name}</p>
                          {u.role && <p className="text-[10px] text-fg-3">{u.role.replace(/_/g, ' ')}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-fg-3">Unassigned</p>
                )}
              </div>

              {/* Assigned by */}
              {task.assignedBy && (
                <div>
                  <p className="text-[11px] text-fg-3 mb-1">Assigned by</p>
                  <p className="text-xs text-fg-2">{task.assignedBy.name}</p>
                </div>
              )}

              {/* Project */}
              {task.projectId && (
                <div>
                  <p className="text-[11px] text-fg-3 mb-1">Project</p>
                  <Link
                    to={`/projects/${task.projectId._id}`}
                    className="text-xs text-accent hover:underline font-medium">
                    {task.projectId.name}
                  </Link>
                  {task.projectId.projectId && (
                    <p className="text-[10px] text-fg-3 font-mono">{task.projectId.projectId}</p>
                  )}
                </div>
              )}

              {/* Category */}
              {cat && (
                <div>
                  <p className="text-[11px] text-fg-3 mb-1">Category</p>
                  <span className="text-xs font-medium" style={{ color: cat.colour }}>{cat.label}</span>
                </div>
              )}

              {/* Due date */}
              <div>
                <p className="text-[11px] text-fg-3 mb-1">Due Date</p>
                {task.dueDate ? (
                  <p className={`text-xs font-medium ${new Date(task.dueDate) < new Date() && !isTerminal ? 'text-[var(--color-danger)]' : 'text-fg-2'}`}>
                    {fmt(task.dueDate)}
                  </p>
                ) : (
                  <p className="text-xs text-fg-3">No due date</p>
                )}
              </div>

              {/* Hours */}
              <div>
                <p className="text-[11px] text-fg-3 mb-1">Hours</p>
                <p className="text-xs text-fg-2">
                  <span className="font-medium">{task.actualHours ?? 0}</span>
                  <span className="text-fg-3"> / {task.estimatedHours ?? 0} est.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="card p-4">
            <h2 className="text-xs font-semibold text-fg-3 uppercase tracking-wider mb-3">Timeline</h2>
            <div className="space-y-2.5">
              <div>
                <p className="text-[11px] text-fg-3">Created</p>
                <p className="text-xs text-fg-2">{fmt(task.createdAt)}</p>
              </div>
              {task.startedAt && (
                <div>
                  <p className="text-[11px] text-fg-3">Started</p>
                  <p className="text-xs text-fg-2">{fmt(task.startedAt)}</p>
                </div>
              )}
              {task.completedAt && (
                <div>
                  <p className="text-[11px] text-fg-3">Completed</p>
                  <p className="text-xs text-fg-2">{fmt(task.completedAt)}</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
