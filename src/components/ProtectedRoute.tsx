import { useEffect, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import { useNavigation } from '../navigation/NavigationContext'
import { protectedPages, type Route } from '../navigation/routes'
import { AppLoader } from './AppLoader'

export function ProtectedRoute({ route, children }: { route: Route; children: ReactNode }) {
  const { status } = useAuth()
  const { navigate } = useNavigation()
  const isProtected = protectedPages.has(route.page)
  const isAuthRoute = route.page === 'login' || route.page === 'register'

  let redirect: string | null = null
  if (status === 'signedOut' && isProtected) redirect = '/login'
  else if (status === 'needsProfile' && route.page !== 'onboarding' && (isProtected || isAuthRoute)) redirect = '/onboarding'
  else if (status === 'ready' && (isAuthRoute || route.page === 'onboarding')) redirect = '/app'

  useEffect(() => {
    if (status !== 'loading' && redirect) navigate(redirect, { replace: true })
  }, [navigate, redirect, status])

  if (status === 'loading') return <AppLoader />
  if (redirect) return <AppLoader message="Redirecionando com segurança..." />
  return children
}
