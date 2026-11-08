import type { UserProfile } from '../types/profile'

type ProfileIconProps = {
  profile: UserProfile
}

export function ProfileIcon({ profile }: ProfileIconProps) {
  if (profile === 'resident') {
    return (
      <svg aria-hidden="true" className="profile-icon" viewBox="0 0 24 24">
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" />
        <path d="M9 21v-6h6v6M7 10h.01M12 10h.01M17 10h.01" />
      </svg>
    )
  }

  if (profile === 'board') {
    return (
      <svg aria-hidden="true" className="profile-icon" viewBox="0 0 24 24">
        <rect height="13" rx="2" width="18" x="3" y="7" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
      </svg>
    )
  }

  if (profile === 'administration') {
    return (
      <svg aria-hidden="true" className="profile-icon" viewBox="0 0 24 24">
        <path d="m9.4 3.6.6 1.6a7.5 7.5 0 0 1 4 0l.6-1.6 2.1.9-.6 1.6a7.5 7.5 0 0 1 2.8 2.8l1.6-.6.9 2.1-1.6.6a7.5 7.5 0 0 1 0 4l1.6.6-.9 2.1-1.6-.6a7.5 7.5 0 0 1-2.8 2.8l.6 1.6-2.1.9-.6-1.6a7.5 7.5 0 0 1-4 0l-.6 1.6-2.1-.9.6-1.6a7.5 7.5 0 0 1-2.8-2.8l-1.6.6-.9-2.1 1.6-.6a7.5 7.5 0 0 1 0-4l-1.6-.6.9-2.1 1.6.6a7.5 7.5 0 0 1 2.8-2.8l-.6-1.6 2.1-.9Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className="profile-icon" viewBox="0 0 24 24">
      <path d="M4 8h16a1 1 0 0 1 1 1v10H3V9a1 1 0 0 1 1-1ZM8 8V5h8v3M3 12h18M10 12v2h4v-2" />
    </svg>
  )
}
