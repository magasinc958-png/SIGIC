import './App.css'
import { useCallback, useEffect, useState } from 'react'
import { LoginPage } from './components/LoginPage'
import { ProfileSelectionPage } from './components/ProfileSelectionPage'
import { PortalDashboard } from './components/PortalDashboard'
import { WelcomePage } from './components/WelcomePage'
import { apiRequest, type ApiUser, type AuthSession } from './lib/api'
import type { UserProfile } from './types/profile'

const profileByRole: Record<ApiUser['role'], UserProfile> = {
  RESIDENT: 'resident',
  ADMIN: 'administration',
  DIRECTOR: 'board',
  STAFF: 'operations',
}

type SigicHistoryState = {
  sigicScreen?: 'welcome' | 'profiles' | 'login' | 'demo'
  selectedProfile?: UserProfile | null
  demoRole?: 'RESIDENT' | 'ADMIN' | null
}

function App() {
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [activeScreen, setActiveScreen] = useState<'welcome' | 'profiles'>('welcome')
  const [demoRole, setDemoRole] = useState<'RESIDENT' | 'ADMIN' | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isRestoringSession, setIsRestoringSession] = useState(
    () => Boolean(sessionStorage.getItem('sigic.accessToken')),
  )

  useEffect(() => {
    const accessToken = sessionStorage.getItem('sigic.accessToken')
    if (!accessToken) return

    let active = true
    apiRequest<{ user: ApiUser }>('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(({ user }) => {
        if (!active) return
        setSession({ accessToken, user })
        setSelectedProfile(profileByRole[user.role])
      })
      .catch(() => {
        sessionStorage.removeItem('sigic.accessToken')
      })
      .finally(() => {
        if (active) setIsRestoringSession(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const initialState = (window.history.state ?? {}) as SigicHistoryState
    window.history.replaceState({ ...initialState, sigicScreen: 'welcome', selectedProfile: null }, '')

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as SigicHistoryState | null
      setActiveScreen(state?.sigicScreen === 'profiles' ? 'profiles' : 'welcome')
      setSelectedProfile(state?.sigicScreen === 'login' ? state.selectedProfile ?? null : null)
      setDemoRole(state?.sigicScreen === 'demo' ? state.demoRole ?? null : null)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const openProfiles = () => {
    window.history.pushState({ sigicScreen: 'profiles', selectedProfile: null }, '', '#profiles')
    setSelectedProfile(null)
    setActiveScreen('profiles')
  }

  const openLogin = (profile: UserProfile) => {
    window.history.pushState({ sigicScreen: 'login', selectedProfile: profile }, '', `#login/${profile}`)
    setSelectedProfile(profile)
  }

  const openDemo = (role: 'RESIDENT' | 'ADMIN') => {
    window.history.pushState({ sigicScreen: 'demo', demoRole: role }, '', `#demo/${role.toLowerCase()}`)
    setSelectedProfile(null)
    setDemoRole(role)
  }

  const backToProfiles = () => {
    if ((window.history.state as SigicHistoryState | null)?.sigicScreen === 'login') {
      window.history.back()
      return
    }

    window.history.replaceState({ sigicScreen: 'profiles', selectedProfile: null }, '', '#profiles')
    setSelectedProfile(null)
    setDemoRole(null)
    setActiveScreen('profiles')
  }

  const backToWelcome = () => {
    if ((window.history.state as SigicHistoryState | null)?.sigicScreen === 'profiles') {
      window.history.back()
      return
    }

    window.history.replaceState({ sigicScreen: 'welcome', selectedProfile: null }, '', window.location.pathname + window.location.search)
    setSelectedProfile(null)
    setDemoRole(null)
    setActiveScreen('welcome')
  }

  const expireSession = useCallback(() => {
    sessionStorage.removeItem('sigic.accessToken')
    setSession(null)
    setSelectedProfile(null)
    setDemoRole(null)
    setActiveScreen('profiles')
    window.history.replaceState({ sigicScreen: 'profiles', selectedProfile: null }, '', '#profiles')
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('sigic.accessToken')
    setSession(null)
    setSelectedProfile(null)
    setDemoRole(null)
    setActiveScreen('welcome')
    window.history.replaceState({ sigicScreen: 'welcome', selectedProfile: null }, '', window.location.pathname + window.location.search)
  }, [])

  if (isRestoringSession) {
    return (
      <main className="login-page">
        <p role="status">Verificando tu sesión…</p>
      </main>
    )
  }

  if (demoRole) {
    return <PortalDashboard key={`demo-${demoRole}`} session={null} demoRole={demoRole} onLogout={logout} onSessionExpired={expireSession} />
  }

  if (session) {
    if (session.user.role === 'RESIDENT' || session.user.role === 'ADMIN') {
      return <PortalDashboard key={session.user.id} session={session} onLogout={logout} onSessionExpired={expireSession} />
    }
    return <main className="login-page"><section className="login-card"><h1>Este rol no está incluido en los Sprints 1 y 2.</h1><p>La sesión y los permisos siguen determinados por el backend.</p><button className="submit-button" onClick={logout} type="button">Cerrar sesión</button></section></main>
  }

  if (selectedProfile) {
    return (
      <LoginPage
        profile={selectedProfile}
        onBack={backToProfiles}
        session={session}
        onAuthenticated={(authenticatedSession, remember) => {
          if (remember) {
            sessionStorage.setItem('sigic.accessToken', authenticatedSession.accessToken)
          } else {
            sessionStorage.removeItem('sigic.accessToken')
          }
          setSession(authenticatedSession)
        }}
        onLogout={logout}
      />
    )
  }

  if (activeScreen === 'welcome') {
    return <WelcomePage onStart={openProfiles} />
  }

  return <ProfileSelectionPage onSelectProfile={openLogin} onBack={backToWelcome} onDemo={openDemo} />
}

export default App
