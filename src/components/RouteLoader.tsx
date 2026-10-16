import { LoaderCircle } from 'lucide-react'

export function RouteLoader({ navigating, fetching }: { navigating: boolean; fetching: boolean }) {
  return (
    <>
      <div className={`route-progress${navigating || fetching ? ' is-active' : ''}`} aria-hidden="true"><span /></div>
      {navigating && <div className="route-loader" role="status" aria-live="polite" aria-label="Carregando página">
        <div><LoaderCircle size={34} aria-hidden="true" /><span>Carregando...</span></div>
      </div>}
    </>
  )
}
