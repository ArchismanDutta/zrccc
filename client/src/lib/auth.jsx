import { createContext, useContext, useState, useEffect } from 'react'
import api from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = api.getToken()
    if (token) {
      api.getMe().then(res => { setUser(res.data); setLoading(false) })
        .catch(() => { api.setToken(null); setLoading(false) })
    } else { setLoading(false) }
  }, [])

  const login = async (email, password) => {
    const res = await api.login(email, password)
    api.setToken(res.data.accessToken)
    setUser(res.data.user)
    return res.data
  }

  const logout = () => { api.setToken(null); setUser(null) }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
