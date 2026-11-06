import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, apiKeyStorage } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!apiKeyStorage.get()) {
      setLoading(false)
      return
    }
    api
      .me()
      .then(setUser)
      .catch((err) => {
        if (err.status === 401) apiKeyStorage.clear()
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (apiKey) => {
    const me = await api.me(apiKey)
    apiKeyStorage.set(apiKey)
    setUser(me)
  }, [])

  const logout = useCallback(() => {
    apiKeyStorage.clear()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
