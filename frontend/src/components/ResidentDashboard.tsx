import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, createIncident, getIncidentTypes, getMyIncident, getMyIncidents, type Incident, type IncidentType } from '../services/api'
import { useAuth } from '../auth/AuthContext'

type ResidentDashboardProps = { path: string; onNavigate: (path: string) => void }
const PAGE_SIZE = 10

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function statusLabel(status: Incident['estado']) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
}

function ApiMessage({ message }: { message: string }) {
  return <p className="auth-error-message" role="alert">{message}</p>
}

function Header({ onNavigate, onLogout, title }: { onNavigate: ResidentDashboardProps['onNavigate']; onLogout: () => void; title: string }) {
  return (
    <header className="resident-header">
      <button className="brand-mark resident-brand" onClick={() => onNavigate('/residente')} type="button">
        <span className="brand-mark__name">SIGIC</span>
        <span className="brand-mark__tagline">Gestión Comunitaria</span>
      </button>
      <div className="resident-header__actions">
        <span className="resident-header__title">{title}</span>
        <button className="text-button" onClick={onLogout} type="button">Cerrar sesión</button>
      </div>
    </header>
  )
}

function DashboardHome({ onNavigate }: { onNavigate: ResidentDashboardProps['onNavigate'] }) {
  const { session, logout } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!session) return () => { active = false }
    getMyIncidents(session.accessToken, 1, PAGE_SIZE)
      .then((result) => { if (active) { setIncidents(result.incidents); setTotal(result.pagination.total) } })
      .catch((reason: unknown) => {
        if (!active) return
        if (reason instanceof ApiError && reason.status === 401) logout('Tu sesión expiró. Inicia sesión nuevamente.')
        else setError(reason instanceof ApiError ? reason.message : 'No se pudieron cargar tus incidencias.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [logout, session])

  return (
    <main className="resident-page">
      <Header onNavigate={onNavigate} onLogout={() => logout()} title="Panel del residente" />
      <section className="resident-content" aria-labelledby="resident-heading">
        <div className="resident-welcome">
          <div><p className="eyebrow">Mi comunidad</p><h1 id="resident-heading">Hola, {session?.user.nombre}</h1><p>Consulta tus reportes o registra una nueva incidencia.</p></div>
          <button className="primary-action" onClick={() => onNavigate('/residente/incidents/new')} type="button">+ Nueva incidencia</button>
        </div>
        {error && <ApiMessage message={error} />}
        <div className="resident-summary-grid">
          <article className="summary-card summary-card--accent"><span>Total de mis reportes</span><strong>{loading ? '—' : total ?? 0}</strong><small>Total global informado por la API</small></article>
          <article className="summary-card"><span>Pendientes</span><strong>—</strong><small>La API aún no expone conteos por estado</small></article>
          <article className="summary-card"><span>En proceso</span><strong>—</strong><small>La API aún no expone conteos por estado</small></article>
          <article className="summary-card"><span>Resueltas</span><strong>—</strong><small>La API aún no expone conteos por estado</small></article>
        </div>
        <div className="resident-section-heading"><div><p className="eyebrow">Actividad</p><h2>Reportes recientes</h2></div><button className="text-button" onClick={() => onNavigate('/residente/incidents')} type="button">Ver todos</button></div>
        {loading ? <p className="resident-state">Cargando tus incidencias...</p> : incidents.length === 0 ? <div className="empty-state"><h3>Aún no tienes incidencias</h3><p>Cuando registres un reporte aparecerá aquí.</p><button className="primary-action" onClick={() => onNavigate('/residente/incidents/new')} type="button">Registrar primera incidencia</button></div> : <IncidentList incidents={incidents} onNavigate={onNavigate} />}
      </section>
    </main>
  )
}

function IncidentList({ incidents, onNavigate }: { incidents: Incident[]; onNavigate: ResidentDashboardProps['onNavigate'] }) {
  return <div className="incident-list">{incidents.map((incident) => <button className="incident-row" key={incident.id} onClick={() => onNavigate(`/residente/incidents/${incident.id}`)} type="button"><span className="incident-row__code">{incident.codigo}</span><span className="incident-row__main"><strong>{incident.titulo}</strong><small>{incident.tipo.nombre} · {formatDate(incident.fechaCreacion)}</small></span><span className={`status-pill status-pill--${incident.estado.toLowerCase()}`}>{statusLabel(incident.estado)}</span><span className="incident-row__arrow">›</span></button>)}</div>
}

function IncidentsPage({ onNavigate }: { onNavigate: ResidentDashboardProps['onNavigate'] }) {
  const { session, logout } = useAuth()
  const [data, setData] = useState<{ incidents: Incident[]; pagination: { page: number; limit: number; total: number; totalPages: number } } | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    if (!session) return () => { active = false }
    getMyIncidents(session.accessToken, page, PAGE_SIZE).then((result) => { if (active) setData(result) }).catch((reason: unknown) => { if (!active) return; if (reason instanceof ApiError && reason.status === 401) logout('Tu sesión expiró. Inicia sesión nuevamente.'); else setError(reason instanceof ApiError ? reason.message : 'No se pudieron cargar tus incidencias.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [logout, page, session])
  return <main className="resident-page"><Header onNavigate={onNavigate} onLogout={() => logout()} title="Mis incidencias" /><section className="resident-content" aria-labelledby="incidents-heading"><div className="resident-welcome"><div><p className="eyebrow">Historial personal</p><h1 id="incidents-heading">Mis incidencias</h1></div><button className="primary-action" onClick={() => onNavigate('/residente/incidents/new')} type="button">+ Nueva incidencia</button></div>{error && <ApiMessage message={error} />}{loading ? <p className="resident-state">Cargando tus incidencias...</p> : data && data.incidents.length > 0 ? <><IncidentList incidents={data.incidents} onNavigate={onNavigate} /><div className="pagination"><button className="text-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} type="button">Anterior</button><span>Página {data.pagination.page} de {data.pagination.totalPages || 1}</span><button className="text-button" disabled={page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)} type="button">Siguiente</button></div></> : <div className="empty-state"><h3>Aún no tienes incidencias</h3><p>Registra tu primer reporte para comenzar.</p></div>}</section></main>
}

function IncidentDetail({ id, onNavigate }: { id: string; onNavigate: ResidentDashboardProps['onNavigate'] }) {
  const { session, logout } = useAuth()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { let active = true; if (!session) return () => { active = false }; getMyIncident(session.accessToken, id).then((result) => { if (active) setIncident(result.incident) }).catch((reason: unknown) => { if (!active) return; if (reason instanceof ApiError && reason.status === 401) logout('Tu sesión expiró. Inicia sesión nuevamente.'); else setError(reason instanceof ApiError ? reason.message : 'No se pudo cargar el detalle.') }); return () => { active = false } }, [id, logout, session])
  return <main className="resident-page"><Header onNavigate={onNavigate} onLogout={() => logout()} title="Detalle de incidencia" /><section className="resident-content detail-content"> <button className="back-dashboard" onClick={() => onNavigate('/residente/incidents')} type="button">← Volver a mis incidencias</button>{error && <ApiMessage message={error} />}{!incident && !error ? <p className="resident-state">Cargando detalle...</p> : incident && <><div className="detail-heading"><div><span className="incident-row__code">{incident.codigo}</span><h1>{incident.titulo}</h1><p>{incident.tipo.nombre} · Registrada el {formatDate(incident.fechaCreacion)}</p></div><span className={`status-pill status-pill--${incident.estado.toLowerCase()}`}>{statusLabel(incident.estado)}</span></div><div className="detail-grid"><article className="detail-card"><h2>Descripción</h2><p>{incident.descripcion}</p></article><article className="detail-card"><h2>Ubicación</h2>{incident.ubicacion ? <p>{[incident.ubicacion.manzana && `Manzana ${incident.ubicacion.manzana}`, incident.ubicacion.villa && `Villa ${incident.ubicacion.villa}`, incident.ubicacion.calle, incident.ubicacion.referencia].filter(Boolean).join(' · ') || 'Sin referencias textuales'}{incident.ubicacion.latitud && <><br />Coordenadas: {incident.ubicacion.latitud}, {incident.ubicacion.longitud}</>}</p> : <p>No se registró ubicación.</p>}</article></div>{incident.historial && incident.historial.length > 0 && <article className="detail-card"><h2>Historial disponible</h2><div className="history-list">{incident.historial.map((event, index) => <div className="history-item" key={`${event.fechaEvento}-${index}`}><strong>{event.tipoAccion}</strong><span>{formatDate(event.fechaEvento)}</span>{event.observacion && <p>{event.observacion}</p>}</div>)}</div></article>}</>}</section></main>
}

function NewIncidentPage({ onNavigate }: { onNavigate: ResidentDashboardProps['onNavigate'] }) {
  const { session, logout } = useAuth()
  const [types, setTypes] = useState<IncidentType[]>([])
  const [form, setForm] = useState({ idTipo: '', titulo: '', descripcion: '', manzana: '', villa: '', calle: '', referencia: '', latitud: '', longitud: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<Incident | null>(null)
  useEffect(() => { let active = true; if (!session) return () => { active = false }; getIncidentTypes(session.accessToken).then((result) => { if (active) setTypes(result.types) }).catch((reason: unknown) => { if (!active) return; if (reason instanceof ApiError && reason.status === 401) logout('Tu sesión expiró. Inicia sesión nuevamente.'); else setError(reason instanceof ApiError ? reason.message : 'No se pudieron cargar los tipos de incidencia.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [logout, session])
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }))
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(''); const hasText = [form.manzana, form.villa, form.calle, form.referencia].some(Boolean); const hasCoordinates = Boolean(form.latitud || form.longitud); if (!form.idTipo || form.titulo.trim().length < 3 || form.descripcion.trim().length < 10) { setError('Completa el tipo, un título de al menos 3 caracteres y una descripción de al menos 10 caracteres.'); return } if (!hasText && !hasCoordinates) { setError('Indica una dirección, referencia o coordenadas.'); return } if (Boolean(form.latitud) !== Boolean(form.longitud)) { setError('La latitud y longitud deben enviarse juntas.'); return } const latitud = form.latitud ? Number(form.latitud) : undefined; const longitud = form.longitud ? Number(form.longitud) : undefined; if ((latitud !== undefined && (!Number.isFinite(latitud) || latitud < -90 || latitud > 90)) || (longitud !== undefined && (!Number.isFinite(longitud) || longitud < -180 || longitud > 180))) { setError('Las coordenadas no son válidas.'); return } if (!session) return; setSubmitting(true); try { const result = await createIncident(session.accessToken, { titulo: form.titulo.trim(), descripcion: form.descripcion.trim(), idTipo: Number(form.idTipo), ubicacion: { ...(form.manzana && { manzana: form.manzana.trim() }), ...(form.villa && { villa: form.villa.trim() }), ...(form.calle && { calle: form.calle.trim() }), ...(form.referencia && { referencia: form.referencia.trim() }), ...(latitud !== undefined && { latitud, longitud }) } }); setSuccess(result.incident) } catch (reason: unknown) { if (reason instanceof ApiError && reason.status === 401) logout('Tu sesión expiró. Inicia sesión nuevamente.'); else setError(reason instanceof ApiError ? reason.message : 'No se pudo registrar la incidencia.') } finally { setSubmitting(false) } }
  if (success) return <main className="resident-page"><Header onNavigate={onNavigate} onLogout={() => logout()} title="Nueva incidencia" /><section className="resident-content"><div className="success-state"><div className="success-icon">✓</div><h1>Incidencia registrada</h1><p>Tu reporte <strong>{success.codigo}</strong> fue creado correctamente.</p><button className="primary-action" onClick={() => onNavigate(`/residente/incidents/${success.id}`)} type="button">Consultar reporte</button><button className="text-button" onClick={() => onNavigate('/residente')} type="button">Volver al panel</button></div></section></main>
  return <main className="resident-page"><Header onNavigate={onNavigate} onLogout={() => logout()} title="Nueva incidencia" /><section className="resident-content form-content"><button className="back-dashboard" onClick={() => onNavigate('/residente')} type="button">← Volver al panel</button><div className="form-intro"><p className="eyebrow">Nuevo reporte</p><h1>¿Qué sucede en tu comunidad?</h1><p>Completa la información para que podamos dar seguimiento a tu incidencia.</p></div>{error && <ApiMessage message={error} />}{loading ? <p className="resident-state">Cargando tipos de incidencia...</p> : <form className="incident-form" onSubmit={submit}><label>Tipo de incidencia<select value={form.idTipo} onChange={(event) => update('idTipo', event.target.value)}><option value="">Selecciona una categoría</option>{types.map((type) => <option key={type.id} value={type.id}>{type.nombre}</option>)}</select></label><label>Título<input maxLength={160} onChange={(event) => update('titulo', event.target.value)} placeholder="Ej. Fuga de agua en la calle principal" value={form.titulo} /></label><label>Descripción<textarea maxLength={5000} onChange={(event) => update('descripcion', event.target.value)} placeholder="Describe lo que ocurre y cualquier detalle útil..." rows={5} value={form.descripcion} /></label><fieldset><legend>Ubicación</legend><div className="form-columns"><label>Manzana<input maxLength={50} onChange={(event) => update('manzana', event.target.value)} value={form.manzana} /></label><label>Villa<input maxLength={50} onChange={(event) => update('villa', event.target.value)} value={form.villa} /></label></div><label>Calle<input maxLength={100} onChange={(event) => update('calle', event.target.value)} value={form.calle} /></label><label>Referencia adicional<input maxLength={255} onChange={(event) => update('referencia', event.target.value)} placeholder="Punto de referencia" value={form.referencia} /></label><div className="form-columns"><label>Latitud<input inputMode="decimal" onChange={(event) => update('latitud', event.target.value)} placeholder="Opcional" value={form.latitud} /></label><label>Longitud<input inputMode="decimal" onChange={(event) => update('longitud', event.target.value)} placeholder="Opcional" value={form.longitud} /></label></div><button className="text-button location-button" onClick={() => { if (!navigator.geolocation) { setError('Tu navegador no permite capturar ubicación.'); return } navigator.geolocation.getCurrentPosition((position) => { update('latitud', String(position.coords.latitude)); update('longitud', String(position.coords.longitude)) }, () => setError('No se pudo obtener tu ubicación. Puedes ingresarla manualmente.')) }} type="button">Usar mi ubicación actual</button></fieldset><button className="primary-action primary-action--wide" disabled={submitting} type="submit">{submitting ? 'Registrando...' : 'Registrar incidencia'}</button></form>}</section></main>
}

export function ResidentDashboard({ path, onNavigate }: ResidentDashboardProps) {
  const detailMatch = path.match(/^\/residente\/incidents\/(\d+)$/)
  if (path === '/residente/incidents/new') return <NewIncidentPage onNavigate={onNavigate} />
  if (detailMatch) return <IncidentDetail id={detailMatch[1]} onNavigate={onNavigate} />
  if (path === '/residente/incidents') return <IncidentsPage onNavigate={onNavigate} />
  return <DashboardHome onNavigate={onNavigate} />
}
