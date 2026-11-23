import { useAuth } from '../auth/AuthContext'
import { getProfileDetails, roleProfiles } from '../types/profile'

export function AuthenticatedHome() {
  const { session, logout } = useAuth()
  if (!session) return null
  const profile = getProfileDetails(roleProfiles[session.user.rol])
  return (
    <main className="authenticated-page">
      <section className="authenticated-card" aria-labelledby="authenticated-heading">
        <div className="brand-mark" aria-label="SIGIC Gestion Comunitaria">
          <span className="brand-mark__name">SIGIC</span>
          <span className="brand-mark__tagline">Gestion Comunitaria</span>
        </div>
        <p className="role-badge">Perfil: {profile.name}</p>
        <h1 id="authenticated-heading">Bienvenido, {session.user.nombre}</h1>
        <p>Tu sesión está activa. Las funciones de este perfil estarán disponibles en las siguientes etapas.</p>
        <button className="submit-button" onClick={() => logout()} type="button">Cerrar sesión</button>
      </section>
    </main>
  )
}
