import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { LogIn, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4" style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>Z</div>
          <h1 className="text-xl font-bold text-fg">ZRC Media Network</h1>
          <p className="text-sm text-fg-3 mt-1">Sign in to your CRM dashboard</p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-fg-2 mb-1.5">Email</label>
            <input className="input" type="email" placeholder="you@zrcmedia.in" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>

          <div>
            <label className="block text-xs font-medium text-fg-2 mb-1.5">Password</label>
            <div className="relative">
              <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full gap-2 py-2.5">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn size={16} />}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-[11px] text-fg-3 mt-6">© 2026 ZRC Media Network. All rights reserved.</p>
      </div>
    </div>
  )
}
