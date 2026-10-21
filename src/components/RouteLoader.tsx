import { LoaderCircle } from 'lucide-react'

export function RouteLoader({ navigating, fetching }: { navigating: boolean; fetching: boolean }) {
  const active = navigating || fetching
  const message = fetching
    ? 'Carregando os dados, isso pode levar um tempo.'
    : 'Carregando página...'

  return (
    <>
      <div className={`route-progress${active ? ' is-active' : ''}`} aria-hidden="true"><span /></div>
      {active && <div className="route-loader" role="status" aria-live="polite" aria-busy="true">
        <div><LoaderCircle size={34} aria-hidden="true" /><span>{message}</span></div>
      </div>}
    </>
  )
}
