import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { isKnownAppUrl, parseRoute, type Route } from './routes'
import { subscribeNetworkActivity } from './activity'

interface HistoryState {
  alturaNavigation?: { index: number; scrollY: number }
}

interface NavigateOptions { replace?: boolean }

interface NavigationContextValue {
  route: Route
  routeUrl: string
  direction: 'forward' | 'back'
  isNavigating: boolean
  isFetching: boolean
  navigate: (to: string, options?: NavigateOptions) => boolean
}

const NavigationContext = createContext<NavigationContextValue | null>(null)
const TRANSITION_DELAY_MS = 90

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseRoute())
  const [routeUrl, setRouteUrl] = useState(() => `${window.location.pathname}${window.location.search}${window.location.hash}`)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [isNavigating, setIsNavigating] = useState(false)
  const [isFetchingImmediately, setIsFetchingImmediately] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const navigationToken = useRef(0)
  const currentIndex = useRef(0)
  const locked = useRef(false)

  useEffect(() => {
    const state = (window.history.state ?? {}) as HistoryState
    const initialIndex = state.alturaNavigation?.index ?? 0
    currentIndex.current = initialIndex
    window.history.replaceState({ ...state, alturaNavigation: { index: initialIndex, scrollY: window.scrollY } }, '')
  }, [])

  useEffect(() => subscribeNetworkActivity(setIsFetchingImmediately), [])

  useEffect(() => {
    if (!isFetchingImmediately) {
      setIsFetching(false)
      return
    }
    const timer = window.setTimeout(() => setIsFetching(true), 180)
    return () => window.clearTimeout(timer)
  }, [isFetchingImmediately])

  const commitLocation = useCallback((url: URL, targetDirection: 'forward' | 'back', restoreScroll?: number) => {
    const token = ++navigationToken.current
    setDirection(targetDirection)
    setIsNavigating(true)
    locked.current = true

    window.setTimeout(() => {
      if (token !== navigationToken.current) return
      setRoute(parseRoute(url.pathname, url.search))
      setRouteUrl(`${url.pathname}${url.search}${url.hash}`)

      requestAnimationFrame(() => {
        if (token !== navigationToken.current) return
        if (url.hash) {
          document.querySelector(url.hash)?.scrollIntoView()
        } else {
          window.scrollTo({ top: restoreScroll ?? 0 })
          const main = document.querySelector<HTMLElement>('#conteudo')
          if (main) {
            main.tabIndex = -1
            main.focus({ preventScroll: true })
          }
        }
        setIsNavigating(false)
        locked.current = false
      })
    }, TRANSITION_DELAY_MS)
  }, [])

  const saveCurrentScroll = useCallback(() => {
    const state = (window.history.state ?? {}) as HistoryState
    window.history.replaceState({
      ...state,
      alturaNavigation: { index: currentIndex.current, scrollY: window.scrollY },
    }, '')
  }, [])

  const navigate = useCallback((to: string, options: NavigateOptions = {}) => {
    const url = new URL(to, window.location.href)
    if (url.origin !== window.location.origin || !isKnownAppUrl(url)) return false

    const nextUrl = `${url.pathname}${url.search}${url.hash}`
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (nextUrl === currentUrl || locked.current) return false

    saveCurrentScroll()
    const nextIndex = options.replace ? currentIndex.current : currentIndex.current + 1
    const nextState: HistoryState = { alturaNavigation: { index: nextIndex, scrollY: 0 } }
    if (options.replace) window.history.replaceState(nextState, '', nextUrl)
    else window.history.pushState(nextState, '', nextUrl)
    currentIndex.current = nextIndex
    commitLocation(url, 'forward')
    return true
  }, [commitLocation, saveCurrentScroll])

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const state = (event.state ?? {}) as HistoryState
      const targetIndex = state.alturaNavigation?.index ?? 0
      const targetDirection = targetIndex < currentIndex.current ? 'back' : 'forward'
      currentIndex.current = targetIndex
      const url = new URL(window.location.href)
      commitLocation(url, targetDirection, state.alturaNavigation?.scrollY ?? 0)
    }

    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]')
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return
      const href = link.getAttribute('href')
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return
      const url = new URL(href, window.location.href)
      if (url.origin !== window.location.origin || !isKnownAppUrl(url)) return

      const currentPageHashLink = url.pathname === window.location.pathname
        && url.search === window.location.search
        && Boolean(url.hash)
      event.preventDefault()
      if (currentPageHashLink) {
        const nextUrl = `${url.pathname}${url.search}${url.hash}`
        const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
        if (nextUrl !== currentUrl) {
          saveCurrentScroll()
          const nextIndex = currentIndex.current + 1
          window.history.pushState({ alturaNavigation: { index: nextIndex, scrollY: 0 } } satisfies HistoryState, '', nextUrl)
          currentIndex.current = nextIndex
          setRouteUrl(nextUrl)
        }
        document.querySelector(url.hash)?.scrollIntoView({ behavior: 'smooth' })
        return
      }
      navigate(`${url.pathname}${url.search}${url.hash}`)
    }

    window.addEventListener('popstate', onPopState)
    document.addEventListener('click', onDocumentClick)
    return () => {
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('click', onDocumentClick)
    }
  }, [commitLocation, navigate, saveCurrentScroll])

  return <NavigationContext.Provider value={{ route, routeUrl, direction, isNavigating, isFetching, navigate }}>{children}</NavigationContext.Provider>
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) throw new Error('useNavigation deve ser usado dentro de <NavigationProvider>.')
  return context
}
