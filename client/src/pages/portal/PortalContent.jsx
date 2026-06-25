import { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { StatusBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/api'

const STATUS_TABS = [
  { id: 'all',              label: 'All' },
  { id: 'awaiting_client',  label: 'Needs Approval' },
  { id: 'approved',         label: 'Approved' },
  { id: 'revision_needed',  label: 'Revision' },
  { id: 'published',        label: 'Published' },
]

// Statuses on which the client can act
const CLIENT_ACTIONABLE = new Set(['awaiting_client'])

export default function PortalContent() {
  const { toast } = useToast()
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [rejectFeedback, setRejectFeedback] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchContent = () => {
    setLoading(true)
    api.getContent('?limit=200')
      .then(r => setItems(r.data || []))
      .catch(() => toast.error('Failed to load content'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchContent() }, [])

  const filtered = tab === 'all' ? items : items.filter(i => i.status === tab)

  const handleApprove = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await api.approveContent(selected._id, {})
      toast.success('Content approved!')
      setSelected(null)
      fetchContent()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleReject = async () => {
    if (!selected || !rejectFeedback.trim()) { toast.error('Please enter feedback'); return }
    setSaving(true)
    try {
      await api.rejectContent(selected._id, { feedback: rejectFeedback })
      toast.success('Feedback sent')
      setSelected(null)
      setRejectFeedback('')
      setShowRejectInput(false)
      fetchContent()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const TYPE_LABEL = { reel: 'Reel', static_post: 'Post', carousel: 'Carousel', story: 'Story', video: 'Video', meta_ad_creative: 'Ad Creative' }

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-fg">Content</h1>
        <p className="text-sm text-fg-3 mt-1">Review and approve your content pieces</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map(t => {
          const count = t.id === 'all' ? items.length : items.filter(i => i.status === t.id).length
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t.id ? 'bg-accent text-white' : 'bg-[var(--color-surface-2)] text-fg-3 hover:text-fg'}`}>
              {t.label} {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-fg-3 text-sm">No content in this category.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(item => (
            <button key={item._id} onClick={() => { setSelected(item); setShowRejectInput(false); setRejectFeedback('') }}
              className="card p-4 text-left hover:border-accent/40 transition-colors cursor-pointer">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-semibold text-sm text-fg leading-snug">{item.title}</p>
                <StatusBadge status={item.status} />
              </div>
              <p className="text-xs text-fg-3 capitalize">
                {TYPE_LABEL[item.contentType] || item.contentType} · {(item.platform || []).join(', ')}
              </p>
              {item.caption && (
                <p className="text-xs text-fg-2 mt-2 line-clamp-2">{item.caption}</p>
              )}
              {CLIENT_ACTIONABLE.has(item.status) && (
                <div className="mt-3 flex gap-2">
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-[var(--color-warning)]/10 text-[var(--color-warning)] font-medium">Awaiting your approval</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content detail modal */}
      {selected && (
        <Modal isOpen onClose={() => setSelected(null)} title={selected.title} size="sm"
          footer={
            <div className="flex gap-2 w-full">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              {CLIENT_ACTIONABLE.has(selected.status) && (
                <>
                  <button className="btn btn-ghost gap-1 text-[var(--color-danger)] ml-auto" onClick={() => setShowRejectInput(s => !s)} disabled={saving}>
                    <ThumbsDown size={14} /> Reject
                  </button>
                  <button className="btn btn-primary gap-1" onClick={handleApprove} disabled={saving}>
                    <ThumbsUp size={14} /> Approve
                  </button>
                </>
              )}
            </div>
          }>
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={selected.status} />
              <span className="text-xs text-fg-3 capitalize">{TYPE_LABEL[selected.contentType] || selected.contentType}</span>
              {(selected.platform || []).length > 0 && (
                <span className="text-xs text-fg-3">{selected.platform.join(', ')}</span>
              )}
            </div>

            {selected.caption && (
              <div>
                <p className="text-xs font-semibold text-fg-2 mb-1">Caption</p>
                <p className="text-sm text-fg whitespace-pre-wrap bg-[var(--color-surface-2)] p-3 rounded-xl">{selected.caption}</p>
              </div>
            )}

            {selected.hashtags?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-fg-2 mb-1">Hashtags</p>
                <p className="text-xs text-accent">{Array.isArray(selected.hashtags) ? selected.hashtags.join(' ') : selected.hashtags}</p>
              </div>
            )}

            {showRejectInput && (
              <div className="p-3 rounded-xl border border-[var(--color-danger)] bg-[var(--color-surface-2)] space-y-2">
                <label className="block text-xs font-semibold text-fg-2">What needs to change?</label>
                <textarea className="input resize-none" rows={3} value={rejectFeedback}
                  onChange={e => setRejectFeedback(e.target.value)}
                  placeholder="Describe the revision needed…" />
                <button className="btn btn-sm w-full text-xs" style={{ background: 'var(--color-danger)', color: '#fff' }}
                  onClick={handleReject} disabled={saving || !rejectFeedback.trim()}>
                  Send Feedback
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
