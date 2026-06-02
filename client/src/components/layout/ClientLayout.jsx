import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Briefcase, Calendar, FileText, LogOut, Menu, X, Sun, Moon, LifeBuoy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'
import { setDarkMode, loadDarkMode } from '@/lib/theme'

const NAV = [
  { to: '/portal/overview',  icon: LayoutDashboard, label: 'Overview' },
  { to: '/portal/projects',  icon: Briefcase,       label: 'My Projects' },
  { to: '/portal/content',   icon: Calendar,        label: 'Content' },
  { to: '/portal/invoices',  icon: FileText,        label: 'Invoices' },
  { to: '/portal/tickets',   icon: LifeBuoy,        label: 'Support' },
]

export function ClientLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDark, setIsDark] = useState(loadDarkMode)

  const toggleDark = () => { setDarkMode(!isDark); setIsDark(d => !d) }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-screen z-40 flex flex-col',
        'bg-[var(--color-surface)] border-r border-[var(--color-border)]',
        'transition-transform duration-250',
        'w-[220px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )} style={{ boxShadow: 'var(--shadow-sm)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--color-border)]" style={{ minHeight: 56 }}>
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center font-bold text-white text-sm flex-shrink-0">Z</div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-fg leading-none">ZRC Media</p>
            <p className="text-[10px] text-accent font-medium mt-0.5">Client Portal</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden btn btn-ghost btn-icon" style={{ width: 28, height: 28, minHeight: 28 }}>
            <X size={15} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV.map(item => {
            const isActive = location.pathname.startsWith(item.to)
            return (
              <NavLink key={item.to} to={item.to}
                className={cn('nav-item w-full', isActive && 'active nav-glow')}
                onClick={() => setMobileOpen(false)}>
                <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className="flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="border-t border-[var(--color-border)] p-3 space-y-1">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <Avatar name={user?.name ?? 'Client'} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-fg truncate">{user?.name}</p>
              <p className="text-[10px] text-fg-3 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="nav-item w-full text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10">
            <LogOut size={16} /> <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-[220px]">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]" style={{ height: 52, boxShadow: 'var(--shadow-sm)' }}>
          <button onClick={() => setMobileOpen(true)} className="btn btn-ghost btn-icon lg:hidden"><Menu size={20} /></button>
          <div className="flex-1" />
          <button onClick={toggleDark} className="btn btn-ghost btn-icon" title={isDark ? 'Light mode' : 'Dark mode'}>
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <Avatar name={user?.name ?? 'Client'} size="sm" />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
