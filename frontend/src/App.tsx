import './App.css'
import { useEffect, useState } from 'react'
import { LoginPage } from './components/LoginPage'
import { ProfileSelectionPage } from './components/ProfileSelectionPage'
import { apiRequest, type ApiUser, type AuthSession } from './lib/api'
import type { UserProfile } from './types/profile'

const profileByRole: Record<ApiUser['role'], UserProfile> = {
  RESIDENT: 'resident',
  ADMIN: 'administration',
  DIRECTOR: 'board',
  STAFF: 'operations',
}

function App() {
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
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
        onBack={() => setSelectedProfile(null)}
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
        }}
      />
    )
  }

  return <ProfileSelectionPage onSelectProfile={setSelectedProfile} />
}

export default App
