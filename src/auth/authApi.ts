import type { AuthSession, AuthUser, TipoUsuario } from './AuthContext'
import { beginNetworkActivity } from '../navigation/activity'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'
const STORAGE_KEY = 'altura.auth.session'
const AUTH_EVENT = 'altura:auth-change'
let refreshPromise: Promise<AuthSession | null> | null = null

interface AuthTokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUser
}

interface ErrorPayload {
  message?: string
}

export type AuthResult =
  | { ok: true }
  | { ok: false; message: string }

export interface SignUpInput {
  email: string
  password: string
  tipo: TipoUsuario
  nome?: string
}

export function getApiBaseUrl() {
  return API_BASE_URL
}

export async function signUp(input: SignUpInput): Promise<AuthResult> {
  try {
    const response = await authFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    saveSession(toSession(response))
    return { ok: true }
  } catch (error) {
    return { ok: false, message: authErrorMessage(error) }
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const response = await authFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    saveSession(toSession(response))
    return { ok: true }
  } catch (error) {
    return { ok: false, message: authErrorMessage(error) }
  }
}

export async function signOut(): Promise<void> {
  const current = readSession()
  clearSession()
  if (!current) return
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    })
  } catch {
    // A sessão local já foi encerrada; indisponibilidade do backend não deve impedir o logout.
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const session = readSession()
  if (!session) return null
  if (session.expiresAt > Date.now() + 30_000) return session
  return refreshAuthSession()
}

export function refreshAuthSession(): Promise<AuthSession | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function performRefresh(): Promise<AuthSession | null> {
  const current = readSession()
  if (!current) return null
  try {
    const response = await authFetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    })
    const session = toSession(response)
    saveSession(session)
    return session
  } catch {
    clearSession()
    return null
  }
}

export function subscribeAuth(listener: (session: AuthSession | null) => void) {
  const onAuthChange = () => listener(readSession())
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onAuthChange()
  }
  window.addEventListener(AUTH_EVENT, onAuthChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(AUTH_EVENT, onAuthChange)
    window.removeEventListener('storage', onStorage)
  }
}

function readSession(): AuthSession | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function saveSession(session: AuthSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  window.dispatchEvent(new Event(AUTH_EVENT))
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(AUTH_EVENT))
}

function toSession(response: AuthTokenResponse): AuthSession {
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: Date.now() + response.expiresIn * 1000,
    user: { id: response.user.id, email: response.user.email },
  }
}

async function authFetch(path: string, init: RequestInit): Promise<AuthTokenResponse> {
  const finishActivity = beginNetworkActivity()
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...init.headers },
    })
    if (response.ok) return await response.json() as AuthTokenResponse
    let payload: ErrorPayload = {}
    try {
      payload = await response.json() as ErrorPayload
    } catch {
      // Usa a mensagem segura abaixo.
    }
    throw new Error(payload.message ?? 'Não foi possível concluir. Tente novamente em instantes.')
  } finally {
    finishActivity()
  }
}

function authErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente em instantes.'
}
