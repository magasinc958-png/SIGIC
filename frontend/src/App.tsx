import './App.css'
import { useState } from 'react'
import { LoginPage } from './components/LoginPage'
import { ProfileSelectionPage } from './components/ProfileSelectionPage'
import type { UserProfile } from './types/profile'

function App() {
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)

  if (selectedProfile) {
    return (
      <LoginPage
        profile={selectedProfile}
        onBack={() => setSelectedProfile(null)}
      />
    )
  }

  return <ProfileSelectionPage onSelectProfile={setSelectedProfile} />
}

export default App
