import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser } from '../types/api'
import {
  clearAuth,
  clearPendingIdentity,
  loadAuthFromStorage,
  loginRequest,
  readPendingIdentity,
  saveAuth,
  savePendingIdentity,
  registerRequest,
} from '../lib/api'

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isReady: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    return loadAuthFromStorage()?.user ?? null
  })
  const [token, setToken] = useState<string | null>(() => {
    return loadAuthFromStorage()?.token ?? null
  })

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
    setToken(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const body = await loginRequest(email, password)
    const profile = body.user
    if (!profile) {
      throw new Error(
        'Server login response is missing user. Restart the API after updating the backend.',
      )
    }
    const { token } = body
    const u: AuthUser = {
      id: profile.id,
      username: profile.email,
      is_admin: profile.role === 'admin',
    }
    const pending = readPendingIdentity()
    if (pending && pending.email.toLowerCase() === email.toLowerCase()) {
      clearPendingIdentity()
    }
    saveAuth(token, u)
    setToken(token)
    setUser(u)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const data = await registerRequest(email, password, 'student')
    savePendingIdentity({
      id: data.id,
      email: data.email,
      role: data.role,
    })
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isReady: true,
      login,
      register,
      logout,
    }),
    [user, token, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- companion hook to AuthProvider
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
