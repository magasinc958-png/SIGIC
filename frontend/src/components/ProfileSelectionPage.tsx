import { ProfileCard } from './ProfileCard'
import { profiles, type ProfileDetails, type UserProfile } from '../types/profile'

type ProfileSelectionPageProps = {
  onSelectProfile: (profile: UserProfile) => void
  onBack: () => void
}

export function ProfileSelectionPage({ onSelectProfile, onBack }: ProfileSelectionPageProps) {
  const handleSelectProfile = (profile: ProfileDetails) => onSelectProfile(profile.id)
  const availableProfiles = profiles.filter(({ id }) => id === 'resident' || id === 'administration')

  return (
    <main className="selection-page">
      <section className="selection-content" aria-labelledby="profile-heading">
        <button className="selection-back" onClick={onBack} type="button">← Volver al inicio</button>
        <header className="selection-header">
          <div className="selection-brand" aria-label="SIGIC, Gestión Comunitaria">
            <span>SIGIC</span>
            <small>Gestión Comunitaria</small>
          </div>
          <p className="selection-eyebrow">ASOCEINORT · CEIBOS NORTE</p>
          <h1 id="profile-heading">Selecciona tu perfil para continuar</h1>
          <p className="selection-subtitle">Elige el perfil que corresponde para ingresar al portal.</p>
        </header>

        <div className="profile-grid" id="perfiles">
          {availableProfiles.map((profile) => (
            <ProfileCard key={profile.id} onSelect={handleSelectProfile} profile={profile} />
          ))}
        </div>

        <footer className="support-note selection-support">
          <span>¿Tienes problemas para acceder? Contacta al administrador:</span>
          <a href="mailto:soporte@sigic.com">soporte@sigic.com</a>
        </footer>
      </section>
    </main>
  )
}
