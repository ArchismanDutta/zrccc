import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Search, Sun, Moon, Palette, X, Check, Menu, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { THEME_PRESETS, applyTheme, saveTheme, setDarkMode } from '@/lib/theme'
import { useAuth } from '@/lib/auth'
import api from '@/lib/api'
import { getSocket } from '@/lib/socket'

function relTime(d) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dy = Math.floor(diff / 86400000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${dy}d ago`
}

const PAGE_TITLES = {
  '/dashboard': 'Dashboard', '/clients': 'Clients', '/projects': 'Projects',
  '/content': 'Content Calendar', '/tasks': 'Tasks', '/finance': 'Finance',
  '/messages': 'Messages', '/reports': 'Reports', '/settings': 'Settings',
}

export function TopBar({ sidebarCollapsed, isMobile, onMobileMenu, user, isDark, onToggleDark, currentThemeId, onThemeChange, onSearchOpen }) {
  const location = useLocation()
  const { logout } = useAuth()
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    api.getNotifications().then(res => {
      setNotifications(res.data?.notifications || [])
      setUnreadCount(res.data?.unreadCount || 0)
    }).catch(() => {})

    const socket = getSocket()
    socket.connect()
    const onNotification = (notif) => {
      setNotifications(prev => [notif, ...prev])
      setUnreadCount(c => c + 1)
    }
    socket.on('notification', onNotification)
    return () => { socket.off('notification', onNotification) }
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await api.markAllRead()
      setNotifications(n => n.map(x => ({ ...x, isRead: true })))
      setUnreadCount(0)
    } catch {}
  }

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] ?? 'ZRC CRM'

  const handleThemeSelect = (preset) => {
    applyTheme(preset); saveTheme(preset.id); onThemeChange(preset.id); setShowThemePicker(false)
  }

  const leftOffset = isMobile ? '0px' : sidebarCollapsed ? '68px' : '240px'

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4',
        'bg-[var(--color-surface)] border-b border-[var(--color-border)]',
        'transition-all duration-250 ease-in-out',
      )}
      style={{ left: leftOffset, height: 'var(--topbar-h)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Mobile menu */}
      {isMobile && (
        <button onClick={onMobileMenu} className="btn btn-ghost btn-icon flex-shrink-0" aria-label="Open menu">
          <Menu size={20} />
        </button>
      )}

      {/* Mobile logo */}
      {isMobile && (
        <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-accent font-bold text-white text-xs">Z</div>
      )}

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-sm text-fg truncate">{pageTitle}</h2>
      </div>

      {/* Search — hidden on mobile */}
      <button className="btn btn-ghost btn-icon hidden sm:flex" title="Search (⌘K)" onClick={onSearchOpen}><Search size={18} /></button>

      {/* Dark mode */}
      <button className="btn btn-ghost btn-icon flex-shrink-0" onClick={() => { setDarkMode(!isDark); onToggleDark(!isDark) }} title={isDark ? 'Light mode' : 'Dark mode'}>
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      {/* Theme picker */}
      <div className="relative hidden sm:block">
        <button className="btn btn-ghost btn-icon" onClick={() => setShowThemePicker(s => !s)} title="Change theme colour">
          <Palette size={18} />
        </button>
        {showThemePicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowThemePicker(false)} />
            <div className="absolute right-0 top-full mt-2 z-50 p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]" style={{ boxShadow: 'var(--shadow-lg)', minWidth: 240 }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-fg-2 uppercase tracking-wide">Theme Colour</p>
                <button onClick={() => setShowThemePicker(false)} className="btn btn-ghost btn-icon" style={{ width: 24, height: 24, minHeight: 24 }}><X size={13} /></button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {THEME_PRESETS.map((preset) => {
                  const isActive = currentThemeId === preset.id
                  return (
                    <button key={preset.id} onClick={() => handleThemeSelect(preset)} title={preset.label}
                      className={cn('relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all', isActive ? 'bg-[var(--color-accent-ghost)] ring-2 ring-[var(--color-accent)]' : 'hover:bg-[var(--color-surface-3)]')}>
                      <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `hsl(${preset.h} ${preset.s}% ${preset.l}%)` }}>
                        {isActive && <Check size={12} color="white" strokeWidth={3} />}
                      </span>
                      <span className="text-[9px] text-fg-3 font-medium truncate w-full text-center">{preset.label}</span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                <p className="text-xs font-semibold text-fg-2 uppercase tracking-wide mb-2">Appearance</p>
                <div className="flex gap-2">
                  <button onClick={() => { setDarkMode(false); onToggleDark(false) }} className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all', !isDark ? 'bg-accent-ghost text-accent' : 'text-fg-3 hover:bg-[var(--color-surface-3)]')}><Sun size={13} /> Light</button>
                  <button onClick={() => { setDarkMode(true); onToggleDark(true) }} className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all', isDark ? 'bg-accent-ghost text-accent' : 'text-fg-3 hover:bg-[var(--color-surface-3)]')}><Moon size={13} /> Dark</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Notifications */}
      <div className="relative">
        <button className="btn btn-ghost btn-icon relative flex-shrink-0" onClick={() => setShowNotifications(s => !s)} title="Notifications">
          <Bell size={17} />
          {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--color-danger)] ring-2 ring-[var(--color-surface)]" />}
        </button>
        {showNotifications && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
            <div className="absolute right-0 top-full mt-2 z-50 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden" style={{ boxShadow: 'var(--shadow-lg)', width: 'min(320px, calc(100vw - 24px))' }}>
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-[var(--color-border)]">
                <p className="font-semibold text-sm text-fg">Notifications</p>
                <button className="text-xs text-accent font-medium hover:underline" onClick={handleMarkAllRead}>Mark all read</button>
              </div>
              <div className="divide-y divide-[var(--color-border)] max-h-[60vh] overflow-y-auto">
                {notifications.length === 0
                  ? <p className="text-xs text-fg-3 text-center py-6">No notifications</p>
                  : notifications.map(n => (
                    <div key={n._id} className="flex gap-3 px-3 sm:px-4 py-3 hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer">
                      <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', n.isRead ? 'bg-transparent' : 'bg-accent')} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-fg">{n.title}</p>
                        <p className="text-xs text-fg-3 mt-0.5">{n.body}</p>
                        <p className="text-[10px] text-fg-3 mt-1">{relTime(n.createdAt)}</p>
                      </div>
                    </div>
                  ))
                }
              </div>
              <div className="p-3 border-t border-[var(--color-border)]">
                <button className="w-full text-center text-xs text-accent font-medium py-1 hover:underline">View all notifications</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User avatar + dropdown */}
      <div className="relative">
        <button onClick={() => setShowUserMenu(s => !s)} className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-[var(--color-surface-3)] transition-colors">
          <Avatar name={user?.name ?? 'Admin'} size="sm" />
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-fg leading-none">{user?.name ?? 'Admin'}</p>
            <p className="text-[10px] text-fg-3 mt-0.5 capitalize">{(user?.role ?? 'super_admin').replace(/_/g, ' ')}</p>
          </div>
        </button>
        {showUserMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
            <div className="absolute right-0 top-full mt-2 z-50 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden" style={{ boxShadow: 'var(--shadow-lg)', minWidth: 200 }}>
              <div className="px-4 py-3 border-b border-[var(--color-border)]">
                <p className="text-sm font-semibold text-fg">{user?.name ?? 'Admin'}</p>
                <p className="text-xs text-fg-3 mt-0.5">{user?.email ?? ''}</p>
                <p className="text-[10px] text-accent font-medium mt-1 capitalize">{(user?.role ?? 'super_admin').replace(/_/g, ' ')}</p>
              </div>
              <div className="p-1.5">
                <button
                  onClick={() => { setShowUserMenu(false); logout() }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors font-medium">
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
