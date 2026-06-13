import { useState, useEffect } from 'react'
import { Palette, Moon, Sun, User, Bell, Shield, Building2, Users, Check, Search, Plus } from 'lucide-react'
import { PageHeader, SectionCard } from '@/components/ui/Cards'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { THEME_PRESETS, applyTheme, saveTheme, setDarkMode } from '@/lib/theme'
import { useAuth } from '@/lib/auth'
import api from '@/lib/api'

const SETTINGS_NAV = [
  { id: 'appearance', label: 'Appearance',   icon: Palette },
  { id: 'profile',    label: 'Profile',      icon: User },
  { id: 'company',    label: 'Company',      icon: Building2 },
  { id: 'team',       label: 'Team & Roles', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security',   label: 'Security',     icon: Shield },
]

const ROLES = [
  'super_admin','admin','project_manager','dept_head','account_manager',
  'social_media_manager','graphic_designer','video_editor','cinematographer',
  'content_writer','web_developer','employee',
]
const ROLE_LABEL = {
  super_admin: 'Super Admin', admin: 'Admin', project_manager: 'Project Manager',
  dept_head: 'Dept Head', account_manager: 'Account Manager',
  social_media_manager: 'Social Media Mgr', graphic_designer: 'Graphic Designer',
  video_editor: 'Video Editor', cinematographer: 'Cinematographer',
  content_writer: 'Content Writer', web_developer: 'Web Developer', employee: 'Employee',
}

const ROLE_LEVEL = {
  super_admin: 10, admin: 9, project_manager: 8, dept_head: 7, account_manager: 6,
  social_media_manager: 5, graphic_designer: 5, video_editor: 5, cinematographer: 5,
  content_writer: 5, web_developer: 5, employee: 4,
}

// ─── Appearance ───────────────────────────────────────────────
function AppearanceSection({ currentThemeId, onThemeChange, isDark, onDarkChange }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Theme Colour" subtitle="Choose the accent colour for the entire app">
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
          {THEME_PRESETS.map(preset => {
            const isActive = currentThemeId === preset.id
            return (
              <button key={preset.id}
                onClick={() => { applyTheme(preset); saveTheme(preset.id); onThemeChange(preset.id) }}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${isActive ? 'bg-accent-ghost ring-2 ring-[var(--color-accent)]' : 'hover:bg-[var(--color-surface-3)]'}`}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: `hsl(${preset.h} ${preset.s}% ${preset.l}%)` }}>
                  {isActive && <Check size={14} color="white" strokeWidth={3} />}
                </span>
                <span className="text-[10px] text-fg-3 font-medium">{preset.label}</span>
              </button>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard title="Appearance Mode" subtitle="Choose between light and dark mode">
        <div className="flex gap-4 max-w-sm">
          {[{ key: false, label: 'Light Mode', icon: Sun }, { key: true, label: 'Dark Mode', icon: Moon }].map(({ key, label, icon: Icon }) => (
            <button key={label} onClick={() => { setDarkMode(key); onDarkChange(key) }}
              className={`flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-all ${!key !== !isDark ? 'border-accent bg-accent-ghost text-accent' : 'border-[var(--color-border)] text-fg-3 hover:bg-[var(--color-surface-3)]'}`}>
              <Icon size={22} /><span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Sidebar" subtitle="Sidebar display preferences">
        <div className="space-y-3 max-w-sm">
          {[
            { label: 'Show section labels', desc: 'Display category labels in the sidebar navigation' },
            { label: 'Collapse on mobile', desc: 'Auto-collapse sidebar on screens smaller than 1024px' },
          ].map(opt => (
            <label key={opt.label} className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-fg">{opt.label}</p>
                <p className="text-xs text-fg-3">{opt.desc}</p>
              </div>
              <div className="relative">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-10 h-5 rounded-full bg-[var(--color-surface-3)] peer-checked:bg-accent transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-5 shadow" />
              </div>
            </label>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Team & Roles ─────────────────────────────────────────────
function TeamSection() {
  const { toast } = useToast()
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee', departmentId: '', phone: '', salary: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    try {
      const [u, d] = await Promise.all([api.getUsers('?limit=100'), api.getDepartments()])
      setUsers(u.data || [])
      setDepartments(d.data || [])
    } catch { toast.error('Failed to load team') }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [])

  const openCreate = () => {
    setEditUser(null)
    setForm({ name: '', email: '', password: '', role: 'employee', departmentId: '', phone: '', salary: '' })
    setModalOpen(true)
  }
  const openEdit = (u) => {
    setEditUser(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, departmentId: u.departmentId?._id || '', phone: u.phone || '', salary: u.salary || '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!editUser && (!form.name || !form.email || !form.password)) { toast.error('Name, email and password are required'); return }
    if (editUser && !form.name) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      if (editUser) {
        await api.updateUser(editUser._id, { name: form.name, role: form.role, departmentId: form.departmentId || null, phone: form.phone, salary: Number(form.salary) || 0 })
        toast.success('User updated')
      } else {
        await api.createUser({ name: form.name, email: form.email, password: form.password, role: form.role, departmentId: form.departmentId || null, phone: form.phone, salary: Number(form.salary) || 0 })
        toast.success('User created')
      }
      setModalOpen(false)
      fetchData()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const toggleActive = async (u) => {
    try {
      if (u.isActive) { await api.deactivateUser(u._id); toast.success(`${u.name} deactivated`) }
      else { await api.updateUser(u._id, { isActive: true }); toast.success(`${u.name} reactivated`) }
      fetchData()
    } catch (err) { toast.error(err.message) }
  }

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const activeCount = users.filter(u => u.isActive).length

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      <SectionCard
        title="Team Members"
        subtitle={`${activeCount} active · ${users.length} total`}
        actions={<button className="btn btn-primary btn-sm gap-1.5" onClick={openCreate}><Plus size={14} /> Add Member</button>}>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
            <input className="input pl-9 text-sm" placeholder="Search by name or email…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input text-sm sm:w-44" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-fg-3 text-center py-8">No team members found</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.sort((a, b) => (ROLE_LEVEL[b.role] ?? 0) - (ROLE_LEVEL[a.role] ?? 0)).map(u => (
              <div key={u._id} className={`flex items-center gap-3 py-3 ${!u.isActive ? 'opacity-50' : ''}`}>
                <Avatar name={u.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-fg">{u.name}</p>
                    {!u.isActive && <Badge variant="danger" className="text-[10px]">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-fg-3 truncate">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant="accent" className="text-[10px]">{ROLE_LABEL[u.role] ?? u.role}</Badge>
                    {u.departmentId && <Badge variant="neutral" className="text-[10px]">{u.departmentId.displayName}</Badge>}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button className="btn btn-ghost btn-sm text-xs" onClick={() => openEdit(u)}>Edit</button>
                  <button
                    className={`btn btn-ghost btn-sm text-xs ${u.isActive ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}
                    onClick={() => toggleActive(u)}>
                    {u.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Add/Edit modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editUser ? `Edit ${editUser.name}` : 'Add Team Member'}
        size="sm"
        footer={
          <><button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editUser ? 'Save Changes' : 'Create Member'}
          </button></>
        }>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-fg-2 mb-1">Full Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          {!editUser && (
            <>
              <div>
                <label className="block text-xs font-medium text-fg-2 mb-1">Email *</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-2 mb-1">Password *</label>
                <input type="password" className="input" placeholder="Temporary password"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-fg-2 mb-1">Role</label>
              <select className="input text-sm" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-2 mb-1">Department</label>
              <select className="input text-sm" value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
                <option value="">None</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.displayName}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-fg-2 mb-1">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-2 mb-1">Base Salary (₹)</label>
              <input type="number" className="input" placeholder="Monthly salary" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Security ─────────────────────────────────────────────────
function SecuritySection() {
  const { toast } = useToast()
  const { logout } = useAuth()
  const [revoking, setRevoking] = useState(false)

  const handleRevokeAll = async () => {
    if (!confirm('Sign out of all devices? This will end all active sessions.')) return
    setRevoking(true)
    try {
      await api.revokeAllSessions()
      toast.success('All sessions revoked. Please sign in again.')
      setTimeout(() => logout(), 1500)
    } catch (err) {
      toast.error(err.message || 'Failed to revoke sessions')
    } finally { setRevoking(false) }
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Session Management" subtitle="Control access to your account across all devices">
        <div className="space-y-4">
          <p className="text-sm text-fg-2">
            Signing out of all devices will immediately invalidate all active sessions,
            including the current one. You will need to sign in again.
          </p>
          <button onClick={handleRevokeAll} disabled={revoking}
            className="btn btn-secondary text-sm gap-2"
            style={{ color: 'var(--color-danger, #ef4444)', borderColor: 'var(--color-danger, #ef4444)' }}>
            {revoking ? 'Revoking…' : 'Sign Out of All Devices'}
          </button>
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function SettingsPage() {
  const [active, setActive] = useState('appearance')
  const [themeId, setThemeId] = useState(() => localStorage.getItem('zrc-theme-id') ?? 'indigo')
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  return (
    <div className="space-y-5 animate-slide-up">
      <PageHeader title="Settings" subtitle="Manage your workspace, appearance, and account" />

      <div className="flex flex-col lg:flex-row gap-5">
        <div className="lg:w-52 flex-shrink-0">
          <div className="card p-2">
            {SETTINGS_NAV.map(item => (
              <button key={item.id} onClick={() => setActive(item.id)}
                className={`nav-item w-full text-left gap-2.5 ${active === item.id ? 'active' : ''}`}>
                <item.icon size={16} strokeWidth={active === item.id ? 2.2 : 1.8} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {active === 'appearance' && (
            <AppearanceSection currentThemeId={themeId} onThemeChange={setThemeId} isDark={isDark} onDarkChange={setIsDark} />
          )}
          {active === 'team' && <TeamSection />}
          {active === 'security' && <SecuritySection />}
          {active !== 'appearance' && active !== 'team' && active !== 'security' && (
            <div className="card p-8 text-center">
              <p className="text-fg-3">This section is under construction — coming soon!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
