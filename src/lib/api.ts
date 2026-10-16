import { getApiBaseUrl, getSession, refreshAuthSession } from '../auth/authApi'
import { beginNetworkActivity } from '../navigation/activity'

const API_BASE_URL = getApiBaseUrl()

interface ApiErrorPayload {
  message?: string
  fields?: Record<string, string>
}

export class ApiError extends Error {
  status: number
  fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const finishActivity = beginNetworkActivity()
  try {
    const session = await getSession()
    if (!session) throw new ApiError(401, 'Sessão expirada. Entre novamente.')

    let response = await authenticatedFetch(path, init, session.accessToken)
    if (response.status === 401) {
      const renewed = await refreshAuthSession()
      if (renewed) response = await authenticatedFetch(path, init, renewed.accessToken)
    }

    return await parseResponse<T>(response)
  } finally {
    finishActivity()
  }
}

async function authenticatedFetch(path: string, init: RequestInit, accessToken: string) {

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${accessToken}`)
  headers.set('Accept', 'application/json')
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(`${API_BASE_URL}${path}`, { ...init, headers })
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }

  let payload: ApiErrorPayload = {}
  try {
    payload = await response.json() as ApiErrorPayload
  } catch {
    // Respostas sem JSON recebem uma mensagem segura abaixo.
  }
  throw new ApiError(response.status, payload.message ?? 'Não foi possível concluir a operação.', payload.fields)
}
