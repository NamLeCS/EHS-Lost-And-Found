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
  register: (
    email: string,
    password: string,
    asAdmin: boolean,
  ) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function buildUserFromLogin(email: string, pending: ReturnType<typeof readPendingIdentity>) {
  if (pending && pending.email.toLowerCase() === email.toLowerCase()) {
    return {
      id: pending.id,
      username: pending.email,
      is_admin: pending.role === 'admin',
    } satisfies AuthUser
  }
  const existing = loadAuthFromStorage()
  if (
    existing?.user?.username &&
    existing.user.username.toLowerCase() === email.toLowerCase()
  ) {
    return existing.user
  }
  return {
    id: 0,
    username: email,
    is_admin: false,
  } satisfies AuthUser
}

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
    const t = await loginRequest(email, password)
    const pending = readPendingIdentity()
    const u = buildUserFromLogin(email, pending)
    if (pending && pending.email.toLowerCase() === email.toLowerCase()) {
      clearPendingIdentity()
    }
    saveAuth(t, u)
    setToken(t)
    setUser(u)
  }, [])

  const register = useCallback(
    async (email: string, password: string, asAdmin: boolean) => {
      const data = await registerRequest(email, password, asAdmin ? 'admin' : 'student')
      savePendingIdentity({
        id: data.id,
        email: data.email,
        role: data.role,
      })
    },
    [],
  )

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
