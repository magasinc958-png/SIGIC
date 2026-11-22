import { ProfileCard } from './ProfileCard'
import { profiles, type ProfileDetails, type UserProfile } from '../types/profile'

type ProfileSelectionPageProps = {
  onSelectProfile: (profile: UserProfile) => void
  onBack: () => void
  onDemo: (role: 'RESIDENT' | 'ADMIN') => void
}

export function ProfileSelectionPage({ onSelectProfile, onBack, onDemo }: ProfileSelectionPageProps) {
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

        <div className="selection-demo" aria-label="Recorridos de demostración">
          <p>Explorar sin iniciar sesión: modo DEMO, sin conexión a datos reales.</p>
          <div><button onClick={() => onDemo('RESIDENT')} type="button">Demo de residente</button><button onClick={() => onDemo('ADMIN')} type="button">Demo de administración</button></div>
        </div>

        <footer className="support-note selection-support">
          <span>¿Tienes problemas para acceder? Contacta al administrador:</span>
          <a href="mailto:soporte@sigic.com">soporte@sigic.com</a>
        </footer>
      </section>
    </main>
  )
}
