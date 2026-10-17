import { ArrowLeft, CalendarDays, Check, CircleDollarSign, Edit3, LoaderCircle, Rocket, Target, TrendingUp, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../auth/useAuth'
import { traduzirErroApi } from '../lib/apiErrors'
import { atualizarRodada, atualizarStatusRodada, carregarMinhasRodadas, type ManagedRoundData, type RoundInput, type RoundStatus } from '../lib/roundApi'
import { subscribeRealtime } from '../lib/realtime'
import { Brand } from './Brand'
import { DashboardNavMenu } from './DashboardNavMenu'
import { ThemeToggle } from './ThemeToggle'
import { useToast } from './ToastProvider'

interface Props { onBack: () => void }
const emptyForm: RoundInput = { valorAlvo: 500000, percentualEquityOferecido: 5, dataFim: null }

export function RoundsManagementPage({ onBack }: Props) {
  const { usuario } = useAuth()
  const [rounds, setRounds] = useState<ManagedRoundData[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const { showError } = useToast()
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState<RoundInput>(emptyForm)

  const load = async () => {
    try { setRounds(await carregarMinhasRodadas()) }
    catch (cause) { showError(traduzirErroApi(cause)) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => subscribeRealtime((event) => {
    if (event.type === 'round.changed' || event.type === 'proposal.changed') void load()
  }), [])

  if (usuario?.tipo !== 'startup') return <main id="conteudo" className="dashboard-shell"><div className="dashboard-content"><div className="access-denied"><Rocket size={46} /><h3>Área exclusiva para startups</h3><button className="button button-outline" onClick={onBack}>Voltar</button></div></div></main>

  const openEdit = (round: ManagedRoundData) => {
    setEditing(round.id)
    setForm({ valorAlvo: round.valorAlvo, percentualEquityOferecido: round.percentualEquityOferecido, dataFim: round.dataFim })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editing) return
    setBusy(true)
    try {
      const saved = await atualizarRodada(editing, form)
      setRounds((current) => current.map((item) => item.id === saved.id ? saved : item))
      setEditing(null)
    } catch (cause) { showError(traduzirErroApi(cause)) }
    finally { setBusy(false) }
  }

  const changeStatus = async (round: ManagedRoundData, status: RoundStatus) => {
    const action = status === 'aberta' ? 'Reabrir' : status === 'encerrada' ? 'Encerrar' : 'Cancelar'
    if (!window.confirm(`${action} esta rodada?`)) return
    setBusy(true)
    try {
      const saved = await atualizarStatusRodada(round.id, status)
      setRounds((items) => items.map((item) => item.id === saved.id ? saved : item))
    } catch (cause) { showError(traduzirErroApi(cause)) }
    finally { setBusy(false) }
  }

  const round = rounds[0]
  return <main id="conteudo" className="dashboard-shell">
    <header className="dashboard-header"><div className="dashboard-header-content"><div className="dashboard-brand"><DashboardNavMenu /><Brand /><div className="dashboard-user-info"><p className="kicker">Captação</p><h1>Gerenciar rodada</h1></div></div><div className="dashboard-actions"><ThemeToggle /><button className="button button-ghost button-compact" onClick={onBack}><ArrowLeft size={17} />Painel</button></div></div></header>
    <div className="dashboard-content rounds-management">
      <section className="rounds-management-hero">
        <div className="rounds-management-hero-mark" aria-hidden="true"><Rocket size={26} /></div>
        <div><p className="kicker">Ciclo de captação</p><h2>Sua rodada de captação</h2><p>Atualize os termos definidos no cadastro e acompanhe sua evolução em tempo real.</p></div>
      </section>


      {editing !== null && <RoundEditorModal form={form} busy={busy} onChange={setForm} onClose={() => setEditing(null)} onSubmit={submit} />}

      <section className="rounds-management-summary">
        <div className="section-header"><div><p className="kicker">Visão da captação</p><h2>Rodada cadastrada</h2></div><p className="section-description">{round ? 'Uma rodada vinculada ao seu perfil' : 'Nenhuma rodada vinculada'}</p></div>
        {loading ? <div className="activity-placeholder"><LoaderCircle className="feed-spin" size={28} /><p>Carregando rodada...</p></div>
          : !round ? <div className="activity-placeholder"><Rocket size={38} /><h3>Cadastre sua rodada no perfil</h3><p>A rodada é criada junto com o cadastro da startup e pode ser alterada aqui.</p></div>
            : <RoundCard round={round} busy={busy} onEdit={() => openEdit(round)} onStatus={(status) => void changeStatus(round, status)} />}
      </section>
    </div>
  </main>
}

function RoundCard({ round, busy, onEdit, onStatus }: { round: ManagedRoundData; busy: boolean; onEdit: () => void; onStatus: (status: RoundStatus) => void }) {
  const progress = round.valorAlvo > 0 ? Math.min(100, Math.round(round.valorCaptado / round.valorAlvo * 100)) : 0
  const remaining = Math.max(0, round.valorAlvo - round.valorCaptado)
  return <article className="managed-round-card">
    <header className="managed-round-card-top"><div className="managed-round-status-block"><span className={`managed-round-status is-${round.status}`}><i aria-hidden="true" />{statusLabel(round.status)}</span><p>{statusDescription(round.status)} · iniciada em {formatDate(round.dataInicio)}</p></div><div className="managed-round-deadline"><CalendarDays size={16} /><span>{round.dataFim ? `Encerra em ${formatDate(round.dataFim)}` : 'Sem prazo definido'}</span></div></header>
    <div className="managed-round-highlight"><div><span>Capital captado</span><strong>{money(round.valorCaptado)}</strong><small>de {money(round.valorAlvo)}</small></div><div className="managed-round-percent"><TrendingUp size={18} /><strong>{progress}%</strong><span>concluído</span></div></div>
    <div className="managed-round-progress"><span style={{ width: `${progress}%` }} /></div>
    <div className="managed-round-progress-copy"><span>{money(remaining)} restantes para a meta</span><span>{progress}% da meta atingida</span></div>
    <div className="managed-round-metrics"><div><span>Meta</span><strong>{money(round.valorAlvo)}</strong></div><div><span>Equity oferecido</span><strong>{round.percentualEquityOferecido}%</strong></div><div><span>Propostas</span><strong>{round.propostas}</strong><small>{round.propostasPendentes} pendente{round.propostasPendentes === 1 ? '' : 's'}</small></div></div>
    <footer className="managed-round-actions">{round.status === 'aberta' && <button className="button button-navy button-compact" disabled={busy} onClick={onEdit}><Edit3 size={16} />Editar rodada</button>}{round.status === 'aberta' ? <button className="button button-outline button-compact" disabled={busy} onClick={() => onStatus('encerrada')}>Encerrar</button> : <button className="button button-outline button-compact" disabled={busy} onClick={() => onStatus('aberta')}>Reabrir rodada</button>}</footer>
  </article>
}

function RoundEditorModal({ form, busy, onChange, onClose, onSubmit }: { form: RoundInput; busy: boolean; onChange: (form: RoundInput) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(<div className="details-modal-backdrop round-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <section className="round-editor round-editor-modal" role="dialog" aria-modal="true" aria-labelledby="round-editor-title">
      <div className="round-editor-heading"><div><p className="kicker">Editar rodada</p><h3 id="round-editor-title">Atualize os termos da captação</h3><p>As alterações serão refletidas na sua oportunidade para investidores.</p></div><button ref={closeRef} type="button" aria-label="Fechar edição da rodada" onClick={onClose} disabled={busy}><X size={19} /></button></div>
      <form onSubmit={onSubmit}>
        <div className="round-editor-grid">
          <label>Meta de captação<span><CircleDollarSign size={17} /><input type="number" min={1000} step={1000} value={form.valorAlvo} onChange={(event) => onChange({ ...form, valorAlvo: Number(event.target.value) })} /></span></label>
          <label>Equity oferecido (%)<span><Target size={17} /><input type="number" min={0.1} max={49.9} step={0.1} value={form.percentualEquityOferecido} onChange={(event) => onChange({ ...form, percentualEquityOferecido: Number(event.target.value) })} /></span></label>
          <label>Encerramento previsto <small>(opcional)</small><span><CalendarDays size={17} /><input type="date" min={new Date().toISOString().slice(0, 10)} value={form.dataFim ?? ''} onChange={(event) => onChange({ ...form, dataFim: event.target.value || null })} /></span>{form.dataFim && <button className="round-editor-clear-date" type="button" onClick={() => onChange({ ...form, dataFim: null })}>Remover data</button>}</label>
        </div>
        <div className="round-editor-actions"><button className="button button-ghost" type="button" onClick={onClose} disabled={busy}>Cancelar</button><button className="button button-navy" disabled={busy}>{busy ? <LoaderCircle className="feed-spin" size={17} /> : <Check size={17} />}Salvar alterações</button></div>
      </form>
    </section>
  </div>, document.body)
}

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T00:00:00`))
const statusLabel = (status: RoundStatus) => status === 'aberta' ? 'Aberta' : status === 'encerrada' ? 'Encerrada' : 'Cancelada'
const statusDescription = (status: RoundStatus) => status === 'aberta' ? 'Recebendo propostas' : status === 'encerrada' ? 'Captação encerrada' : 'Rodada cancelada'
