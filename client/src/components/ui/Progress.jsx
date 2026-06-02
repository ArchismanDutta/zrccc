import { cn } from '@/lib/utils'

/** Progress bar with accent colour and optional label */
export function ProgressBar({ value = 0, max = 100, label, showPercent = true, size = 'md', className }) {
  const pct = Math.round((Math.min(value, max) / max) * 100)
  const h = size === 'sm' ? 4 : size === 'lg' ? 10 : 6
  const colour =
    pct >= 80 ? 'var(--color-success)' :
    pct >= 50 ? 'var(--color-accent)' :
    pct >= 25 ? 'var(--color-warning)' :
    'var(--color-danger)'

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {(label != null || showPercent) && (
        <div className="flex items-center justify-between gap-2">
          {label && <span className="text-xs text-fg-2">{label}</span>}
          {showPercent && <span className="text-xs font-medium text-fg-2 ml-auto">{pct}%</span>}
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: h, background: 'var(--color-surface-3)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: colour }}
        />
      </div>
    </div>
  )
}

/** Circular progress ring */
export function ProgressRing({ value = 0, size = 56, strokeWidth = 5, className }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, value))
  const dash = (pct / 100) * circ
  const colour =
    pct >= 80 ? 'var(--color-success)' :
    pct >= 50 ? 'var(--color-accent)' :
    pct >= 25 ? 'var(--color-warning)' :
    'var(--color-danger)'

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={colour}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <span className="absolute text-xs font-semibold text-fg-2">{pct}%</span>
    </div>
  )
}
