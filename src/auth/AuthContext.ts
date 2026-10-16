import { createContext } from 'react'

export type TipoUsuario = 'startup' | 'investidor'

export interface Usuario {
  id: string
  nome: string
  tipo: TipoUsuario
  ativo: boolean
}

export interface AuthUser {
  id: string
  email: string
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: AuthUser
}

/**
 * loading      -> ainda descobrindo sessão/perfil (mostre um spinner)
 * signedOut    -> sem sessão (redirecione para /login)
 * needsProfile -> logado, mas falta completar startup/investidor (redirecione para o onboarding)
 * ready        -> logado e com perfil completo
 */
export type AuthStatus = 'loading' | 'signedOut' | 'needsProfile' | 'ready'

export interface AuthContextValue {
  status: AuthStatus
  session: AuthSession | null
  user: AuthUser | null
  usuario: Usuario | null
  /** Recarrega o perfil (chame ao terminar o onboarding). */
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
