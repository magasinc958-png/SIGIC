/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, getCurrentUser, login as loginRequest, type AuthUser } from '../services/api'
import { profileRoles, type UserProfile } from '../types/profile'

const SESSION_KEY = 'sigic.session'
type StoredSession = { accessToken: string; user: AuthUser }
type AuthContextValue = {
  session: StoredSession | null
  isHydrating: boolean
  sessionMessage: string
  login: (email: string, password: string, selectedProfile: UserProfile) => Promise<void>
  logout: (message?: string) => void
}
const AuthContext = createContext<AuthContextValue | null>(null)

function readSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as StoredSession
    return session.accessToken && session.user?.id && session.user?.rol ? session : null
  } catch {
    return null
  }
}

function persistSession(session: StoredSession | null) {
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else sessionStorage.removeItem(SESSION_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(readSession)
  const [isHydrating, setIsHydrating] = useState(true)
  const [sessionMessage, setSessionMessage] = useState('')

  const logout = useCallback((message = '') => {
    persistSession(null)
    setSession(null)
    setSessionMessage(message)
  }, [])

  useEffect(() => {
    let active = true
    if (!session?.accessToken) {
      queueMicrotask(() => { if (active) setIsHydrating(false) })
      return () => { active = false }
    }
    getCurrentUser(session.accessToken)
      .then(({ user }) => {
        if (!active) return
        const next = { accessToken: session.accessToken, user }
        persistSession(next)
        setSession(next)
      })
      .catch((error: unknown) => {
        if (!active) return
        logout(error instanceof ApiError && error.status === 401 ? 'Tu sesión expiró. Inicia sesión nuevamente.' : 'No se pudo validar tu sesión.')
      })
      .finally(() => { if (active) setIsHydrating(false) })
    return () => { active = false }
  }, [logout, session?.accessToken])

  const login = useCallback(async (email: string, password: string, selectedProfile: UserProfile) => {
    const result = await loginRequest(email, password)
    if (result.user.rol !== profileRoles[selectedProfile]) {
      logout('El perfil seleccionado no coincide con el rol de esta cuenta.')
      throw new ApiError(403, 'El perfil seleccionado no coincide con el rol de esta cuenta.')
    }
    const next = { accessToken: result.accessToken, user: result.user }
    persistSession(next)
    setIsHydrating(true)
    setSession(next)
    setSessionMessage('')
  }, [logout])

  const value = useMemo(() => ({ session, isHydrating, sessionMessage, login, logout }), [session, isHydrating, sessionMessage, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider')
  return context
}
