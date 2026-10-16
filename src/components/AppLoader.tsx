import { Brand } from './Brand'

export function AppLoader({ message = 'Preparando sua experiência...' }: { message?: string }) {
  return (
    <main id="conteudo" className="app-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="app-loader-card">
        <Brand />
        <div className="app-loader-mark" aria-hidden="true"><span /><span /><span /></div>
        <p>{message}</p>
      </div>
    </main>
  )
}
