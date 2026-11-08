import { ProfileIcon } from './ProfileIcon'
import type { ProfileDetails } from '../types/profile'

type ProfileCardProps = {
  profile: ProfileDetails
  onSelect: (profile: ProfileDetails) => void
}

export function ProfileCard({ profile, onSelect }: ProfileCardProps) {
  return (
    <button
      className="profile-card"
      onClick={() => onSelect(profile)}
      type="button"
    >
      <span className="profile-card__icon" aria-hidden="true">
        <ProfileIcon profile={profile.id} />
      </span>
      <span className="profile-card__copy">
        <span className="profile-card__title">{profile.name}</span>
        <span className="profile-card__description">{profile.description}</span>
      </span>
      <span className="profile-card__action">
        {profile.loginLabel}
        <svg aria-hidden="true" className="arrow-icon" viewBox="0 0 24 24">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  )
}
