const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export type ApiUser = {
  id: string
  name: string
  email: string
  role: 'RESIDENT' | 'ADMIN' | 'DIRECTOR' | 'STAFF'
}

export type AuthSession = {
  accessToken: string
  user: ApiUser
}

type ApiErrorBody = {
  error?: string
}

export class ApiRequestError extends Error {
  public readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    throw new ApiRequestError(
      body.error ?? `La solicitud falló (${response.status}).`,
      response.status,
    )
  }

  return (await response.json()) as T
}
