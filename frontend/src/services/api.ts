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
