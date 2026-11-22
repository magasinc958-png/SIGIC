import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { apiRequest, ApiRequestError } from '../lib/api'
import type { AdminUser, Incident, IncidentHistoryEntry, IncidentStatus } from '../types/domain'
import { statusLabels } from '../types/domain'

type IncidentDetailPageProps = {
  token: string
  incidentId: string
  isAdmin: boolean
  staff: AdminUser[]
  onBack: () => void
  onSessionExpired: () => void
  onUpdated: () => void
}

const transitions: Record<IncidentStatus, IncidentStatus[]> = {
  PENDING: ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['ATTENDED', 'REJECTED'],
  ATTENDED: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: [],
  REJECTED: [],
}

function toLocalDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function elapsedLabel(from: string, to: string | number = Date.now()) {
  const hours = Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 3_600_000))
  const days = Math.floor(hours / 24)
  return days ? `${days} d ${hours % 24} h` : `${hours} h`
}

export function IncidentDetailPage({ token, incidentId, isAdmin, staff, onBack, onSessionExpired, onUpdated }: IncidentDetailPageProps) {
  const [renderTime] = useState(() => Date.now())
  const [incident, setIncident] = useState<Incident | null>(null)
  const [history, setHistory] = useState<IncidentHistoryEntry[]>([])
  const [status, setStatus] = useState<IncidentStatus>('PENDING')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [{ incident: item }, { history: events }] = await Promise.all([
        apiRequest<{ incident: Incident }>(`/incidents/${incidentId}`, { headers }),
        apiRequest<{ history: IncidentHistoryEntry[] }>(`/incidents/${incidentId}/history`, { headers }),
      ])
      setIncident(item)
      setHistory([...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
      setStatus(item.status)
      setAssigneeId(item.assignee?.id ?? '')
      setDueAt(toLocalDateTime(item.dueAt))
    } catch (requestError) {
      if (requestError instanceof ApiRequestError && requestError.status === 401) onSessionExpired()
      else setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el detalle.')
    } finally {
      setIsLoading(false)
    }
  }, [incidentId, onSessionExpired, token])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!incident) return
    setError('')
    setNotice('')
    const body: { status?: IncidentStatus; assigneeId?: string | null; dueAt?: string | null; details: string } = {
      details: 'Actualización realizada desde el panel administrativo.',
    }
    if (status !== incident.status) body.status = status
    if (assigneeId !== (incident.assignee?.id ?? '')) body.assigneeId = assigneeId || null
    if (dueAt !== toLocalDateTime(incident.dueAt)) body.dueAt = dueAt ? new Date(dueAt).toISOString() : null
    if (Object.keys(body).length === 1) {
      setNotice('No hay cambios para guardar.')
      return
    }
    if (!window.confirm('¿Confirmas guardar los cambios de atención para esta incidencia?')) return
    setIsSaving(true)
    try {
      await apiRequest<{ incident: Incident }>(`/incidents/${incident.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      setNotice('Cambios guardados.')
      await load()
      onUpdated()
    } catch (requestError) {
      if (requestError instanceof ApiRequestError && requestError.status === 401) onSessionExpired()
      else setError(requestError instanceof Error ? requestError.message : 'No se pudieron guardar los cambios.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <section className="portal-page"><p role="status">Cargando incidencia…</p></section>
  if (!incident) return <section className="portal-page"><button className="text-button" onClick={onBack} type="button">← Volver a incidencias</button><p className="portal-alert portal-alert--error" role="alert">{error || 'No se encontró la incidencia.'}</p></section>

  return (
    <section className="portal-page" aria-labelledby="incident-detail-heading">
      <button className="text-button" onClick={onBack} type="button">← Volver a incidencias</button>
      <div className="portal-page-heading incident-heading">
        <p className="portal-eyebrow">Seguimiento · {incident.category.name}</p>
        <h1 id="incident-detail-heading">{incident.title}</h1>
        <span className={`status-badge status-badge--${incident.status.toLowerCase()}`}>{statusLabels[incident.status]}</span>
      </div>
      {error && <p className="portal-alert portal-alert--error" role="alert">{error}</p>}
      {notice && <p className="portal-alert portal-alert--success" role="status">{notice}</p>}
      <div className="incident-detail-grid">
        <article className="portal-panel incident-description">
          <h2>Descripción</h2>
          <p>{incident.description}</p>
          <dl className="incident-facts">
            <div><dt>Ubicación</dt><dd>{incident.address}{incident.latitude !== null && incident.longitude !== null && <a className="map-link" href={`https://www.openstreetmap.org/?mlat=${incident.latitude}&mlon=${incident.longitude}#map=17/${incident.latitude}/${incident.longitude}`} rel="noreferrer" target="_blank">Ver punto en el mapa ↗</a>}</dd></div>
            {incident.latitude !== null && incident.longitude !== null && <div><dt>Coordenadas</dt><dd>{incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}</dd></div>}
            <div><dt>Reportada</dt><dd>{formatDate(incident.createdAt)}</dd></div>
            {incident.reporter && <div><dt>Reportó</dt><dd>{incident.reporter.name}</dd></div>}
            <div><dt>Responsable</dt><dd>{incident.assignee?.name ?? 'Pendiente de asignación'}</dd></div>
            <div><dt>Fecha objetivo</dt><dd>{incident.dueAt ? formatDate(incident.dueAt) : 'Sin fecha definida'}</dd></div>
            <div><dt>Tiempo transcurrido</dt><dd>{elapsedLabel(incident.createdAt, incident.resolvedAt ?? renderTime)}</dd></div>
            {incident.dueAt && incident.status !== 'RESOLVED' && incident.status !== 'REJECTED' && <div><dt>Plazo</dt><dd><span className={`status-badge ${new Date(incident.dueAt).getTime() < renderTime ? 'status-badge--overdue' : 'status-badge--resolved'}`}>{new Date(incident.dueAt).getTime() < renderTime ? 'Vencida' : 'En plazo'}</span></dd></div>}
          </dl>
        </article>
        <section className="portal-panel history-panel" aria-labelledby="history-heading">
          <h2 id="history-heading">Historial de seguimiento</h2>
          {history.length === 0 ? <p className="empty-state">Aún no hay movimientos registrados.</p> : (
            <ol className="history-list">
              {history.map((entry) => <li key={entry.id}>
                <span className="history-dot" aria-hidden="true" />
                <div><strong>{entry.details || entry.action.replaceAll('_', ' ')}</strong>
                  {entry.fromStatus && entry.toStatus && <p>{statusLabels[entry.fromStatus]} → {statusLabels[entry.toStatus]}</p>}
                  <small>{entry.actor.name} · {formatDate(entry.createdAt)}</small>
                </div>
              </li>)}
            </ol>
          )}
          <p className="field-help">El historial es de solo lectura y no se puede eliminar desde el portal.</p>
        </section>
      </div>
      {isAdmin && (
        <form className="portal-panel management-form" onSubmit={save}>
          <div><p className="portal-eyebrow">Administración</p><h2>Gestionar incidencia</h2></div>
          <div className="management-fields">
            <div className="form-field"><label htmlFor="manage-status">Estado</label><select id="manage-status" onChange={(event) => setStatus(event.target.value as IncidentStatus)} value={status}><option value={incident.status}>{statusLabels[incident.status]} (actual)</option>{transitions[incident.status].map((next) => <option key={next} value={next}>{statusLabels[next]}</option>)}</select></div>
            <div className="form-field"><label htmlFor="manage-assignee">Personal operativo</label><select id="manage-assignee" onChange={(event) => setAssigneeId(event.target.value)} value={assigneeId}><option value="">Sin asignar</option>{staff.filter(({ active }) => active).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><span className="field-help">La API permite asignar a una persona de Staff, no a un área.</span></div>
            <div className="form-field"><label htmlFor="manage-due-date">Fecha y hora objetivo</label><input id="manage-due-date" onChange={(event) => setDueAt(event.target.value)} type="datetime-local" value={dueAt} /></div>
          </div>
          <button className="button-primary" disabled={isSaving} type="submit">{isSaving ? 'Guardando…' : 'Guardar cambios'}</button>
        </form>
      )}
    </section>
  )
}
