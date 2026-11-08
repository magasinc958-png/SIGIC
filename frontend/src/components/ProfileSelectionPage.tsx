import { ProfileCard } from './ProfileCard'
import { profiles, type ProfileDetails, type UserProfile } from '../types/profile'

type ProfileSelectionPageProps = {
  onSelectProfile: (profile: UserProfile) => void
}

export function ProfileSelectionPage({
  onSelectProfile,
}: ProfileSelectionPageProps) {
  const handleSelectProfile = (profile: ProfileDetails) => {
    onSelectProfile(profile.id)
  }

  return (
    <main className="selection-page">
      <section className="selection-content" aria-labelledby="profile-heading">
        <header className="welcome-header">
          <div className="brand-mark" aria-label="SIGIC Gestión Comunitaria">
            <span className="brand-mark__name">SIGIC</span>
            <span className="brand-mark__tagline">Gestión Comunitaria</span>
          </div>
          <h1 id="profile-heading">Selecciona tu perfil para continuar</h1>
          <p>Acceda al perfil correcto segun su requerimiento</p>
        </header>

        <div className="profile-grid">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              onSelect={handleSelectProfile}
              profile={profile}
            />
          ))}
        </div>

        <footer className="support-note">
          <span>¿Tienes problemas para acceder? Contacta al administrador:</span>
          <a href="mailto:soporte@sigic.com">soporte@sigic.com</a>
        </footer>
      </section>
    </main>
  )
}
