import { cn } from '@/lib/utils'

/** Reusable stat card used on dashboards */
export function StatCard({ label, value, sub, icon: Icon, trend, trendLabel, variant = 'default', className }) {
  const variantMap = {
    default: '',
    success: 'border-t-2 border-t-[var(--color-success)]',
    warning: 'border-t-2 border-t-[var(--color-warning)]',
    danger:  'border-t-2 border-t-[var(--color-danger)]',
    accent:  'border-t-2 border-t-[var(--color-accent)]',
  }

  const trendColour = trend > 0
    ? 'text-[var(--color-success)]'
    : trend < 0
      ? 'text-[var(--color-danger)]'
      : 'text-fg-3'

  return (
    <div className={cn('stat-card', variantMap[variant], className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-fg-3 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-bold text-fg truncate">{value}</p>
          {sub && <p className="text-xs text-fg-3 mt-0.5">{sub}</p>}
          {trend != null && (
            <p className={cn('text-xs font-medium mt-2', trendColour)}>
              {trend > 0 ? '▲' : trend < 0 ? '▼' : '→'} {Math.abs(trend)}%
              {trendLabel && <span className="text-fg-3 font-normal"> {trendLabel}</span>}
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-accent-ghost">
            <Icon size={18} className="text-accent" strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  )
}

/** Page header with title, subtitle, and right-side actions */
export function PageHeader({ title, subtitle, children, className }) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center gap-3 mb-6', className)}>
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-fg">{title}</h1>
        {subtitle && <p className="text-sm text-fg-3 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-shrink-0">{children}</div>}
    </div>
  )
}

/** Section card with optional header */
export function SectionCard({ title, subtitle, actions, children, className, bodyClassName }) {
  return (
    <div className={cn('card', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 p-4 border-b border-[var(--color-border)]">
          <div>
            {title && <h3 className="font-semibold text-sm text-fg">{title}</h3>}
            {subtitle && <p className="text-xs text-fg-3 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </div>
  )
}

/** Empty state */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-accent-ghost flex items-center justify-center mb-4">
          <Icon size={24} className="text-accent" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="font-semibold text-fg mb-1">{title}</h3>
      {description && <p className="text-sm text-fg-3 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Skeleton loading state */
export function Skeleton({ className, style }) {
  return <div className={cn('skeleton', className)} style={style} />
}

/** Divider */
export function Divider({ className, label }) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="text-xs text-fg-3 whitespace-nowrap">{label}</span>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>
    )
  }
  return <div className={cn('h-px bg-[var(--color-border)]', className)} />
}
