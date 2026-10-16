import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props { children: ReactNode; routeKey: string }
interface State { error: Error | null }

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State { return { error } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Falha ao renderizar a tela', error, info)
  }

  componentDidUpdate(previous: Props) {
    if (previous.routeKey !== this.props.routeKey && this.state.error) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return <main id="conteudo" className="route-error" role="alert"><AlertTriangle size={36} /><h1>Não foi possível abrir esta tela</h1><p>Tente carregar a página novamente. Seus dados salvos não serão alterados.</p><button className="button button-navy" type="button" onClick={() => window.location.reload()}><RotateCcw size={17} />Tentar novamente</button></main>
  }
}
