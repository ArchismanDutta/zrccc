import { cn } from '@/lib/utils'
import { statusVariant, priorityVariant } from '@/lib/utils'

export function Badge({ children, variant = 'neutral', className }) {
  return (
    <span className={cn('badge', `badge-${variant}`, className)}>
      {children}
    </span>
  )
}

export function StatusBadge({ status, label }) {
  const variant = statusVariant(status)
  const displayLabel = label ?? status?.replace(/_/g, ' ')
  return (
    <Badge variant={variant}>
      <span
        className="status-dot"
        style={{
          background: `var(--color-${variant === 'accent' ? 'accent' : variant})`,
          width: 6, height: 6,
        }}
      />
      {displayLabel}
    </Badge>
  )
}

export function PriorityBadge({ priority }) {
  const variant = priorityVariant(priority)
  const icons = { low: '↓', medium: '→', high: '↑', urgent: '⚡', critical: '🔴', vip: '⭐' }
  return (
    <Badge variant={variant}>
      {icons[priority] || ''} {priority}
    </Badge>
  )
}
