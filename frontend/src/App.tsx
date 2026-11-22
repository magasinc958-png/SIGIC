import './App.css'
import { useEffect, useState } from 'react'
import { LoginPage } from './components/LoginPage'
import { ProfileSelectionPage } from './components/ProfileSelectionPage'
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
  sigicScreen?: 'welcome' | 'profiles' | 'login'
  selectedProfile?: UserProfile | null
}

function App() {
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [activeScreen, setActiveScreen] = useState<'welcome' | 'profiles'>('welcome')
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

  const backToProfiles = () => {
    if ((window.history.state as SigicHistoryState | null)?.sigicScreen === 'login') {
      window.history.back()
      return
    }

    window.history.replaceState({ sigicScreen: 'profiles', selectedProfile: null }, '', '#profiles')
    setSelectedProfile(null)
    setActiveScreen('profiles')
  }

  const backToWelcome = () => {
    if ((window.history.state as SigicHistoryState | null)?.sigicScreen === 'profiles') {
      window.history.back()
      return
    }

    window.history.replaceState({ sigicScreen: 'welcome', selectedProfile: null }, '', window.location.pathname + window.location.search)
    setSelectedProfile(null)
    setActiveScreen('welcome')
  }

  if (isRestoringSession) {
    return (
      <main className="login-page">
        <p role="status">Verificando tu sesión…</p>
      </main>
    )
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
        onLogout={() => {
          sessionStorage.removeItem('sigic.accessToken')
          setSession(null)
          setSelectedProfile(null)
          setActiveScreen('profiles')
          window.history.replaceState({ sigicScreen: 'profiles', selectedProfile: null }, '', '#profiles')
        }}
      />
    )
  }

  if (activeScreen === 'welcome') {
    return <WelcomePage onStart={openProfiles} />
  }

  return <ProfileSelectionPage onSelectProfile={openLogin} onBack={backToWelcome} />
}

export default App
