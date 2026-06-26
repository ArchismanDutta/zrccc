import { useState } from 'react'
import { User, Lock, Save } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/api'

export default function PortalSettings() {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()

  const [profileForm, setProfileForm] = useState({ name: user?.name || '' })
  const [profileSaving, setProfileSaving] = useState(false)

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwSaving, setPwSaving] = useState(false)

  const handleProfileSave = async () => {
    if (!profileForm.name.trim()) { toast.error('Name is required'); return }
    setProfileSaving(true)
    try {
      await api.updateProfile({ name: profileForm.name.trim() })
      await refreshUser()
      toast.success('Profile updated')
    } catch (err) { toast.error(err.message || 'Failed to update profile') }
    finally { setProfileSaving(false) }
  }

  const handlePasswordSave = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) { toast.error('All password fields are required'); return }
    if (pwForm.newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return }
    setPwSaving(true)
    try {
      await api.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Password changed successfully')
    } catch (err) { toast.error(err.message || 'Failed to change password') }
    finally { setPwSaving(false) }
  }

  return (
    <div className="space-y-6 animate-slide-up max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-fg">Account Settings</h1>
        <p className="text-sm text-fg-3 mt-1">Manage your profile and security settings</p>
      </div>

      {/* Profile */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[var(--color-border)]">
          <User size={16} className="text-accent" />
          <p className="font-semibold text-sm text-fg">Profile</p>
        </div>

        <div className="flex items-center gap-4">
          <Avatar name={user?.name || 'Client'} size="lg" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">{user?.name}</p>
            <p className="text-xs text-fg-3 mt-0.5">{user?.email}</p>
            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-accent-ghost text-accent font-medium capitalize">
              Client
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-fg-2 mb-1.5">Display Name</label>
          <input
            className="input"
            value={profileForm.name}
            onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleProfileSave()}
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-fg-2 mb-1.5">Email</label>
          <input className="input opacity-60 cursor-not-allowed" value={user?.email || ''} disabled />
          <p className="text-[10px] text-fg-3 mt-1">Email cannot be changed. Contact support if needed.</p>
        </div>

        <button className="btn btn-primary btn-sm gap-1.5" onClick={handleProfileSave} disabled={profileSaving}>
          <Save size={13} /> {profileSaving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>

      {/* Password */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[var(--color-border)]">
          <Lock size={16} className="text-accent" />
          <p className="font-semibold text-sm text-fg">Change Password</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-fg-2 mb-1.5">Current Password</label>
          <input
            type="password"
            className="input"
            value={pwForm.currentPassword}
            onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
            placeholder="Enter current password"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-fg-2 mb-1.5">New Password</label>
          <input
            type="password"
            className="input"
            value={pwForm.newPassword}
            onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
            placeholder="Min. 8 characters"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-fg-2 mb-1.5">Confirm New Password</label>
          <input
            type="password"
            className="input"
            value={pwForm.confirmPassword}
            onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
            placeholder="Repeat new password"
            onKeyDown={e => e.key === 'Enter' && handlePasswordSave()}
          />
        </div>

        <button className="btn btn-primary btn-sm gap-1.5" onClick={handlePasswordSave} disabled={pwSaving}>
          <Lock size={13} /> {pwSaving ? 'Saving…' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}
