import { useState, type FormEvent } from 'react'
import { getProfileDetails, type UserProfile } from '../types/profile'

type LoginPageProps = {
  profile: UserProfile
  onBack: () => void
}

type FormErrors = {
  email?: string
  password?: string
}

export function LoginPage({ profile, onBack }: LoginPageProps) {
  const profileDetails = getProfileDetails(profile)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unavailableMessage, setUnavailableMessage] = useState('')

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {}

    if (!email.trim()) {
      nextErrors.email = 'Ingresa tu correo electrónico.'
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = 'Ingresa un correo electrónico válido.'
    }

    if (!password) {
      nextErrors.password = 'Ingresa tu contraseña.'
    }

    return nextErrors
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUnavailableMessage('')

    const nextErrors = validate()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)
    window.setTimeout(() => {
      setIsSubmitting(false)
      setUnavailableMessage(
        'La autenticación todavía no está disponible. Este formulario es solo una vista de la Fase 1.',
      )
    }, 450)
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-heading">
        <header className="login-header">
          <div className="brand-mark" aria-label="SIGIC Gestión Comunitaria">
            <span className="brand-mark__name">SIGIC</span>
            <span className="brand-mark__tagline">Gestión Comunitaria</span>
          </div>
          <div className="role-badge" id="login-heading">
            Perfil: {profileDetails.name}
          </div>
        </header>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ejemplo@sigic.com"
              type="email"
              value={email}
            />
            {errors.email && (
              <span className="field-error" id="email-error" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="password">Contraseña</label>
            <div className="password-input-wrapper">
              <input
                aria-describedby={errors.password ? 'password-error' : undefined}
                aria-invalid={Boolean(errors.password)}
                autoComplete="current-password"
                id="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {errors.password && (
              <span className="field-error" id="password-error" role="alert">
                {errors.password}
              </span>
            )}
          </div>

          <div className="form-actions">
            <label className="remember-me">
              <input
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                type="checkbox"
              />
              <span>Recordarme</span>
            </label>
            <button className="forgot-password" type="button">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {unavailableMessage && (
            <p className="unavailable-message" role="status">
              {unavailableMessage}
            </p>
          )}

          <button className="submit-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Validando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <button className="back-link" onClick={onBack} type="button">
          <svg aria-hidden="true" className="arrow-icon arrow-icon--back" viewBox="0 0 24 24">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Volver a selección de perfil
        </button>
      </section>
    </main>
  )
}
