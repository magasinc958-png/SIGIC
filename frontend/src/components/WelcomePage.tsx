type WelcomePageProps = {
  onStart: () => void
}

const steps = [
  { number: '01', title: 'REPORTA', description: 'Haz visible lo que ocurre.' },
  { number: '02', title: 'SIGUE', description: 'Conoce cada avance.' },
  { number: '03', title: 'MEJORA', description: 'Construyamos soluciones.' },
]

export function WelcomePage({ onStart }: WelcomePageProps) {
  return (
    <main className="welcome-page">
      <header className="welcome-topbar">
        <div className="welcome-brand" aria-label="SIGIC">
          <span className="welcome-brand__name">SIGIC</span>
          <span className="welcome-brand__tagline">Gestión Comunitaria</span>
        </div>
        <span className="welcome-topbar__institution">ASOCEINORT · CEIBOS NORTE</span>
      </header>

      <div className="welcome-layout" id="inicio">
        <section className="welcome-intro" aria-labelledby="welcome-title">
          <div className="welcome-orbit welcome-orbit--large" aria-hidden="true" />
          <div className="welcome-orbit welcome-orbit--small" aria-hidden="true" />
          <div className="welcome-intro__content">
            <p className="welcome-eyebrow">ASOCEINORT presenta · SIGIC</p>
            <h1 id="welcome-title">Tu comunidad<br />merece respuestas.</h1>
            <p className="welcome-description">Reporta una incidencia, conoce su avance y participa en una comunidad donde cada problema recibe atención.</p>
            <div className="welcome-steps">
              {steps.map((step) => (
                <article className="welcome-step" key={step.number}>
                  <span className="welcome-step__number">{step.number}</span>
                  <h2>{step.title}</h2>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="welcome-card" aria-labelledby="welcome-card-title">
          <p className="welcome-card__eyebrow">Bienvenido a SIGIC</p>
          <h2 id="welcome-card-title">Tu voz puede<br />cambiar las cosas.</h2>
          <p className="welcome-card__description">Accede al portal de gestión comunitaria de ASOCEINORT.</p>
          <button className="welcome-button welcome-button--primary" type="button">Registrarse</button>
          <button className="welcome-button welcome-button--secondary" type="button" onClick={onStart}>Iniciar sesión</button>
          <p className="welcome-card__footnote">Cada reporte es un paso hacia una solución.</p>
        </section>
      </div>

      <footer className="welcome-footer">
        <p>¿Tienes problemas para acceder? Contacta al administrador: <a href="mailto:soporte@sigic.com">soporte@sigic.com</a></p>
        <span>SIGIC × ASOCEINORT</span>
      </footer>
    </main>
  )
}
