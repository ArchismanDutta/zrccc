import { useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { ShortcutsHelp } from '@/components/ui/ShortcutsHelp'
import { applyTheme, loadTheme, loadDarkMode, setDarkMode } from '@/lib/theme'
import { useAuth } from '@/lib/auth'
import { useAppShortcuts } from '@/lib/shortcuts'

export function AppLayout() {
  const { user } = useAuth()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const [collapsed, setCollapsed] = useState(isMobile)
  const [isDark, setIsDark] = useState(loadDarkMode)
  const [themeId, setThemeId] = useState(() => loadTheme().id)
  const [searchOpen, setSearchOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  useAppShortcuts()

  useEffect(() => {
    const preset = loadTheme()
    applyTheme(preset)
    setThemeId(preset.id)
    const dark = loadDarkMode()
    setDarkMode(dark)
    setIsDark(dark)
  }, [])

  const handleResize = useCallback(() => {
    const mobile = window.innerWidth < 1024
    setIsMobile(mobile)
    if (mobile) setCollapsed(true)
  }, [])

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  // ⌘K / Ctrl+K opens the command palette
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ? opens the shortcuts help overlay
  useEffect(() => {
    const handler = () => setHelpOpen(true)
    window.addEventListener('shortcut:help', handler)
    return () => window.removeEventListener('shortcut:help', handler)
  }, [])

  const userData = user || { name: 'Admin', role: 'super_admin', email: 'admin@zrcmedia.in' }
  const sidebarOffset = isMobile ? '0px' : collapsed ? '68px' : '240px'

  return (
    <div className="min-h-screen">
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} user={userData} />

      <div
        className="flex flex-col min-h-screen transition-all duration-250 ease-in-out"
        style={{ paddingLeft: sidebarOffset }}
      >
        <TopBar
          sidebarCollapsed={collapsed}
          isMobile={isMobile}
          onMobileMenu={() => setCollapsed(false)}
          user={userData}
          isDark={isDark}
          onToggleDark={setIsDark}
          currentThemeId={themeId}
          onThemeChange={setThemeId}
          onSearchOpen={() => setSearchOpen(true)}
        />
        <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
        <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

        <main className="flex-1 overflow-x-hidden" style={{ paddingTop: 'var(--topbar-h)', background: 'var(--color-bg)' }}>
          <div className="p-3 sm:p-4 lg:p-5 max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
