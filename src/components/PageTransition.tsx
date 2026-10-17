import { useEffect, type ReactNode } from 'react'

export function PageTransition({ routeKey, direction, children }: { routeKey: string; direction: 'forward' | 'back'; children: ReactNode }) {
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const main = document.querySelector<HTMLElement>('#conteudo')
      if (!main) return
      main.tabIndex = -1
      main.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [routeKey])

  return <div className={`page-transition page-transition-${direction}`}>{children}</div>
}
