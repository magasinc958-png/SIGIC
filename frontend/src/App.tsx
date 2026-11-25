import './App.css'
import { useEffect, useState } from 'react'
import { AuthenticatedHome } from './features/auth/AuthenticatedHome'
import { useAuth } from './features/auth/AuthContext'
import { LoginPage } from './features/auth/LoginPage'
import { ProfileSelectionPage } from './features/auth/ProfileSelectionPage'
import { AdminDashboard } from './features/admin/AdminDashboard'
import { DirectivaDashboard } from './features/directiva/DirectivaDashboard'
import { ResidentDashboard } from './features/resident/ResidentDashboard'
import type { UserProfile } from './types/profile'

function App() {
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [path, setPath] = useState(window.location.pathname)
  const { session, isHydrating, sessionMessage } = useAuth()
  const navigate = (nextPath: string) => {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (isHydrating) return
    const roleHome = session
      ? {
          RESIDENTE: '/residente',
          ADMINISTRACION: '/administracion',
          DIRECTIVA: '/directiva',
        }[session.user.rol]
      : '/'
    const isAllowedResidentPath = session?.user.rol === 'RESIDENTE' && path.startsWith('/residente')
    const isAllowedAdminPath = session?.user.rol === 'ADMINISTRACION' && path.startsWith('/administracion')
    const isAllowedDirectivaPath = session?.user.rol === 'DIRECTIVA' && path.startsWith('/directiva')
    if (path !== roleHome && !isAllowedResidentPath && !isAllowedAdminPath && !isAllowedDirectivaPath) {
      window.history.replaceState({}, '', roleHome)
    }
  }, [isHydrating, path, session])

  if (isHydrating) {
    return (
      <main className="selection-page">
        <section className="selection-content">
          <div className="brand-mark">
            <span className="brand-mark__name">SIGIC</span>
            <span className="brand-mark__tagline">Gestión Comunitaria</span>
          </div>
          <p>Validando sesión...</p>
        </section>
      </main>
    )
  }

  if (session?.user.rol === 'RESIDENTE') {
    return <ResidentDashboard path={path} onNavigate={navigate} />
  }

  if (session?.user.rol === 'ADMINISTRACION') {
    return <AdminDashboard path={path} onNavigate={navigate} />
  }

  if (session?.user.rol === 'DIRECTIVA') {
    return <DirectivaDashboard path={path} onNavigate={navigate} />
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
