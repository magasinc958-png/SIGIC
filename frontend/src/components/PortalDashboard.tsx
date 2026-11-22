import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { apiRequest, ApiRequestError, type AuthSession } from '../lib/api'
import { IncidentDetailPage } from './IncidentDetailPage'
import { IncidentFormPage } from './IncidentFormPage'
import type { AdminUser, Announcement, Incident, IncidentCategory, IncidentStatus, IncidentSummary, NewIncidentInput } from '../types/domain'
import { incidentStatuses, statusLabels } from '../types/domain'
import './Portal.css'

type PortalDashboardProps = {
  session: AuthSession | null
  demoRole?: 'RESIDENT' | 'ADMIN'
  onLogout: () => void
  onSessionExpired: () => void
}

type PortalView = 'overview' | 'incidents' | 'create' | 'announcements' | 'detail'

const demoNow = Date.now()
const demoCategories: IncidentCategory[] = [
  { id: 'demo-category-lighting', name: 'Alumbrado', active: true },
  { id: 'demo-category-cleanliness', name: 'Limpieza', active: true },
  { id: 'demo-category-maintenance', name: 'Mantenimiento', active: true },
]
const demoIncidents: Incident[] = [
  { id: 'demo-incident-01', title: 'Luminaria apagada en el parque', description: 'La luminaria junto al sendero central permanece apagada durante la noche.', address: 'Parque central, junto al sendero', latitude: -2.1552, longitude: -79.9288, status: 'IN_PROGRESS', dueAt: new Date(demoNow + 86_400_000).toISOString(), resolvedAt: null, createdAt: new Date(demoNow - 3 * 86_400_000).toISOString(), updatedAt: new Date(demoNow - 86_400_000).toISOString(), category: demoCategories[0], reporter: { id: 'demo-resident', name: 'María Demo' }, assignee: { id: 'demo-staff', name: 'Equipo de mantenimiento' } },
  { id: 'demo-incident-02', title: 'Acumulación de hojas en la acera', description: 'Se acumularon hojas en la acera frente al área comunal.', address: 'Área comunal, acceso norte', latitude: null, longitude: null, status: 'PENDING', dueAt: null, resolvedAt: null, createdAt: new Date(demoNow - 6 * 86_400_000).toISOString(), updatedAt: new Date(demoNow - 6 * 86_400_000).toISOString(), category: demoCategories[1], reporter: { id: 'demo-resident', name: 'María Demo' }, assignee: null },
  { id: 'demo-incident-03', title: 'Reparación de banca', description: 'La banca de madera del sendero ya fue reparada.', address: 'Parque lineal, sector oeste', latitude: null, longitude: null, status: 'RESOLVED', dueAt: null, resolvedAt: new Date(demoNow - 86_400_000).toISOString(), createdAt: new Date(demoNow - 9 * 86_400_000).toISOString(), updatedAt: new Date(demoNow - 86_400_000).toISOString(), category: demoCategories[2], reporter: { id: 'demo-resident', name: 'María Demo' }, assignee: { id: 'demo-staff', name: 'Equipo de mantenimiento' } },
]
const demoAnnouncements: Announcement[] = [
  { id: 'demo-announcement-01', title: 'Jornada comunitaria', content: 'Este sábado tendremos una jornada de limpieza y cuidado de las áreas comunes.', publishedAt: new Date(demoNow - 2 * 86_400_000).toISOString(), author: { id: 'demo-admin', name: 'Administración DEMO' } },
]
const demoSummary: IncidentSummary = { total: 18, byStatus: { PENDING: 4, IN_PROGRESS: 6, ATTENDED: 2, RESOLVED: 5, REJECTED: 1 }, averageResolutionTimeHours: 31.5 }
const demoStaff: AdminUser[] = [{ id: 'demo-staff', name: 'Equipo de mantenimiento', email: 'demo@sigic.local', role: 'STAFF', active: true }]

const isAdmin = (session: AuthSession | null, demoRole?: 'RESIDENT' | 'ADMIN') => session ? session.user.role === 'ADMIN' : demoRole === 'ADMIN'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(new Date(value))
}

function statusClass(status: IncidentStatus) {
  return `status-badge status-badge--${status.toLowerCase()}`
}

export function PortalDashboard({ session, demoRole, onLogout, onSessionExpired }: PortalDashboardProps) {
  const admin = isAdmin(session, demoRole)
  const token = session?.accessToken ?? ''
  const userName = session?.user.name ?? 'Usuario de demostración'
  const [view, setView] = useState<PortalView>('overview')
  const [selectedIncidentId, setSelectedIncidentId] = useState('')
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [categories, setCategories] = useState<IncidentCategory[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [summary, setSummary] = useState<IncidentSummary | null>(null)
  const [staff, setStaff] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [incidentFilter, setIncidentFilter] = useState<IncidentStatus | 'ALL'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementContent, setAnnouncementContent] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [incidentSearch, setIncidentSearch] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')
    if (!session) {
      setIncidents(demoIncidents)
      setCategories(demoCategories)
      setAnnouncements(demoAnnouncements)
      setSummary(admin ? demoSummary : null)
      setStaff(admin ? demoStaff : [])
      setIsLoading(false)
      return
    }
    const headers = { Authorization: `Bearer ${token}` }
    const results = await Promise.allSettled([
      apiRequest<{ incidents: Incident[] }>('/incidents?limit=100', { headers }),
      apiRequest<{ categories: IncidentCategory[] }>('/categories', { headers }),
      apiRequest<{ announcements: Announcement[] }>('/announcements', { headers }),
      admin ? apiRequest<IncidentSummary>('/reports/summary', { headers }) : Promise.resolve(null),
      admin ? apiRequest<{ users: AdminUser[] }>('/users', { headers }) : Promise.resolve(null),
    ])
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
    if (rejected?.reason instanceof ApiRequestError && rejected.reason.status === 401) {
      onSessionExpired()
      setIsLoading(false)
      return
    }
    const incidentsResult = results[0]
    if (incidentsResult.status === 'rejected') {
      setError(incidentsResult.reason instanceof Error ? incidentsResult.reason.message : 'No se pudieron cargar las incidencias.')
    } else {
      setIncidents(incidentsResult.value.incidents)
    }
    const categoriesResult = results[1]
    if (categoriesResult.status === 'fulfilled') setCategories(categoriesResult.value.categories)
    else if (categoriesResult.reason instanceof Error) setError((message) => message || categoriesResult.reason.message)
    const announcementsResult = results[2]
    if (announcementsResult.status === 'fulfilled') setAnnouncements(announcementsResult.value.announcements)
    else if (announcementsResult.reason instanceof Error) setError((message) => message || announcementsResult.reason.message)
    const summaryResult = results[3]
    if (summaryResult.status === 'fulfilled' && summaryResult.value) setSummary(summaryResult.value)
    const usersResult = results[4]
    if (usersResult.status === 'fulfilled' && usersResult.value) setStaff(usersResult.value.users.filter(({ role }) => role === 'STAFF'))
    else if (admin && usersResult.status === 'rejected' && usersResult.reason instanceof Error) setError((message) => message || usersResult.reason.message)
    setIsLoading(false)
  }, [admin, onSessionExpired, session, token])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadData])

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { portalView?: PortalView; incidentId?: string } | null
      setView(state?.portalView ?? 'overview')
      setSelectedIncidentId(state?.incidentId ?? '')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!mobileNavOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileNavOpen])

  const navigate = (nextView: PortalView, incidentId = '') => {
    setView(nextView)
    setSelectedIncidentId(incidentId)
    setMobileNavOpen(false)
    window.history.pushState(
      { ...(window.history.state ?? {}), portalView: nextView, incidentId },
      '',
      `#${admin ? 'administracion' : 'residente'}/${nextView}${incidentId ? `/${incidentId}` : ''}`,
    )
  }

  const visibleIncidents = useMemo(() => incidents.filter((incident) => {
    const statusMatches = incidentFilter === 'ALL' || incident.status === incidentFilter
    const categoryMatches = categoryFilter === 'ALL' || incident.category.id === categoryFilter
    const query = incidentSearch.trim().toLocaleLowerCase('es')
    const queryMatches = !query || [incident.title, incident.address, incident.category.name, incident.reporter?.name ?? '']
      .some((value) => value.toLocaleLowerCase('es').includes(query))
    return statusMatches && categoryMatches && queryMatches
  }), [categoryFilter, incidentFilter, incidentSearch, incidents])

  const publishAnnouncement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsPublishing(true)
    setError('')
    setNotice('')
    if (!session) {
      const entry: Announcement = { id: `demo-announcement-${Date.now()}`, title: announcementTitle.trim(), content: announcementContent.trim(), publishedAt: new Date().toISOString(), author: { id: 'demo-admin', name: 'Administración DEMO' } }
      setAnnouncements((current) => [entry, ...current])
      setAnnouncementTitle('')
      setAnnouncementContent('')
      setNotice('Aviso agregado sólo en esta demostración; no se envió al servidor.')
      setIsPublishing(false)
      return
    }
    try {
      await apiRequest('/announcements', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ title: announcementTitle.trim(), content: announcementContent.trim() }),
      })
      setAnnouncementTitle('')
      setAnnouncementContent('')
      await loadData()
    } catch (requestError) {
      if (requestError instanceof ApiRequestError && requestError.status === 401) onSessionExpired()
      else setError(requestError instanceof Error ? requestError.message : 'No se pudo publicar el aviso.')
    } finally {
      setIsPublishing(false)
    }
  }

  const createDemoIncident = (input: NewIncidentInput) => {
    const id = `demo-incident-${Date.now()}`
    const createdAt = new Date().toISOString()
    const category = categories.find(({ id: categoryId }) => categoryId === input.categoryId) ?? demoCategories[0]
    const item: Incident = {
      ...input,
      id,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      status: 'PENDING',
      dueAt: null,
      resolvedAt: null,
      createdAt,
      updatedAt: createdAt,
      category,
      reporter: { id: 'demo-resident', name: 'Usuario de demostración' },
      assignee: null,
    }
    setIncidents((current) => [item, ...current])
    setNotice('Reporte creado sólo en esta demostración; no se envió al servidor.')
    return id
  }

  const updateDemoIncident = (id: string, status: IncidentStatus, assigneeId: string, dueAtValue: string) => {
    const updatedAt = new Date().toISOString()
    const dueAt = dueAtValue ? new Date(dueAtValue).toISOString() : null
    const assignee = demoStaff.find(({ id: staffId }) => staffId === assigneeId) ?? null
    setIncidents((current) => current.map((item) => item.id === id ? { ...item, status, assignee, dueAt, updatedAt } : item))
    setNotice('Cambios de ejemplo aplicados sólo en esta demostración.')
  }

  const roleLabel = demoRole ? (admin ? 'Administración · DEMO' : 'Residente · DEMO') : session?.user.role === 'RESIDENT' ? 'Residente' : session?.user.role === 'ADMIN' ? 'Administración' : session?.user.role === 'STAFF' ? 'Personal operativo' : 'Directiva'
  const navItems: { view: PortalView; label: string }[] = [
    { view: 'overview', label: 'Resumen' },
    { view: 'incidents', label: admin ? 'Incidencias' : 'Mis incidencias' },
    ...(!admin ? [{ view: 'create' as const, label: 'Reportar' }] : []),
    { view: 'announcements', label: 'Avisos' },
  ]

  const currentView = view === 'detail'
    ? session
      ? <IncidentDetailPage key={selectedIncidentId} token={token} incidentId={selectedIncidentId} isAdmin={admin} staff={staff} onBack={() => navigate('incidents')} onSessionExpired={onSessionExpired} onUpdated={() => { void loadData() }} />
      : <DemoIncidentDetail incident={incidents.find(({ id }) => id === selectedIncidentId)} isAdmin={admin} staff={staff} onBack={() => navigate('incidents')} onUpdate={updateDemoIncident} />
    : view === 'create'
      ? <IncidentFormPage token={token} categories={categories} onCancel={() => navigate('overview')} onCreated={(id) => { if (session) void loadData(); navigate('detail', id) }} onSessionExpired={onSessionExpired} demoMode={!session} onDemoCreate={createDemoIncident} />
      : view === 'incidents'
        ? <section className="portal-page" aria-labelledby="incident-list-heading">
            <div className="portal-page-heading"><p className="portal-eyebrow">Seguimiento</p><h1 id="incident-list-heading">{admin ? 'Gestión de incidencias' : 'Mis incidencias'}</h1><p>{admin ? 'Consulta los reportes y abre uno para actualizar su atención.' : 'Consulta el estado y los movimientos de tus reportes.'}</p></div>
            <div className="incident-list-tools"><label className="sr-only" htmlFor="incident-search">Buscar incidencias</label><input autoComplete="off" id="incident-search" onChange={(event) => setIncidentSearch(event.target.value)} placeholder="Buscar por título, dirección o categoría" type="search" value={incidentSearch} /><label htmlFor="incident-filter">Estado</label><select id="incident-filter" onChange={(event) => setIncidentFilter(event.target.value as IncidentStatus | 'ALL')} value={incidentFilter}><option value="ALL">Todos</option>{incidentStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select><label htmlFor="category-filter">Categoría</label><select id="category-filter" onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}><option value="ALL">Todas</option>{categories.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}</select></div>
            <IncidentTable incidents={visibleIncidents} admin={admin} onOpen={(id) => navigate('detail', id)} />
          </section>
        : view === 'announcements'
          ? <section className="portal-page" aria-labelledby="announcement-heading"><div className="portal-page-heading"><p className="portal-eyebrow">Comunidad</p><h1 id="announcement-heading">Avisos comunitarios</h1><p>Información publicada por Administración.</p></div>{admin && <form className="portal-panel announcement-form" onSubmit={publishAnnouncement}><h2>Publicar un aviso</h2><div className="form-field"><label htmlFor="announcement-title">Título</label><input id="announcement-title" maxLength={150} minLength={3} onChange={(event) => setAnnouncementTitle(event.target.value)} required value={announcementTitle} /></div><div className="form-field"><label htmlFor="announcement-content">Contenido</label><textarea id="announcement-content" maxLength={10000} minLength={10} onChange={(event) => setAnnouncementContent(event.target.value)} required rows={4} value={announcementContent} /></div><button className="button-primary" disabled={isPublishing} type="submit">{isPublishing ? 'Publicando…' : 'Publicar aviso'}</button></form>}<AnnouncementList announcements={announcements} /></section>
          : <section className="portal-page" aria-labelledby="dashboard-heading">
              <div className="dashboard-welcome"><div><p className="portal-eyebrow">Panel de {roleLabel}</p><h1 id="dashboard-heading">Hola, {userName.split(' ')[0]}</h1><p>{admin ? 'Revisa los reportes y coordina su atención.' : 'Este es el estado de tus reportes comunitarios.'}</p></div>{!admin && <button className="button-primary" onClick={() => navigate('create')} type="button">+ Reportar incidencia</button>}</div>
              {admin ? <SummaryCards summary={summary} incidents={incidents} /> : <ResidentSummary incidents={incidents} />}
              {error && <p className="portal-alert portal-alert--error" role="alert">{error}</p>}
              {isLoading ? <p role="status">Cargando información…</p> : <>
                {admin && <section className="portal-panel dashboard-section"><div className="section-title-row"><div><p className="portal-eyebrow">Atención</p><h2>Incidencias recientes</h2></div><button className="text-button" onClick={() => navigate('incidents')} type="button">Ver todas →</button></div><IncidentTable incidents={incidents.slice(0, 5)} admin onOpen={(id) => navigate('detail', id)} /></section>}
                {!admin && <div className="dashboard-columns"><section className="portal-panel dashboard-section"><div className="section-title-row"><div><p className="portal-eyebrow">Actividad</p><h2>Reportes recientes</h2></div><button className="text-button" onClick={() => navigate('incidents')} type="button">Ver todos →</button></div><IncidentTable incidents={incidents.slice(0, 5)} admin={false} onOpen={(id) => navigate('detail', id)} /></section><section className="portal-panel dashboard-section"><div className="section-title-row"><div><p className="portal-eyebrow">Comunidad</p><h2>Últimos avisos</h2></div><button className="text-button" onClick={() => navigate('announcements')} type="button">Ver avisos →</button></div><AnnouncementList announcements={announcements.slice(0, 3)} /></section></div>}
              </>}
            </section>

  return (
    <main className="portal-app">
      <button className="portal-menu-toggle" aria-expanded={mobileNavOpen} aria-controls="portal-sidebar" aria-label={mobileNavOpen ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMobileNavOpen((open) => !open)} type="button"><span aria-hidden="true">{mobileNavOpen ? '×' : '☰'}</span><span>SIGIC</span></button>
      {mobileNavOpen && <button className="portal-sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setMobileNavOpen(false)} type="button" />}
      <aside className={`portal-sidebar${mobileNavOpen ? ' is-open' : ''}`} id="portal-sidebar" aria-label="Menú principal">
        <div className="portal-brand"><span>SIGIC</span><small>Gestión Comunitaria</small></div>
        <div className="portal-sidebar__section-label">Espacio de trabajo</div>
        <nav className="portal-nav" aria-label="Navegación principal">{navItems.map((item, index) => <button aria-current={view === item.view || (item.view === 'incidents' && view === 'detail') ? 'page' : undefined} className={view === item.view || (item.view === 'incidents' && view === 'detail') ? 'portal-nav__item is-active' : 'portal-nav__item'} key={item.view} onClick={() => navigate(item.view)} type="button"><span aria-hidden="true" className="portal-nav__icon">{['⌂', '▤', '+', '◉'][index]}</span>{item.label}</button>)}</nav>
        <div className="portal-sidebar__bottom">
          <div className="portal-user"><span className="portal-user__avatar" aria-hidden="true">{userName.slice(0, 1).toUpperCase()}</span><span className="portal-user__identity">{userName}<small>{roleLabel}</small>{demoRole && <small className="portal-demo-label">Vista de prueba · solo local</small>}</span></div>
          <button className="portal-logout" onClick={onLogout} type="button"><span aria-hidden="true">↪</span>{session ? 'Cerrar sesión' : 'Salir de la prueba'}</button>
        </div>
      </aside>
      <div className="portal-main-column">
        <header className="portal-topbar"><div><p className="portal-eyebrow">ASOCEINORT · SIGIC</p><h1>{navItems.find((item) => item.view === (view === 'detail' ? 'incidents' : view))?.label ?? 'Panel'}</h1></div><span className="portal-topbar__date">Gestión comunitaria</span></header>
        <div className="portal-content">
          {demoRole && <p className="portal-demo-note" role="status">Datos de ejemplo · Los cambios de esta vista no se guardan ni se envían al servidor.</p>}
          {notice && <p className="portal-alert portal-alert--success" role="status">{notice}</p>}
          {!isLoading && error && view !== 'overview' && <p className="portal-alert portal-alert--error" role="alert">{error}</p>}
          {currentView}
        </div>
        <footer className="portal-footer"><span>ASOCEINORT · SIGIC</span><span>Gestión y seguimiento comunitario</span></footer>
      </div>
    </main>
  )
}

function IncidentTable({ incidents, admin, onOpen }: { incidents: Incident[]; admin: boolean; onOpen: (id: string) => void }) {
  if (incidents.length === 0) return <div className="empty-state"><strong>Aún no hay incidencias</strong><p>{admin ? 'Los reportes nuevos aparecerán aquí.' : 'Cuando envíes un reporte, podrás seguirlo desde esta pantalla.'}</p></div>
  return <div className="table-scroll"><table className="incident-table"><thead><tr><th>Incidencia</th><th>Categoría</th>{admin && <th>Reportó</th>}<th>Estado</th><th>Fecha</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{incidents.map((incident) => <tr key={incident.id}><td><strong>{incident.title}</strong><small>{incident.address}</small></td><td>{incident.category.name}</td>{admin && <td>{incident.reporter?.name ?? '—'}</td>}<td><span className={statusClass(incident.status)}>{statusLabels[incident.status]}</span></td><td>{formatDate(incident.createdAt)}</td><td><button className="text-button" onClick={() => onOpen(incident.id)} type="button">Ver detalle →</button></td></tr>)}</tbody></table></div>
}

function ResidentSummary({ incidents }: { incidents: Incident[] }) {
  const counts = incidentStatuses.map((status) => ({ status, count: incidents.filter((item) => item.status === status).length }))
  return <div className="summary-grid">{[
    { label: 'Reportes enviados', value: incidents.length, detail: 'En total' },
    ...counts.filter(({ status }) => ['PENDING', 'IN_PROGRESS', 'RESOLVED'].includes(status)).map(({ status, count }) => ({ label: statusLabels[status], value: count, detail: status === 'RESOLVED' ? 'Solucionados' : 'En seguimiento' })),
  ].map((card) => <article className="summary-card" key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small>{card.detail}</small></article>)}</div>
}

function SummaryCards({ summary, incidents }: { summary: IncidentSummary | null; incidents: Incident[] }) {
  const counts = summary?.byStatus
  const values = [
    { label: 'Incidencias registradas', value: summary?.total ?? incidents.length, detail: 'Acumulado' },
    { label: 'Pendientes', value: counts?.PENDING ?? 0, detail: 'Requieren atención' },
    { label: 'En proceso', value: counts?.IN_PROGRESS ?? 0, detail: 'Asignadas' },
    { label: 'Tiempo promedio', value: summary?.averageResolutionTimeHours == null ? '—' : `${summary.averageResolutionTimeHours.toFixed(1)} h`, detail: 'De resolución' },
  ]
  return <div className="summary-grid">{values.map((card) => <article className="summary-card" key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small>{card.detail}</small></article>)}</div>
}

function AnnouncementList({ announcements }: { announcements: Announcement[] }) {
  if (announcements.length === 0) return <div className="empty-state"><strong>No hay avisos publicados</strong><p>Los comunicados de Administración aparecerán aquí.</p></div>
  return <div className="announcement-list">{announcements.map((announcement) => <article className="announcement-item" key={announcement.id}><p className="portal-eyebrow">{formatDate(announcement.publishedAt)} · {announcement.author.name}</p><h3>{announcement.title}</h3><p>{announcement.content}</p></article>)}</div>
}

function DemoIncidentDetail({ incident, isAdmin: admin, staff, onBack, onUpdate }: {
  incident?: Incident
  isAdmin: boolean
  staff: AdminUser[]
  onBack: () => void
  onUpdate: (id: string, status: IncidentStatus, assigneeId: string, dueAt: string) => void
}) {
  if (!incident) return <section className="portal-page"><button className="text-button" onClick={onBack} type="button">← Volver a incidencias</button><p className="empty-state">Este reporte de demostración ya no está en la sesión.</p></section>
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    onUpdate(incident.id, values.get('status') as IncidentStatus, String(values.get('assigneeId') ?? ''), String(values.get('dueAt') ?? ''))
  }
  return <section className="portal-page"><button className="text-button" onClick={onBack} type="button">← Volver a incidencias</button><div className="portal-page-heading incident-heading"><p className="portal-eyebrow">Detalle de ejemplo · {incident.category.name}</p><h1>{incident.title}</h1><span className={statusClass(incident.status)}>{statusLabels[incident.status]}</span></div><div className="incident-detail-grid"><article className="portal-panel incident-description"><h2>Descripción</h2><p>{incident.description}</p><dl className="incident-facts"><div><dt>Ubicación</dt><dd>{incident.address}</dd></div><div><dt>Fecha del reporte</dt><dd>{formatDate(incident.createdAt)}</dd></div><div><dt>Responsable</dt><dd>{incident.assignee?.name ?? 'Pendiente de asignación'}</dd></div><div><dt>Fecha objetivo</dt><dd>{incident.dueAt ? formatDate(incident.dueAt) : 'Sin fecha definida'}</dd></div></dl></article><section className="portal-panel history-panel"><h2>Historial de demostración</h2><ol className="history-list"><li><span className="history-dot" aria-hidden="true"/><div><strong>Reporte recibido (ejemplo)</strong><small>Usuario DEMO · {formatDate(incident.createdAt)}</small></div></li>{incident.updatedAt !== incident.createdAt && <li><span className="history-dot" aria-hidden="true"/><div><strong>Estado actual: {statusLabels[incident.status]}</strong><small>Movimiento local de ejemplo · {formatDate(incident.updatedAt)}</small></div></li>}</ol><p className="field-help">Estos datos son ficticios y existen únicamente en esta demostración.</p></section></div>{admin && <form className="portal-panel management-form" onSubmit={submit}><div><p className="portal-eyebrow">Administración DEMO</p><h2>Probar actualización local</h2></div><div className="management-fields"><div className="form-field"><label htmlFor="demo-status">Estado</label><select defaultValue={incident.status} id="demo-status" name="status">{incidentStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></div><div className="form-field"><label htmlFor="demo-assignee">Personal operativo</label><select defaultValue={incident.assignee?.id ?? ''} id="demo-assignee" name="assigneeId"><option value="">Sin asignar</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div><div className="form-field"><label htmlFor="demo-due-date">Fecha objetivo</label><input defaultValue={incident.dueAt?.slice(0, 16) ?? ''} id="demo-due-date" name="dueAt" type="datetime-local" /></div></div><button className="button-primary" type="submit">Aplicar sólo en DEMO</button></form>}</section>
}
