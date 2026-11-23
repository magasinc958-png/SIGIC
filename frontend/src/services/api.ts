import type { BackendRole } from '../types/profile'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export type AuthUser = {
  id: string
  nombre: string
  email: string
  telefono?: string | null
  rol: BackendRole
  activo?: boolean
}

type LoginResponse = { accessToken: string; user: AuthUser }

export type IncidentStatus = 'PENDIENTE' | 'ASIGNADA' | 'ATENDIDA' | 'EN_PROCESO' | 'RESUELTA' | 'RECHAZADA'
export type IncidentType = { id: number; nombre: string; codigoPrefijo: string }
export type IncidentLocation = {
  manzana: string | null
  villa: string | null
  calle: string | null
  referencia: string | null
  latitud: string | null
  longitud: string | null
}
export type Incident = {
  id: string
  codigo: string
  titulo: string
  descripcion: string
  estado: IncidentStatus
  fechaCreacion: string
  fechaActualizacion: string
  fechaObjetivo: string | null
  fechaResolucion: string | null
  tipo: IncidentType
  ubicacion: IncidentLocation | null
  historial?: Array<{
    tipoAccion: string
    estadoAnterior: IncidentStatus | null
    estadoNuevo: IncidentStatus | null
    observacion: string | null
    fechaEvento: string
  }>
}
export type IncidentListResponse = {
  incidents: Incident[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}
export type CreateIncidentInput = {
  titulo: string
  descripcion: string
  idTipo: number
  ubicacion: {
    manzana?: string
    villa?: string
    calle?: string
    referencia?: string
    latitud?: number
    longitud?: number
  }
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}, accessToken?: string): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Intenta nuevamente.')
  }

  const payload = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) throw new ApiError(response.status, payload.error ?? 'La solicitud no pudo completarse.')
  return payload as T
}

export function login(email: string, password: string) {
  return request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function getCurrentUser(accessToken: string) {
  return request<{ user: AuthUser }>('/api/auth/me', {}, accessToken)
}

export function getIncidentTypes(accessToken: string) {
  return request<{ types: IncidentType[] }>('/api/incidents/types', {}, accessToken)
}

export function getMyIncidents(accessToken: string, page = 1, limit = 10) {
  return request<IncidentListResponse>(`/api/incidents/mine?page=${page}&limit=${limit}`, {}, accessToken)
}

export function getMyIncident(accessToken: string, id: string) {
  return request<{ incident: Incident }>(`/api/incidents/${encodeURIComponent(id)}`, {}, accessToken)
}

export function createIncident(accessToken: string, input: CreateIncidentInput) {
  return request<{ incident: Incident }>('/api/incidents', {
    method: 'POST',
    body: JSON.stringify(input),
  }, accessToken)
}

export type AdminAssignment = {
  id: string
  idIncidencia: string
  estado: 'ACTIVA' | 'COMPLETADA' | 'CANCELADA' | 'REASIGNADA'
  fechaInicio: string
  fechaFin: string | null
  observacion: string | null
  area: { id: string; nombre: string }
  operativo: { id: string; nombre: string; telefono: string | null; turno: string | null; activo: boolean } | null
  administrador: { id: string; nombre: string; email: string }
}
export type AdminIncident = Incident & { residente: { id: string; nombre: string; email: string; telefono: string | null; manzana: string; villa: string }; asignaciones: AdminAssignment[] }
export type Area = { id: string; nombre: string; descripcion: string | null }
export type Worker = { id: string; nombre: string; telefono: string | null; turno: string | null; activo: boolean; area: { id: string; nombre: string } }
export type Activity = { id: string; titulo: string; descripcion: string; estado: string; fechaProgramada: string | null; fechaInicio: string | null; fechaFinalizacion: string | null; fechaCreacion: string; usuarioCreador: { id: string; nombre: string }; operativo: { id: string; nombre: string } | null }
export type HistoryEvent = { id: string; tipoAccion: string; estadoAnterior: IncidentStatus | null; estadoNuevo: IncidentStatus | null; observacion: string | null; fechaEvento: string; usuario: { id: string; nombre: string }; area: { id: string; nombre: string } | null; operativo: { id: string; nombre: string } | null }

export function getAdminIncidents(accessToken: string, params: { page?: number; limit?: number; estado?: string; idTipo?: number; codigo?: string } = {}) {
  const query = new URLSearchParams()
  query.set('page', String(params.page ?? 1)); query.set('limit', String(params.limit ?? 20))
  if (params.estado) query.set('estado', params.estado)
  if (params.idTipo) query.set('idTipo', String(params.idTipo))
  if (params.codigo) query.set('codigo', params.codigo)
  return request<{ incidents: AdminIncident[]; pagination: IncidentListResponse['pagination'] }>(`/api/admin/incidents?${query}`, {}, accessToken)
}
export function getAdminIncident(accessToken: string, id: string) { return request<{ incident: AdminIncident }>(`/api/admin/incidents/${id}`, {}, accessToken) }
export function getAreas(accessToken: string) { return request<{ areas: Area[] }>('/api/admin/areas', {}, accessToken) }
export function createArea(accessToken: string, input: { nombre: string; descripcion?: string }) { return request<{ area: Area }>('/api/admin/areas', { method: 'POST', body: JSON.stringify(input) }, accessToken) }
export function updateArea(accessToken: string, id: string, input: { nombre?: string; descripcion?: string }) { return request<{ area: Area }>(`/api/admin/areas/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, accessToken) }
export function getWorkers(accessToken: string, idArea?: string) { return request<{ workers: Worker[] }>(`/api/admin/workers${idArea ? `?idArea=${idArea}` : ''}`, {}, accessToken) }
export function createWorker(accessToken: string, input: { idArea: string; nombre: string; telefono?: string; turno?: string; activo?: boolean }) { return request<{ worker: Worker }>('/api/admin/workers', { method: 'POST', body: JSON.stringify(input) }, accessToken) }
export function updateWorker(accessToken: string, id: string, input: { idArea?: string; nombre?: string; telefono?: string | null; turno?: string | null; activo?: boolean }) { return request<{ worker: Worker }>(`/api/admin/workers/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, accessToken) }
export function getAdminAssignments(accessToken: string, idIncidencia: string) { return request<{ assignments: AdminAssignment[] }>(`/api/admin/incidents/${idIncidencia}/assignments`, {}, accessToken) }
export function createAssignment(accessToken: string, idIncidencia: string, input: { idArea: string; idOperativo?: string | null; observacion?: string }) { return request<{ assignment: AdminAssignment }>(`/api/admin/incidents/${idIncidencia}/assignments`, { method: 'POST', body: JSON.stringify(input) }, accessToken) }
export function updateAssignmentStatus(accessToken: string, id: string, estado: 'COMPLETADA' | 'CANCELADA', observacion?: string) { return request<{ assignment: AdminAssignment }>(`/api/admin/assignments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ estado, observacion }) }, accessToken) }
export function reassign(accessToken: string, id: string, input: { idArea: string; idOperativo?: string | null; observacion?: string }) { return request<{ assignment: AdminAssignment }>(`/api/admin/assignments/${id}/reassign`, { method: 'POST', body: JSON.stringify(input) }, accessToken) }
export function changeIncidentStatus(accessToken: string, id: string, estado: string, observacion?: string) { return request<{ incident: Partial<Incident> }>(`/api/admin/incidents/${id}/status`, { method: 'PATCH', body: JSON.stringify({ estado, observacion }) }, accessToken) }
export function resolveIncident(accessToken: string, id: string, observacion: string) { return request<{ incident: Partial<Incident> }>(`/api/admin/incidents/${id}/resolve`, { method: 'POST', body: JSON.stringify({ observacion }) }, accessToken) }
export function addObservation(accessToken: string, id: string, observacion: string, idOperativo?: string) { return request<{ observation: unknown }>(`/api/admin/incidents/${id}/observations`, { method: 'POST', body: JSON.stringify({ observacion, idOperativo: idOperativo || null }) }, accessToken) }
export function addActivity(accessToken: string, id: string, input: { titulo: string; descripcion: string; idOperativo?: string | null; estado?: string }) { return request<{ activity: Activity }>(`/api/admin/incidents/${id}/activities`, { method: 'POST', body: JSON.stringify(input) }, accessToken) }
export function getActivities(accessToken: string, id: string) { return request<{ activities: Activity[] }>(`/api/admin/incidents/${id}/activities`, {}, accessToken) }
export function getHistory(accessToken: string, id: string) { return request<{ history: HistoryEvent[] }>(`/api/admin/incidents/${id}/history`, {}, accessToken) }
