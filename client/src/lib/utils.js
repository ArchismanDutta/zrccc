import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** Format numbers as currency */
export function formatCurrency(amount, currency = 'INR') {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Relative time (e.g. "2 hours ago") */
export function timeAgo(date) {
  if (!date) return '—'
  const d = new Date(date)
  const now = Date.now()
  const diff = now - d.getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** Format date nicely */
export function formatDate(date, opts = {}) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opts,
  })
}

/** Get initials from name */
export function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')
}

/** Truncate text */
export function truncate(str, n = 40) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

/** Status badge variant mapping */
export function statusVariant(status) {
  const map = {
    active: 'success', onboarding: 'info', prospect: 'warning',
    churned: 'danger', paused: 'neutral', reactivated: 'accent',
    paid: 'success', partial: 'warning', overdue: 'danger',
    draft: 'neutral', sent: 'info', cancelled: 'danger',
    planning: 'info', on_hold: 'warning', completed: 'success',
    todo: 'neutral', in_progress: 'accent', review: 'warning',
    done: 'success', revision_needed: 'danger',
    approved: 'success', scheduled: 'accent', published: 'success',
    idea: 'neutral', awaiting_client: 'warning',
  }
  return map[status] ?? 'neutral'
}

/** Priority badge variant */
export function priorityVariant(p) {
  return { low: 'neutral', medium: 'info', high: 'warning', urgent: 'danger', critical: 'danger', vip: 'accent' }[p] ?? 'neutral'
}

/** Generate a stable colour from a string (for avatars) */
export function stringToHue(str = '') {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash) % 360
}
