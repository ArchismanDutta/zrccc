import { useState } from 'react'
import { Mail } from 'lucide-react'
import api from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.forgotPassword(email)
    } catch {
      // swallow errors — always show the same success message to avoid leaking
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4" style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>Z</div>
          <h1 className="text-xl font-bold text-fg">ZRC Media Network</h1>
          <p className="text-sm text-fg-3 mt-1">Reset your password</p>
        </div>

        {submitted ? (
          <div className="card p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
              <Mail size={22} className="text-accent" />
            </div>
            <div>
              <p className="font-medium text-fg">Check your email</p>
              <p className="text-sm text-fg-2 mt-1">
                If that email is registered, you'll receive a reset link shortly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.href = '/'}
              className="text-xs text-accent hover:underline">
              Back to sign in
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
              <label className="block text-xs font-medium text-fg-2 mb-1.5">Email address</label>
              <input
                className="input"
                type="email"
                placeholder="you@zrcmedia.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full gap-2 py-2.5">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Mail size={16} />}
              {loading ? 'Sending…' : 'Send Reset Link'}
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
