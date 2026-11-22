import { ProfileIcon } from './ProfileIcon'
import type { ProfileDetails } from '../types/profile'

type ProfileCardProps = {
  profile: ProfileDetails
  onSelect: (profile: ProfileDetails) => void
}

export function ProfileCard({ profile, onSelect }: ProfileCardProps) {
  const profileNumber = profile.id === 'resident' ? '01' : profile.id === 'administration' ? '02' : '03'

  return (
    <button
      className="profile-card"
      onClick={() => onSelect(profile)}
      type="button"
    >
      <span className={`profile-card__banner profile-card__banner--${profile.id}`}>
        <span className="profile-card__audience">Para {profile.name.toLocaleLowerCase('es')}</span>
        <span className="profile-card__watermark" aria-hidden="true">{profileNumber}</span>
        <span className="profile-card__banner-title">{profile.id === 'resident' ? 'Tu comunidad, más cerca.' : 'Todo bajo control, en un solo lugar.'}</span>
      </span>
      <span className="profile-card__body">
        <span className="profile-card__icon" aria-hidden="true"><ProfileIcon profile={profile.id} /></span>
        <span className="profile-card__copy">
          <span className="profile-card__title">{profile.name}</span>
          <span className="profile-card__description">{profile.description}</span>
        </span>
        <span className="profile-card__action">
          {profile.loginLabel}
          <svg aria-hidden="true" className="arrow-icon" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </span>
      </span>
    </button>
  )
}
