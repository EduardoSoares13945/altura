import { ArrowLeft, Check, CheckCircle2, CircleDollarSign, Clock3, CreditCard, LoaderCircle, LogOut, MessageCircle, QrCode, Send, ShieldCheck, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import genericInvestorImage from '../assets/generic_Investor.png'
import genericStartupImage from '../assets/generic_Startup.png'
import { signOut } from '../auth/authApi'
import { useAuth } from '../auth/useAuth'
import {
  carregarConexoes,
  carregarMensagens,
  carregarPropostas,
  cancelarProposta,
  criarProposta,
  enviarMensagem,
  excluirConexao,
  responderProposta,
  responderConexao,
  type ConnectionData,
  type MessageData,
  type ProposalData,
} from '../lib/connectionApi'
import { traduzirErroApi } from '../lib/apiErrors'
import { subscribeRealtime } from '../lib/realtime'
import { Brand } from './Brand'
import { DashboardNavMenu } from './DashboardNavMenu'
import { InvestorDetailsModal } from './InvestorDetailsModal'
import { ThemeToggle } from './ThemeToggle'
import { useToast } from './ToastProvider'

interface ConversationsPageProps { onBack: () => void; onOpenStartup: (userId: string) => void }

const statusLabels = { pendente: 'Pendente', aceito: 'Conexão ativa', recusado: 'Recusada' } as const

export function ConversationsPage({ onBack, onOpenStartup }: ConversationsPageProps) {
  const { usuario } = useAuth()
  const [connections, setConnections] = useState<ConnectionData[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [messages, setMessages] = useState<MessageData[]>([])
  const [proposals, setProposals] = useState<ProposalData[]>([])
  const [proposalValue, setProposalValue] = useState('')
  const [proposalMessage, setProposalMessage] = useState('')
  const [proposalFormOpen, setProposalFormOpen] = useState(false)
  const [paymentProposal, setPaymentProposal] = useState<ProposalData | null>(null)
  const [paidProposalIds, setPaidProposalIds] = useState<number[]>(() => readSimulatedPayments(usuario?.id))
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const { showError } = useToast()
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

  useEffect(() => {
    setPaidProposalIds(readSimulatedPayments(usuario?.id))
  }, [usuario?.id])

  const loadConnections = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const items = await carregarConexoes()
      setConnections(items)
      setSelectedId((current) => current && items.some((item) => item.id === current)
        ? current
        : items[0]?.id ?? null)
    } catch (requestError) {
      showError(traduzirErroApi(requestError))
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
    } catch (requestError) {
      showError(traduzirErroApi(requestError))
    } finally {
      if (showLoading) setMessagesLoading(false)
    }
  }, [])

  const loadProposals = useCallback(async (connectionId: number) => {
    try { setProposals(await carregarPropostas(connectionId)) }
    catch (requestError) { showError(traduzirErroApi(requestError)) }
  }, [showError])

  useEffect(() => {
    void loadConnections(true)
    const timer = window.setInterval(() => void loadConnections(), 10000)
    return () => window.clearInterval(timer)
  }, [loadConnections])

  useEffect(() => {
    setProposalFormOpen(false)
    if (!selected) { setProposals([]); return }
    void loadProposals(selected.id)
  }, [loadProposals, selected?.id])

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
      return
    }
    if (event.type === 'connection.changed') {
      void loadConnections()
      return
    }
    if (event.type === 'proposal.changed') {
      void loadConnections()
      if (event.connectionId === selectedIdRef.current) void loadProposals(event.connectionId)
    }
  }), [loadConnections, loadProposals])

  const submitProposal = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected || busy || Number(proposalValue) <= 0) return
    setBusy(true)
    try {
      const created = await criarProposta(selected.id, Number(proposalValue), proposalMessage)
      setProposals((current) => [...current.map((item) => item.status === 'pendente' ? { ...item, status: 'substituida' as const } : item), created])
      setProposalValue(''); setProposalMessage('')
      setProposalFormOpen(false)
    } catch (requestError) { showError(traduzirErroApi(requestError)) }
    finally { setBusy(false) }
  }

  const changeProposal = async (proposal: ProposalData, status: 'aceita' | 'recusada' | 'cancelada') => {
    if (busy) return
    setBusy(true)
    try {
      if (status === 'cancelada') await cancelarProposta(proposal.id)
      else await responderProposta(proposal.id, status)
      await loadProposals(proposal.connectionId)
      void loadConnections()
    } catch (requestError) { showError(traduzirErroApi(requestError)) }
    finally { setBusy(false) }
  }

  const respond = async (status: 'aceito' | 'recusado') => {
    if (!selected || busy) return
    setBusy(true)
    try {
      const updated = await responderConexao(selected.id, status)
      if (status === 'recusado') {
        setConnections((current) => current.filter((item) => item.id !== updated.id))
        setSelectedId((current) => current === updated.id ? null : current)
        setMessages([])
      } else {
        setConnections((current) => current.map((item) => item.id === updated.id ? updated : item))
      }
    } catch (requestError) {
      showError(traduzirErroApi(requestError))
    } finally {
      setBusy(false)
    }
  }

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected || !draft.trim() || busy) return
    setBusy(true)
    try {
      const message = await enviarMensagem(selected.id, draft.trim())
      setMessages((current) => [...current, message])
      setDraft('')
      void loadConnections()
    } catch (requestError) {
      showError(traduzirErroApi(requestError))
    } finally {
      setBusy(false)
    }
  }

  const removeConnection = async () => {
    if (!selected || busy) return
    const isRequester = selected.solicitanteUsuarioId === usuario?.id
    const confirmation = usuario?.tipo === 'investidor' && isRequester
      ? `Cancelar a proposta enviada para ${selected.contraparte.nome}? Todo o histórico desta conexão será apagado.`
      : isRequester
        ? `Cancelar a solicitação enviada para ${selected.contraparte.nome}? Todo o histórico desta conexão será apagado.`
        : `Excluir a conexão com ${selected.contraparte.nome}? Todo o histórico de mensagens será apagado.`
    if (!window.confirm(confirmation)) return
    setBusy(true)
    try {
      await excluirConexao(selected.id)
      setMessages([])
      await loadConnections()
    } catch (requestError) {
      showError(traduzirErroApi(requestError))
    } finally {
      setBusy(false)
    }
  }

  const completeSimulatedPayment = (proposalId: number) => {
    setPaidProposalIds((current) => {
      const next = current.includes(proposalId) ? current : [...current, proposalId]
      window.localStorage.setItem(simulatedPaymentsKey(usuario?.id), JSON.stringify(next))
      return next
    })
  }

  return <main id="conteudo" className="dashboard-shell conversations-page">
    <header className="dashboard-header">
      <div className="dashboard-header-content">
        <div className="dashboard-brand"><DashboardNavMenu /><Brand /><div className="dashboard-user-info"><p className="kicker">Rede Altura</p><h1>Conexões e conversas</h1></div></div>
        <div className="dashboard-actions"><ThemeToggle /><button className="button button-ghost button-compact" type="button" onClick={onBack}><ArrowLeft size={17} /><span>Painel</span></button><button className="button button-outline button-compact" type="button" onClick={() => void signOut()}><LogOut size={17} /><span>Sair</span></button></div>
      </div>
    </header>

    <div className="dashboard-content conversations-content">
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
              <button className="button button-ghost button-compact connection-delete" type="button" disabled={busy} onClick={() => void removeConnection()}>{selected.solicitanteUsuarioId === usuario?.id ? <X size={17} /> : <Trash2 size={17} />}<span>{selected.solicitanteUsuarioId === usuario?.id ? (usuario?.tipo === 'investidor' ? 'Cancelar proposta' : 'Cancelar solicitação') : 'Excluir conexão'}</span></button>
            </header>

            <div className="connection-proposal">
              <div><span>Mensagem inicial</span>{selected.valorProposto !== null && <strong>Proposta inicial: {formatCurrency(selected.valorProposto)}</strong>}</div>
              <p>{selected.mensagemInicial}</p>
            </div>

            {selected.status === 'aceito' && <ProposalNegotiation proposals={proposals} currentUserId={usuario?.id ?? ''} isInvestor={usuario?.tipo === 'investidor'} paidProposalIds={paidProposalIds} value={proposalValue} message={proposalMessage} busy={busy} composerOpen={proposalFormOpen} onValue={setProposalValue} onMessage={setProposalMessage} onOpenComposer={() => setProposalFormOpen(true)} onCloseComposer={() => { setProposalFormOpen(false); setProposalValue(''); setProposalMessage('') }} onOpenPayment={setPaymentProposal} onSubmit={submitProposal} onChange={changeProposal} />}

            {selected.status === 'pendente' && selected.solicitanteUsuarioId !== usuario?.id ? <div className="connection-decision"><h3>{usuario?.tipo === 'investidor' ? 'Esta startup quer conversar' : 'Este investidor quer conversar'}</h3><p>Aceite para liberar o chat ou recuse a conexão.</p><div><button className="button button-outline" type="button" disabled={busy} onClick={() => void respond('recusado')}><X size={17} />Recusar</button><button className="button button-navy" type="button" disabled={busy} onClick={() => void respond('aceito')}><Check size={17} />Aceitar conexão</button></div></div>
              : selected.status === 'pendente' ? <ConversationEmpty icon={<Clock3 size={30} />} title="Aguardando resposta" text={`${selected.contraparte.nome} recebeu sua solicitação. O chat será liberado após o aceite.`} />
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
    {paymentProposal && <PaymentSimulationModal proposal={paymentProposal} startupName={selected?.contraparte.tipo === 'startup' ? selected.contraparte.nome : 'a startup'} onClose={() => setPaymentProposal(null)} onComplete={() => completeSimulatedPayment(paymentProposal.id)} />}
  </main>
}

function ConversationEmpty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="conversation-empty">{icon}<h3>{title}</h3><p>{text}</p></div>
}

function ProposalNegotiation({ proposals, currentUserId, isInvestor, paidProposalIds, value, message, busy, composerOpen, onValue, onMessage, onOpenComposer, onCloseComposer, onOpenPayment, onSubmit, onChange }: { proposals: ProposalData[]; currentUserId: string; isInvestor: boolean; paidProposalIds: number[]; value: string; message: string; busy: boolean; composerOpen: boolean; onValue: (value: string) => void; onMessage: (value: string) => void; onOpenComposer: () => void; onCloseComposer: () => void; onOpenPayment: (proposal: ProposalData) => void; onSubmit: (event: FormEvent) => void; onChange: (proposal: ProposalData, status: 'aceita' | 'recusada' | 'cancelada') => void }) {
  const pending = proposals.find((item) => item.status === 'pendente')
  const latest = proposals.at(-1)
  const pendingIsMine = pending?.autorUsuarioId === currentUserId
  const isCounteroffer = Boolean(pending && proposals.some((proposal) => proposal.id !== pending.id))
  const composeLabel = pending ? 'Fazer contraproposta' : proposals.length ? 'Fazer nova proposta' : 'Fazer proposta'
  const accepted = [...proposals].reverse().find((proposal) => proposal.status === 'aceita')

  return <section className="proposal-negotiation" aria-labelledby="proposal-negotiation-title">
    <div className="proposal-negotiation-heading"><div><p className="kicker">Negociação</p><h3 id="proposal-negotiation-title">Proposta de investimento</h3></div>{pending && <span className="proposal-pending-badge">Aguardando resposta</span>}</div>
    {latest ? <article className={`proposal-current is-${latest.status}`}>
      <div className="proposal-current-heading"><div><span>{pending ? (isCounteroffer ? 'Contraproposta' : 'Proposta em análise') : 'Última proposta'}</span><strong>{latest.autorUsuarioId === currentUserId ? 'Enviada por você' : `Enviada por ${latest.autorNome}`}</strong></div><time>{formatDateTime(latest.criadaEm)}</time></div>
      <p>{formatCurrency(latest.valor)}</p>{latest.mensagem && <small>{latest.mensagem}</small>}
      {pending && <div className="proposal-current-actions">{pendingIsMine ? <><span className="proposal-waiting-copy">A outra parte precisa responder antes de uma nova proposta.</span><button className="button button-ghost button-compact connection-delete" type="button" disabled={busy} onClick={() => onChange(pending, 'cancelada')}><X size={15} />Cancelar proposta</button></> : <><button className="button button-outline button-compact" type="button" disabled={busy} onClick={onOpenComposer}><CircleDollarSign size={15} />Fazer contraproposta</button><button className="button button-navy button-compact" type="button" disabled={busy} onClick={() => onChange(pending, 'aceita')}><Check size={15} />Aceitar</button></>}</div>}
    </article> : <div className="proposal-empty-state"><CircleDollarSign size={21} /><div><strong>Nenhuma proposta formal ainda</strong><span>Envie uma proposta para iniciar a negociação.</span></div></div>}
    {!pending && !composerOpen && <div className="proposal-new-action"><button className="button button-outline button-compact" type="button" disabled={busy} onClick={onOpenComposer}><CircleDollarSign size={16} />{composeLabel}</button></div>}
    {composerOpen && <form className="proposal-counter-form" onSubmit={onSubmit}><div className="proposal-counter-form-heading"><strong>{pending ? 'Nova contraproposta' : 'Nova proposta'}</strong><button type="button" onClick={onCloseComposer} disabled={busy} aria-label="Fechar formulário de proposta"><X size={17} /></button></div><label>Valor da proposta<span><CircleDollarSign size={17} /><input type="number" min={1000} step={1000} value={value} onChange={(event) => onValue(event.target.value)} placeholder="Ex.: 100.000" /></span></label><label>Contexto opcional<textarea maxLength={500} rows={2} value={message} onChange={(event) => onMessage(event.target.value)} placeholder="Condições, prazo ou observações…" /></label><div className="proposal-counter-actions"><button className="button button-ghost button-compact" type="button" onClick={onCloseComposer} disabled={busy}>Cancelar</button><button className="button button-navy button-compact" disabled={busy || Number(value) <= 0}><Send size={16} />Enviar {pending ? 'contraproposta' : 'proposta'}</button></div></form>}
    {isInvestor && accepted && <section className={`simulated-payment-card${paidProposalIds.includes(accepted.id) ? ' is-paid' : ''}`} aria-label="Pagamento simulado"><div className="simulated-payment-icon">{paidProposalIds.includes(accepted.id) ? <CheckCircle2 size={21} /> : <ShieldCheck size={21} />}</div><div><span>{paidProposalIds.includes(accepted.id) ? 'Pagamento simulado confirmado' : 'Proposta aceita'}</span><strong>{paidProposalIds.includes(accepted.id) ? 'Aporte marcado como pago neste dispositivo.' : `Conclua o aporte de ${formatCurrency(accepted.valor)}.`}</strong><small>Ambiente de demonstração: nenhum pagamento real será processado.</small></div>{!paidProposalIds.includes(accepted.id) && <button className="button button-navy button-compact" type="button" onClick={() => onOpenPayment(accepted)}><CreditCard size={16} />Simular pagamento</button>}</section>}
  </section>
}

function PaymentSimulationModal({ proposal, startupName, onClose, onComplete }: { proposal: ProposalData; startupName: string; onClose: () => void; onComplete: () => void }) {
  const [method, setMethod] = useState<'pix' | 'card'>('pix')
  const [completed, setCompleted] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !completed) onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [completed, onClose])

  const confirm = () => { onComplete(); setCompleted(true) }
  return createPortal(<div className="details-modal-backdrop payment-simulation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !completed) onClose() }}><section className="payment-simulation-modal" role="dialog" aria-modal="true" aria-labelledby="payment-simulation-title"><button ref={closeRef} className="details-modal-close" type="button" onClick={onClose} aria-label="Fechar pagamento simulado"><X size={20} /></button>{completed ? <div className="payment-success"><CheckCircle2 size={43} /><p className="kicker">Pagamento simulado</p><h2 id="payment-simulation-title">Pagamento confirmado</h2><p>O aporte de {formatCurrency(proposal.valor)} foi marcado como pago apenas nesta demonstração.</p><button className="button button-navy" type="button" onClick={onClose}>Concluir</button></div> : <><p className="kicker">Ambiente de demonstração</p><h2 id="payment-simulation-title">Simular pagamento</h2><p className="payment-simulation-intro">Aporte para {startupName}: <strong>{formatCurrency(proposal.valor)}</strong></p><div className="payment-methods" role="radiogroup" aria-label="Método de pagamento"><button className={method === 'pix' ? 'is-selected' : ''} type="button" role="radio" aria-checked={method === 'pix'} onClick={() => setMethod('pix')}><QrCode size={21} /><span>PIX</span><small>Confirmação imediata</small></button><button className={method === 'card' ? 'is-selected' : ''} type="button" role="radio" aria-checked={method === 'card'} onClick={() => setMethod('card')}><CreditCard size={21} /><span>Cartão de crédito</span><small>Cartão de teste •••• 4242</small></button></div><div className="payment-simulation-detail">{method === 'pix' ? <><QrCode size={44} aria-hidden="true" /><div><strong>PIX de demonstração</strong><span>Código fictício disponível para confirmação.</span></div></> : <><CreditCard size={44} aria-hidden="true" /><div><strong>Cartão de demonstração</strong><span>Nenhum dado de cartão será solicitado ou enviado.</span></div></>}</div><p className="payment-simulation-disclaimer">Esta etapa não realiza transações, não armazena dados financeiros e não possui integração com instituições de pagamento.</p><div className="payment-simulation-actions"><button className="button button-ghost" type="button" onClick={onClose}>Cancelar</button><button className="button button-navy" type="button" onClick={confirm}><Check size={17} />Confirmar pagamento simulado</button></div></>}</section></div>, document.body)
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
const simulatedPaymentsKey = (userId?: string) => `altura:simulated-paid-proposals:${userId ?? 'anonymous'}`
function readSimulatedPayments(userId?: string): number[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(simulatedPaymentsKey(userId)) ?? '[]')
    return Array.isArray(stored) ? stored.filter((id): id is number => typeof id === 'number') : []
  } catch { return [] }
}
function counterpartSubtitle(connection: ConnectionData) {
  return connection.contraparte.tipo === 'investidor'
    ? connection.contraparte.tipoInvestidor || 'Investidor'
    : connection.contraparte.nomeResponsavel || 'Responsável pela startup'
}

