import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiRequest } from '../lib/api'
import { getSession, subscribeAuth } from './authApi'
import { AuthContext, type AuthContextValue, type AuthSession, type AuthStatus, type Usuario } from './AuthContext'

interface PerfilState {
  userId: string
  usuario: Usuario | null
  perfilCompleto: boolean
}

async function carregarPerfil(userId: string): Promise<PerfilState> {
  const data = await apiRequest<Usuario & { perfilCompleto: boolean }>('/me')
  const { perfilCompleto, ...usuario } = data
  return { userId, usuario, perfilCompleto }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [perfil, setPerfil] = useState<PerfilState | null>(null)

  useEffect(() => {
    void getSession().then((current) => {
      setSession(current)
      setSessionLoaded(true)
    })
    return subscribeAuth((next) => {
      setSession(next)
      setSessionLoaded(true)
    })
  }, [])

  const userId = session?.user.id ?? null

  const refresh = useCallback(async () => {
    if (!userId) return
    try {
      setPerfil(await carregarPerfil(userId))
    } catch (error) {
      console.error('Falha ao carregar perfil', error)
      setPerfil({ userId, usuario: null, perfilCompleto: false })
    }
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<AuthContextValue>(() => {
    let status: AuthStatus
    if (!sessionLoaded) status = 'loading'
    else if (!userId) status = 'signedOut'
    else if (!perfil || perfil.userId !== userId) status = 'loading'
    // A conta existe, mas o perfil de negócio ainda precisa ser preenchido.
    else if (!perfil.usuario || !perfil.perfilCompleto) status = 'needsProfile'
    else status = 'ready'

    return {
      status,
      session,
      user: session?.user ?? null,
      usuario: perfil && perfil.userId === userId ? perfil.usuario : null,
      refresh,
    }
  }, [sessionLoaded, userId, perfil, session, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
