import { cn, getInitials, stringToHue } from '@/lib/utils'

/** Avatar component with image fallback to initials */
export function Avatar({ name, src, size = 'md', className }) {
  const sizeMap = { xs: 24, sm: 28, md: 36, lg: 44, xl: 56 }
  const px = sizeMap[size] ?? 36
  const hue = stringToHue(name)

  return (
    <span
      className={cn('avatar', className)}
      style={{
        width: px, height: px, fontSize: px * 0.36,
        '--avatar-h': hue,
        background: src ? undefined : `hsl(${hue} 60% 90%)`,
        color: `hsl(${hue} 60% 32%)`,
      }}
    >
      {src
        ? <img src={src} alt={name} className="w-full h-full object-cover rounded-full" />
        : getInitials(name)
      }
    </span>
  )
}

/** Compact avatar group (stacked) */
export function AvatarGroup({ users = [], max = 3, size = 'sm' }) {
  const shown = users.slice(0, max)
  const rest = users.length - max
  return (
    <div className="flex items-center" style={{ gap: '-6px' }}>
      {shown.map((u, i) => (
        <Avatar
          key={u._id ?? i}
          name={u.name}
          src={u.avatar}
          size={size}
          className="ring-2 ring-[var(--color-surface)]"
          style={{ marginLeft: i > 0 ? '-8px' : 0 }}
        />
      ))}
      {rest > 0 && (
        <span
          className="avatar"
          style={{ width: 28, height: 28, fontSize: 11, marginLeft: '-8px', background: 'var(--color-surface-3)', color: 'var(--color-fg-2)', border: '2px solid var(--color-surface)' }}
        >
          +{rest}
        </span>
      )}
    </div>
  )
}
