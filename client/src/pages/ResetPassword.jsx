import { useState } from 'react'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import api from '@/lib/api'

export default function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4" style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>Z</div>
            <h1 className="text-xl font-bold text-fg">ZRC Media Network</h1>
          </div>
          <div className="card p-6 text-center space-y-4">
            <p className="font-medium text-fg">Invalid reset link</p>
            <p className="text-sm text-fg-2">This password reset link is invalid or has expired.</p>
            <button
              type="button"
              onClick={() => window.location.href = '/forgot-password'}
              className="text-xs text-accent hover:underline">
              Request a new reset link
            </button>
          </div>
          <p className="text-center text-[11px] text-fg-3 mt-6">© 2026 ZRC Media Network. All rights reserved.</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await api.resetPassword(token, password)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4" style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>Z</div>
          <h1 className="text-xl font-bold text-fg">ZRC Media Network</h1>
          <p className="text-sm text-fg-3 mt-1">Set a new password</p>
        </div>

        {success ? (
          <div className="card p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
              <KeyRound size={22} className="text-accent" />
            </div>
            <div>
              <p className="font-medium text-fg">Password reset</p>
              <p className="text-sm text-fg-2 mt-1">
                Your password has been reset. You can now log in.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.href = '/'}
              className="btn btn-primary w-full gap-2 py-2.5">
              Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            {error && (
              <div className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-fg-2 mb-1.5">New password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-fg-2 mb-1.5">Confirm new password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg">
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full gap-2 py-2.5">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <KeyRound size={16} />}
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => window.location.href = '/'}
                className="text-xs text-accent hover:underline">
                Back to sign in
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-[11px] text-fg-3 mt-6">© 2026 ZRC Media Network. All rights reserved.</p>
      </div>
    </div>
  )
}
