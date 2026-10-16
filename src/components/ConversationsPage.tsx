import { ArrowLeft, Check, Clock3, LoaderCircle, LogOut, MessageCircle, Send, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import genericInvestorImage from '../assets/generic_Investor.png'
import genericStartupImage from '../assets/generic_Startup.png'
import { signOut } from '../auth/authApi'
import { useAuth } from '../auth/useAuth'
import {
  carregarConexoes,
  carregarMensagens,
  enviarMensagem,
  excluirConexao,
  responderConexao,
  type ConnectionData,
  type MessageData,
} from '../lib/connectionApi'
import { traduzirErroApi } from '../lib/apiErrors'
import { subscribeRealtime } from '../lib/realtime'
import { Brand } from './Brand'
import { DashboardNavMenu } from './DashboardNavMenu'
import { InvestorDetailsModal } from './InvestorDetailsModal'
import { ThemeToggle } from './ThemeToggle'

interface ConversationsPageProps { onBack: () => void; onOpenStartup: (userId: string) => void }

const statusLabels = { pendente: 'Pendente', aceito: 'Conexão ativa', recusado: 'Recusada' } as const

export function ConversationsPage({ onBack, onOpenStartup }: ConversationsPageProps) {
  const { usuario } = useAuth()
  const [connections, setConnections] = useState<ConnectionData[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [messages, setMessages] = useState<MessageData[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [investorProfileUserId, setInvestorProfileUserId] = useState<string | null>(null)
  const selectedIdRef = useRef<number | null>(null)

  const selected = useMemo(
    () => connections.find((connection) => connection.id === selectedId) ?? null,
    [connections, selectedId],
  )

  const openCounterpartProfile = (connection: ConnectionData) => {
    if (connection.contraparte.tipo === 'startup') {
      onOpenStartup(connection.contraparte.usuarioId)
    } else {
      setInvestorProfileUserId(connection.contraparte.usuarioId)
    }
  }

  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  const loadConnections = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const items = await carregarConexoes()
      setConnections(items)
      setSelectedId((current) => current && items.some((item) => item.id === current)
        ? current
        : items[0]?.id ?? null)
      setError('')
    } catch (requestError) {
      setError(traduzirErroApi(requestError))
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  const loadMessages = useCallback(async (connectionId: number, showLoading = false) => {
    if (showLoading) setMessagesLoading(true)
    try {
      setMessages(await carregarMensagens(connectionId))
      setConnections((current) => current.map((item) => item.id === connectionId
        ? { ...item, naoLidas: 0 }
        : item))
      setError('')
    } catch (requestError) {
      setError(traduzirErroApi(requestError))
    } finally {
      if (showLoading) setMessagesLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadConnections(true)
    const timer = window.setInterval(() => void loadConnections(), 10000)
    return () => window.clearInterval(timer)
  }, [loadConnections])

  useEffect(() => {
    if (!selected || selected.status !== 'aceito') {
      setMessages([])
      return
    }
    void loadMessages(selected.id, true)
    const timer = window.setInterval(() => void loadMessages(selected.id), 30000)
    return () => window.clearInterval(timer)
  }, [loadMessages, selected?.id, selected?.status])

  useEffect(() => subscribeRealtime((event) => {
    if (event.type === 'message.created') {
      void loadConnections()
      if (event.connectionId === selectedIdRef.current) {
        setMessages((current) => current.some((message) => message.id === event.message.id)
          ? current
          : [...current, event.message])
      }
      return
    }
    if (event.type === 'connection.deleted') {
      if (event.connectionId === selectedIdRef.current) {
        setMessages([])
      }
      void loadConnections()
    }
  }), [loadConnections])

  const respond = async (status: 'aceito' | 'recusado') => {
    if (!selected || busy) return
    setBusy(true)
    setError('')
    try {
      const updated = await responderConexao(selected.id, status)
      setConnections((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (requestError) {
      setError(traduzirErroApi(requestError))
    } finally {
      setBusy(false)
    }
  }

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected || !draft.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const message = await enviarMensagem(selected.id, draft.trim())
      setMessages((current) => [...current, message])
      setDraft('')
      void loadConnections()
    } catch (requestError) {
      setError(traduzirErroApi(requestError))
    } finally {
      setBusy(false)
    }
  }

  const removeConnection = async () => {
    if (!selected || busy) return
    const isInvestor = usuario?.tipo === 'investidor'
    const confirmation = isInvestor
      ? `Cancelar a proposta enviada para ${selected.contraparte.nome}? Todo o histórico desta conexão será apagado.`
      : `Excluir a conexão com ${selected.contraparte.nome}? Todo o histórico de mensagens será apagado.`
    if (!window.confirm(confirmation)) return
    setBusy(true)
    setError('')
    try {
      await excluirConexao(selected.id)
      setMessages([])
      await loadConnections()
    } catch (requestError) {
      setError(traduzirErroApi(requestError))
    } finally {
      setBusy(false)
    }
  }

  return <main id="conteudo" className="dashboard-shell conversations-page">
    <header className="dashboard-header">
      <div className="dashboard-header-content">
        <div className="dashboard-brand"><DashboardNavMenu /><Brand /><div className="dashboard-user-info"><p className="kicker">Rede Altura</p><h1>Conexões e conversas</h1></div></div>
        <div className="dashboard-actions"><ThemeToggle /><button className="button button-ghost button-compact" type="button" onClick={onBack}><ArrowLeft size={17} /><span>Painel</span></button><button className="button button-outline button-compact" type="button" onClick={() => void signOut()}><LogOut size={17} /><span>Sair</span></button></div>
      </div>
    </header>

    <div className="dashboard-content conversations-content">
      {error && <div className="feed-alert conversations-alert" role="alert">{error}</div>}
      <section className="conversations-shell" aria-label="Conexões">
        <aside className="conversation-list">
          <div className="conversation-list-heading"><p className="kicker">Seus contatos</p><h2>Conexões</h2><span>{connections.length} no total</span></div>
          {loading ? <ConversationEmpty icon={<LoaderCircle className="feed-spin" size={26} />} title="Carregando" text="Buscando suas conexões." />
            : connections.length === 0 ? <ConversationEmpty icon={<MessageCircle size={26} />} title="Nenhuma conexão" text={usuario?.tipo === 'investidor' ? 'Demonstre interesse em uma rodada para começar.' : 'Novas propostas de investidores aparecerão aqui.'} />
            : <div className="conversation-list-items">{connections.map((connection) => <button className={connection.id === selectedId ? 'is-selected' : ''} type="button" key={connection.id} onClick={(event) => {
              const openProfile = Boolean((event.target as Element).closest('[data-profile-trigger]'))
              if (openProfile) openCounterpartProfile(connection)
              else setSelectedId(connection.id)
            }}>
              <Avatar nome={connection.contraparte.nome} imagem={connection.contraparte.imagemPerfil} tipo={connection.contraparte.tipo} profileTrigger />
              <span className="conversation-list-copy"><strong data-profile-trigger>{connection.contraparte.nome}</strong><small>{counterpartSubtitle(connection)}</small><em className={`connection-status connection-status-${connection.status}`}>{statusLabels[connection.status]}</em></span>
              {connection.naoLidas > 0 && <span className="conversation-unread">{connection.naoLidas}</span>}
            </button>)}</div>}
        </aside>

        <section className="conversation-panel">
          {!selected ? <ConversationEmpty icon={<MessageCircle size={34} />} title="Selecione uma conexão" text="Os detalhes e a conversa aparecerão aqui." /> : <>
            <header className="conversation-panel-header">
              <button className="conversation-panel-identity" type="button" onClick={() => openCounterpartProfile(selected)} aria-label={`Ver perfil de ${selected.contraparte.nome}`}><Avatar nome={selected.contraparte.nome} imagem={selected.contraparte.imagemPerfil} tipo={selected.contraparte.tipo} large />
                <div><h2>{selected.contraparte.nome}</h2><p>{counterpartSubtitle(selected)} · <span className={`connection-status connection-status-${selected.status}`}>{statusLabels[selected.status]}</span></p></div>
              </button>
              <button className="button button-ghost button-compact connection-delete" type="button" disabled={busy} onClick={() => void removeConnection()}>{usuario?.tipo === 'investidor' ? <X size={17} /> : <Trash2 size={17} />}<span>{usuario?.tipo === 'investidor' ? 'Cancelar proposta' : 'Excluir conexão'}</span></button>
            </header>

            <div className="connection-proposal">
              <div><span>Mensagem inicial</span>{selected.valorProposto !== null && <strong>Proposta inicial: {formatCurrency(selected.valorProposto)}</strong>}</div>
              <p>{selected.mensagemInicial}</p>
            </div>

            {selected.status === 'pendente' && usuario?.tipo === 'startup' ? <div className="connection-decision"><h3>Este investidor quer conversar</h3><p>Aceite para liberar o chat ou recuse a conexão.</p><div><button className="button button-outline" type="button" disabled={busy} onClick={() => void respond('recusado')}><X size={17} />Recusar</button><button className="button button-navy" type="button" disabled={busy} onClick={() => void respond('aceito')}><Check size={17} />Aceitar conexão</button></div></div>
              : selected.status === 'pendente' ? <ConversationEmpty icon={<Clock3 size={30} />} title="Aguardando resposta" text="A startup recebeu seu interesse. O chat será liberado após o aceite." />
              : selected.status === 'recusado' ? <ConversationEmpty icon={<X size={30} />} title="Conexão não aceita" text="Esta solicitação foi encerrada pela startup." />
              : <>
                <div className="conversation-messages" aria-live="polite">
                  {messagesLoading ? <ConversationEmpty icon={<LoaderCircle className="feed-spin" size={28} />} title="Carregando conversa" text="Buscando as mensagens." />
                    : messages.length === 0 ? <ConversationEmpty icon={<MessageCircle size={30} />} title="Conversa liberada" text="Envie a primeira mensagem para iniciar a negociação." />
                    : messages.map((message) => <div className={`conversation-message ${message.remetenteId === usuario?.id ? 'is-mine' : ''}`} key={message.id}><div><strong>{message.remetenteId === usuario?.id ? 'Você' : message.remetenteNome}</strong><time dateTime={message.criadoEm}>{formatDateTime(message.criadoEm)}</time></div><p>{message.conteudo}</p></div>)}
                </div>
                <form className="conversation-compose" onSubmit={send}><textarea maxLength={1000} rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escreva uma mensagem…" aria-label="Nova mensagem" /><button className="button button-navy" type="submit" disabled={!draft.trim() || busy}>{busy ? <LoaderCircle className="feed-spin" size={18} /> : <Send size={18} />}Enviar</button></form>
              </>}
          </>}
        </section>
      </section>
    </div>
    {investorProfileUserId && <InvestorDetailsModal investorUserId={investorProfileUserId} onClose={() => setInvestorProfileUserId(null)} />}
  </main>
}

function ConversationEmpty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="conversation-empty">{icon}<h3>{title}</h3><p>{text}</p></div>
}

function Avatar({ nome, imagem, tipo, large = false, profileTrigger = false }: { nome: string; imagem: string | null; tipo: 'startup' | 'investidor'; large?: boolean; profileTrigger?: boolean }) {
  const fallback = tipo === 'investidor' ? genericInvestorImage : genericStartupImage
  return <span className={`conversation-avatar${large ? ' conversation-avatar-large' : ''}${profileTrigger ? ' is-profile-trigger' : ''}`} data-profile-trigger={profileTrigger ? '' : undefined}><img
    src={imagem || fallback}
    alt={imagem ? `Imagem de perfil de ${nome}` : ''}
    onError={(event) => {
      event.currentTarget.onerror = null
      event.currentTarget.src = fallback
    }}
  /></span>
}
function formatCurrency(value: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value) }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
function counterpartSubtitle(connection: ConnectionData) {
  return connection.contraparte.tipo === 'investidor'
    ? connection.contraparte.tipoInvestidor || 'Investidor'
    : connection.contraparte.nomeResponsavel || 'Responsável pela startup'
}
