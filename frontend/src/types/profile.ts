export type UserProfile = 'resident' | 'administration' | 'board'

export type BackendRole = 'RESIDENTE' | 'ADMINISTRACION' | 'DIRECTIVA'

export type ProfileDetails = {
  id: UserProfile
  name: string
  description: string
  loginLabel: string
}

export const profiles: ProfileDetails[] = [
  { id: 'resident', name: 'Residente', description: 'Reporta incidencias y revisa comunicados de tu urbanizacion.', loginLabel: 'Ingresar como Residente' },
  { id: 'board', name: 'Directiva', description: 'Monitorea el estado general y analiza los reportes comunitarios.', loginLabel: 'Ingresar como Directiva' },
  { id: 'administration', name: 'Administracion', description: 'Gestiona usuarios, asignaciones y la resolucion de incidencias.', loginLabel: 'Ingresar como Administracion' },
]

export const profileRoles: Record<UserProfile, BackendRole> = {
  resident: 'RESIDENTE',
  administration: 'ADMINISTRACION',
  board: 'DIRECTIVA',
}

export const roleProfiles: Record<BackendRole, UserProfile> = {
  RESIDENTE: 'resident',
  ADMINISTRACION: 'administration',
  DIRECTIVA: 'board',
}

export function getProfileDetails(profileId: UserProfile): ProfileDetails {
  return profiles.find(({ id }) => id === profileId) ?? profiles[0]
}
