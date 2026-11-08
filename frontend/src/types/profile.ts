export type UserProfile =
  | 'resident'
  | 'administration'
  | 'board'
  | 'operations'

export type ProfileDetails = {
  id: UserProfile
  name: string
  description: string
  loginLabel: string
}

export const profiles: ProfileDetails[] = [
  {
    id: 'resident',
    name: 'Residente',
    description:
      'Reporta incidencias, revisa comunicados y mantente al día con las noticias de tu urbanización.',
    loginLabel: 'Ingresar como Residente',
  },
  {
    id: 'board',
    name: 'Directiva',
    description:
      'Monitorea el estado general de la comunidad, aprueba proyectos y analiza el mapa de calor de reportes.',
    loginLabel: 'Ingresar como Directiva',
  },
  {
    id: 'administration',
    name: 'Administración',
    description:
      'Gestiona usuarios, asigna tareas al personal operativo, envía comunicados y coordina la resolución de incidencias.',
    loginLabel: 'Ingresar como Administración',
  },
  {
    id: 'operations',
    name: 'Personal Operativo',
    description:
      'Atiende los reportes asignados, actualiza el estado de las tareas de mantenimiento y registra evidencias en campo.',
    loginLabel: 'Ingresar como Personal Operativo',
  },
]

export function getProfileDetails(profileId: UserProfile): ProfileDetails {
  return profiles.find(({ id }) => id === profileId) ?? profiles[0]
}
