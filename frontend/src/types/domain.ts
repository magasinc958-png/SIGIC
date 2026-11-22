export type IncidentStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'ATTENDED'
  | 'RESOLVED'
  | 'REJECTED'

export type IncidentCategory = {
  id: string
  name: string
  active: boolean
}

export type IncidentPerson = {
  id: string
  name: string
}

export type NewIncidentInput = {
  title: string
  description: string
  categoryId: string
  address: string
  latitude?: number
  longitude?: number
}

export type Incident = {
  id: string
  title: string
  description: string
  address: string
  latitude: number | null
  longitude: number | null
  status: IncidentStatus
  dueAt: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  category: IncidentCategory
  reporter?: IncidentPerson
  assignee?: IncidentPerson | null
}

export type IncidentHistoryEntry = {
  id: string
  action: string
  fromStatus: IncidentStatus | null
  toStatus: IncidentStatus | null
  details: string | null
  createdAt: string
  actor: IncidentPerson & { role: 'RESIDENT' | 'ADMIN' | 'DIRECTOR' | 'STAFF' }
}

export type Announcement = {
  id: string
  title: string
  content: string
  publishedAt: string
  author: IncidentPerson
}

export type AdminUser = IncidentPerson & {
  email: string
  role: 'RESIDENT' | 'ADMIN' | 'DIRECTOR' | 'STAFF'
  active: boolean
}

export type IncidentSummary = {
  total: number
  byStatus: Record<IncidentStatus, number>
  averageResolutionTimeHours: number | null
}

export const incidentStatuses: IncidentStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'ATTENDED',
  'RESOLVED',
  'REJECTED',
]

export const statusLabels: Record<IncidentStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En proceso',
  ATTENDED: 'Atendida',
  RESOLVED: 'Resuelta',
  REJECTED: 'Rechazada',
}
