import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Briefcase, Calendar, CheckSquare,
  DollarSign, MessageSquare, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, Building2, Zap, Globe, Menu, Wallet, LifeBuoy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'

const ADMIN_ROLES    = ['super_admin', 'admin']
const MANAGER_ROLES  = ['super_admin', 'admin', 'account_manager', 'project_manager']
const REPORT_ROLES   = ['super_admin', 'admin', 'project_manager', 'account_manager']
const TICKET_ROLES   = ['super_admin', 'admin', 'project_manager', 'account_manager']
const FINANCE_ROLES  = ['super_admin', 'admin']

function can(role, allowedRoles) { return allowedRoles.includes(role) }

function buildNavSections(role) {
  const sections = [
    {
      label: 'Workspace',
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        ...(can(role, MANAGER_ROLES) ? [{ to: '/clients', icon: Users, label: 'Clients' }] : []),
        { to: '/projects',  icon: Briefcase,       label: 'Projects' },
      ],
    },
    {
      label: 'Creative',
      items: [
        { to: '/content', icon: Calendar,    label: 'Content Calendar' },
        { to: '/tasks',   icon: CheckSquare, label: 'Tasks' },
      ],
    },
    {
      label: 'Business',
      items: [
        ...(can(role, FINANCE_ROLES)  ? [{ to: '/finance',  icon: DollarSign,   label: 'Finance' }]  : []),
        ...(role === 'super_admin'    ? [{ to: '/salary',   icon: Wallet,        label: 'Salary' }]   : []),
        ...(can(role, TICKET_ROLES)   ? [{ to: '/tickets',  icon: LifeBuoy,      label: 'Tickets' }]  : []),
        { to: '/messages', icon: MessageSquare, label: 'Messages' },
        ...(can(role, REPORT_ROLES)   ? [{ to: '/reports',  icon: BarChart3,     label: 'Reports' }]  : []),
      ],
    },
    {
      label: 'System',
      items: [
        ...(can(role, ADMIN_ROLES) ? [{ to: '/settings', icon: Settings, label: 'Settings' }] : []),
      ],
    },
  ]
  // Drop empty sections
  return sections.filter(s => s.items.length > 0)
}

export function Sidebar({ collapsed, onCollapse, user }) {
  const location = useLocation()
  const { logout } = useAuth()
  const navSections = buildNavSections(user?.role)

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => onCollapse(true)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-screen z-40 flex flex-col',
          'bg-[var(--color-surface)] border-r border-[var(--color-border)]',
          'transition-all duration-250 ease-in-out',
          collapsed ? 'w-[68px]' : 'w-[240px]',
          // On mobile: off-screen when collapsed
          collapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
        )}
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        {/* Logo area */}
        <div className={cn(
          'flex items-center gap-3 border-b border-[var(--color-border)]',
          collapsed ? 'justify-center py-4 px-2' : 'px-4 py-4',
        )} style={{ minHeight: 'var(--topbar-h)' }}>
          <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-accent font-bold text-white text-sm">
            Z
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-bold text-sm text-fg leading-none">ZRC Media</p>
              <p className="text-[10px] text-fg-3 mt-0.5">Network CRM</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 scrollbar-none">
          {navSections.map((section) => (
            <div key={section.label} className="mb-4">
              {!collapsed && (
                <p className="section-title px-2 mb-1">{section.label}</p>
              )}
              {collapsed && <div className="h-px bg-[var(--color-border)] mx-2 mb-2" />}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = location.pathname.startsWith(item.to)
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          'nav-item w-full',
                          isActive && 'active nav-glow',
                          collapsed && 'justify-center px-2',
                        )}
                      >
                        <item.icon
                          size={18}
                          strokeWidth={isActive ? 2.2 : 1.8}
                          className="flex-shrink-0"
                        />
                        {!collapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User profile + collapse toggle */}
        <div className="border-t border-[var(--color-border)] p-2">
          {!collapsed && (
            <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[var(--color-surface-3)] transition-colors cursor-pointer mb-1">
              <Avatar name={user?.name ?? 'Admin'} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-fg truncate">{user?.name ?? 'Admin'}</p>
                <p className="text-[10px] text-fg-3 truncate capitalize">{user?.role?.replace(/_/g, ' ') ?? 'Super Admin'}</p>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            title="Sign Out"
            className={cn(
              'nav-item w-full text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10',
              collapsed ? 'justify-center px-2' : 'mb-1',
            )}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">Sign Out</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => onCollapse(!collapsed)}
            className={cn(
              'nav-item w-full text-fg-3 hover:text-fg',
              collapsed ? 'justify-center px-2' : 'justify-end px-3',
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : (
              <>
                <span className="text-xs mr-auto">Collapse</span>
                <ChevronLeft size={16} />
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}

/** Mobile hamburger button */
export function MobileMenuButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="btn btn-ghost btn-icon lg:hidden"
      aria-label="Open menu"
    >
      <Menu size={20} />
    </button>
  )
}
