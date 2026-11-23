import './App.css'
import { useState } from 'react'
import { useEffect } from 'react'
import { AuthenticatedHome } from './components/AuthenticatedHome'
import { useAuth } from './auth/AuthContext'
import { LoginPage } from './components/LoginPage'
import { ProfileSelectionPage } from './components/ProfileSelectionPage'
import type { UserProfile } from './types/profile'

function App() {
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [path, setPath] = useState(window.location.pathname)
  const { session, isHydrating, sessionMessage } = useAuth()

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (isHydrating) return
    const expectedPath = session ? {
      RESIDENTE: '/residente',
      ADMINISTRACION: '/administracion',
      DIRECTIVA: '/directiva',
    }[session.user.rol] : '/'
    if (path !== expectedPath) {
      window.history.replaceState({}, '', expectedPath)
    }
  }, [isHydrating, path, session])

  if (isHydrating) {
    return <main className="selection-page"><section className="selection-content"><div className="brand-mark"><span className="brand-mark__name">SIGIC</span><span className="brand-mark__tagline">Gestion Comunitaria</span></div><p>Validando sesión...</p></section></main>
  }

  if (session) return <AuthenticatedHome />

  if (selectedProfile) {
    return (
      <LoginPage
        profile={selectedProfile}
        onBack={() => setSelectedProfile(null)}
      />
    )
  }

  return <ProfileSelectionPage message={sessionMessage} onSelectProfile={setSelectedProfile} />
}

export default App
