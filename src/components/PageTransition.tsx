import type { ReactNode } from 'react'

export function PageTransition({ routeKey, direction, children }: { routeKey: string; direction: 'forward' | 'back'; children: ReactNode }) {
  return <div key={routeKey} className={`page-transition page-transition-${direction}`}>{children}</div>
}
