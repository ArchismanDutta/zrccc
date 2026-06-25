import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from './api'
import { disconnectSocket } from './socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getMe()
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.login(email, password)
    setUser(res.data.user)
    return res.data
  }, [])

  const logout = useCallback(async () => {
    try { await api.logout() } catch (_) {}
    disconnectSocket()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const res = await api.getMe()
    setUser(res.data)
    return res.data
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
