import { ArrowLeft, ArrowRight, BarChart3, Building2, DollarSign, Filter, Globe, HelpCircle, Info, LoaderCircle, MapPin, Search, SlidersHorizontal, TrendingUp, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import genericStartupImage from '../assets/generic_Startup.png'
import { useAuth } from '../auth/useAuth'
import { carregarConexoes, excluirConexao, type ConnectionData } from '../lib/connectionApi'
import { traduzirErroApi } from '../lib/apiErrors'
import { carregarPerfilInvestidor, carregarRodadasAbertas, type InvestidorPerfilData, type MatchScoreData, type RodadaDisponivelData } from '../lib/perfilApi'
import { subscribeRealtime } from '../lib/realtime'
import { Brand } from './Brand'
import { DashboardNavMenu } from './DashboardNavMenu'
import { ConnectionProposalModal } from './ConnectionProposalModal'
import { RangeSlider } from './RangeSlider'
import { SegmentIcon } from './SegmentIcon'
import { ThemeToggle } from './ThemeToggle'
import { useErrorToast } from './ToastProvider'
import linkedinLogo from '../assets/svg/linkedin-svgrepo-com.svg'

interface ExplorarRodadasPageProps { onBack: () => void }
export function ExplorarRodadasPage({ onBack }: ExplorarRodadasPageProps) {
  const { usuario } = useAuth()
  const [rodadas, setRodadas] = useState<RodadaDisponivelData[]>([])
  const [perfilInvestidor, setPerfilInvestidor] = useState<InvestidorPerfilData | null>(null)
  const [segmentos, setSegmentos] = useState<string[]>([])
  const [filtroSegmento, setFiltroSegmento] = useState('todos')
  const [filtroTicketMin, setFiltroTicketMin] = useState(0)
  const [filtroTicketMax, setFiltroTicketMax] = useState(10000000)
  const [filtroEquityMin, setFiltroEquityMin] = useState(0)
  const [filtroMatchMin, setFiltroMatchMin] = useState(0)
  const [filtroLocalizacao, setFiltroLocalizacao] = useState('todas')
  const [filtroTracaoRecente, setFiltroTracaoRecente] = useState(0)
  const [filtroMrrMin, setFiltroMrrMin] = useState(0)
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [connections, setConnections] = useState<ConnectionData[]>([])
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [rodadaSelecionada, setRodadaSelecionada] = useState<RodadaDisponivelData | null>(null)
  const [proposalRound, setProposalRound] = useState<RodadaDisponivelData | null>(null)
  useErrorToast(actionError)
  useErrorToast(loadError)

  const openProposal = (rodada: RodadaDisponivelData) => {
    setRodadaSelecionada(null)
    setProposalRound(rodada)
  }

  const cancelProposal = async (connection: ConnectionData, startupName: string) => {
    if (cancellingId !== null) return
    if (!window.confirm(`Cancelar a proposta enviada para ${startupName}? Todo o histórico desta conexão será apagado.`)) return
    setCancellingId(connection.id)
    setActionError('')
    try {
      await excluirConexao(connection.id)
      setConnections((current) => current.filter((item) => item.id !== connection.id))
    } catch (error) {
      setActionError(traduzirErroApi(error))
    } finally {
      setCancellingId(null)
    }
  }

  useEffect(() => {
    let active = true
    void Promise.all([carregarRodadasAbertas(), carregarConexoes(), carregarPerfilInvestidor(usuario?.id ?? '')]).then(([items, currentConnections, investorProfile]) => {
      if (!active) return
      setRodadas(items)
      setConnections(currentConnections)
      setPerfilInvestidor(investorProfile)
      setSegmentos([...new Set(items.map((item) => item.startup.segmentoNome))].sort())
    }).catch(() => {
      if (active) setLoadError('Não foi possível carregar as rodadas. Tente novamente.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [usuario?.id])

  useEffect(() => subscribeRealtime((event) => {
    if (event.type === 'round.changed') {
      void carregarRodadasAbertas().then((items) => {
        setRodadas(items)
        setSegmentos([...new Set(items.map((item) => item.startup.segmentoNome))].sort())
      }).catch(() => undefined)
    }
    if (event.type === 'connection.changed' || event.type === 'connection.deleted' || event.type === 'proposal.changed') {
      void carregarConexoes().then(setConnections).catch(() => undefined)
    }
  }), [])

  const filtrosAtivos = busca !== '' || filtroSegmento !== 'todos' || filtroTicketMin !== 0 || filtroTicketMax !== 10000000 || filtroEquityMin !== 0 || filtroMatchMin !== 0 || filtroLocalizacao !== 'todas' || filtroTracaoRecente !== 0 || filtroMrrMin !== 0

  const limparFiltros = () => {
    setFiltroSegmento('todos')
    setFiltroTicketMin(0)
    setFiltroTicketMax(10000000)
    setFiltroEquityMin(0)
    setFiltroMatchMin(0)
    setFiltroLocalizacao('todas')
    setFiltroTracaoRecente(0)
    setFiltroMrrMin(0)
    setBusca('')
  }

  const rodadasFiltradas = rodadas.filter((rodada) => {
    const startup = rodada.startup
    const match = rodada.match
    const mesesTracao = mesesDesdeReferencia(startup.tracao?.mesReferencia)
    return (!busca || startup.nomeStartup.toLowerCase().includes(busca.toLowerCase()))
      && (filtroSegmento === 'todos' || startup.segmentoNome === filtroSegmento)
      && rodada.valorAlvo >= filtroTicketMin
      && rodada.valorAlvo <= filtroTicketMax
      && (filtroEquityMin === 0 || rodada.percentualEquityOferecido >= filtroEquityMin)
      && (filtroMatchMin === 0 || (match?.percentual ?? 0) >= filtroMatchMin)
      && (filtroLocalizacao === 'todas' || startup.estado === perfilInvestidor?.estado)
      && (filtroTracaoRecente === 0 || mesesTracao <= filtroTracaoRecente)
      && (filtroMrrMin === 0 || (startup.tracao?.mrr ?? 0) >= filtroMrrMin)
  })

  if (usuario?.tipo !== 'investidor') return <main id="conteudo" className="dashboard-shell"><header className="dashboard-header"><div className="dashboard-header-content"><div className="dashboard-brand"><DashboardNavMenu /><Brand /><div className="dashboard-user-info"><p className="kicker">Acesso Restrito</p><h1>Área exclusiva para investidores</h1></div></div><div className="dashboard-actions"><ThemeToggle /><button className="button button-ghost button-compact" type="button" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" /><span>Voltar</span></button></div></div></header><div className="dashboard-content"><section className="dashboard-section"><div className="access-denied"><Building2 size={48} aria-hidden="true" /><h3>Acesso exclusivo para investidores</h3><p>Esta funcionalidade está disponível apenas para perfis de investidor.</p></div></section></div></main>

  return <main id="conteudo" className="dashboard-shell">
    <header className="dashboard-header"><div className="dashboard-header-content"><div className="dashboard-brand"><DashboardNavMenu /><Brand /><div className="dashboard-user-info"><p className="kicker">Explorar Rodadas</p><h1>Encontre oportunidades de investimento</h1></div></div><div className="dashboard-actions"><ThemeToggle /><button className="button button-ghost button-compact" type="button" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" /><span>Voltar</span></button></div></div></header>
    <div className="dashboard-content">
      <section className="dashboard-section">
        <div className="filtros-panel">
          <div className="filtros-panel-header">
            <div className="filtros-panel-heading">
              <span className="filtros-panel-icon" aria-hidden="true"><SlidersHorizontal size={20} /></span>
              <div className="filtros-panel-copy">
                <p className="kicker">Refine sua busca</p>
                <h2>Filtros avançados</h2>
                <p className="filtros-panel-description">Compare startups com dados recentes de tração e encontre as oportunidades mais alinhadas à sua tese.</p>
              </div>
            </div>
            <button className="button button-outline button-compact filtros-clear" type="button" onClick={limparFiltros} disabled={!filtrosAtivos}><Filter size={17} aria-hidden="true" />Limpar filtros</button>
          </div>
          <div className="filtros-grid">
            <section className="filtros-section" aria-labelledby="filtros-startup-title">
              <div className="filtros-section-heading"><span>01</span><div><h3 id="filtros-startup-title">Encontre a startup</h3><p>Busque pelo nome e refine o perfil da oportunidade.</p></div></div>
              <div className="filtros-section-fields">
                <div className="filtro-grupo"><label>Buscar</label><div className="search-input"><Search size={18} aria-hidden="true" /><input type="text" placeholder="Nome da startup..." value={busca} onChange={(event) => setBusca(event.target.value)} /></div></div>
                <div className="filtro-grupo"><label>Segmento</label><select value={filtroSegmento} onChange={(event) => setFiltroSegmento(event.target.value)}><option value="todos">Todos os segmentos</option>{segmentos.map((segmento) => <option key={segmento} value={segmento}>{segmento}</option>)}</select></div>
                <div className="filtro-grupo"><label>Localização</label><select value={filtroLocalizacao} onChange={(event) => setFiltroLocalizacao(event.target.value)}><option value="todas">Todos os estados</option><option value="mesmo_estado">Mesmo estado que eu</option></select></div>
              </div>
            </section>
            <section className="filtros-section" aria-labelledby="filtros-financeiro-title">
              <div className="filtros-section-heading"><span>02</span><div><h3 id="filtros-financeiro-title">Critérios financeiros</h3><p>Defina o tamanho da oportunidade e os indicadores mínimos.</p></div></div>
              <div className="filtros-section-fields filtros-section-fields--financial">
                <div className="filtro-grupo"><label>Equity mínimo (%)</label><div className="valor-input"><DollarSign size={18} aria-hidden="true" /><input type="number" min={0} max={49.9} value={filtroEquityMin} onChange={(event) => setFiltroEquityMin(Number(event.target.value))} /></div></div>
                <div className="filtro-grupo"><label>MRR mínimo</label><div className="valor-input"><DollarSign size={18} aria-hidden="true" /><input type="number" min={0} step={1000} value={filtroMrrMin} onChange={(event) => setFiltroMrrMin(Math.max(0, Number(event.target.value)))} /></div></div>
                <div className="filtro-grupo filtro-grupo-ticket"><label>Faixa de ticket</label><RangeSlider min={0} max={10000000} step={50000} valueMin={filtroTicketMin} valueMax={filtroTicketMax} onChange={(min, max) => { setFiltroTicketMin(min); setFiltroTicketMax(max) }} hideLabel /></div>
              </div>
            </section>
            <section className="filtros-section" aria-labelledby="filtros-match-title">
              <div className="filtros-section-heading"><span>03</span><div><h3 id="filtros-match-title">Compatibilidade e tração</h3><p>Priorize startups alinhadas à sua tese e com dados recentes.</p></div></div>
              <div className="filtros-section-fields filtros-section-fields--match">
                <div className="filtro-grupo"><label>Match mínimo</label><select value={filtroMatchMin} onChange={(event) => setFiltroMatchMin(Number(event.target.value))}><option value={0}>Qualquer match</option><option value={50}>50% ou mais</option><option value={70}>70% ou mais</option><option value={85}>85% ou mais</option></select></div>
                <div className="filtro-grupo"><label>Atualização da tração</label><select value={filtroTracaoRecente} onChange={(event) => setFiltroTracaoRecente(Number(event.target.value))}><option value={0}>Qualquer período</option><option value={3}>Últimos 3 meses</option><option value={6}>Últimos 6 meses</option></select></div>
              </div>
            </section>
          </div>
        </div>
      </section>
      <section className="dashboard-section"><div className="section-header"><h2>Rodadas disponíveis</h2><p className="section-description">{loading ? 'Carregando rodadas...' : `${rodadasFiltradas.length} rodada${rodadasFiltradas.length === 1 ? '' : 's'} encontrada${rodadasFiltradas.length === 1 ? '' : 's'}`}</p></div>
        {loadError ? <EmptyState title="Não foi possível carregar as rodadas" text={loadError} /> : !loading && rodadasFiltradas.length === 0 ? <EmptyState title="Nenhuma rodada encontrada" text="Não há oportunidades reais que correspondam aos filtros atuais." /> : <div className="rodadas-grid">{rodadasFiltradas.map((rodada) => {
          const connection = connections.find((item) => item.rodada.captacaoId === rodada.id)
          return <RodadaCard key={rodada.id} rodada={rodada} match={rodada.match} connection={connection} cancelling={connection?.id === cancellingId} onDetails={() => setRodadaSelecionada(rodada)} onPropose={() => openProposal(rodada)} onCancel={() => connection && void cancelProposal(connection, rodada.startup.nomeStartup)} />
        })}</div>}
      </section>
    </div>
    {rodadaSelecionada && <StartupDetailsModal rodada={rodadaSelecionada} connection={connections.find((item) => item.rodada.captacaoId === rodadaSelecionada.id)} cancelling={connections.some((item) => item.rodada.captacaoId === rodadaSelecionada.id && item.id === cancellingId)} onClose={() => setRodadaSelecionada(null)} onPropose={() => openProposal(rodadaSelecionada)} onCancel={(connection) => void cancelProposal(connection, rodadaSelecionada.startup.nomeStartup)} />}
    {proposalRound && <ConnectionProposalModal rodada={proposalRound} onClose={() => setProposalRound(null)} onCreated={(connection) => { setConnections((current) => [connection, ...current]); setProposalRound(null) }} />}
  </main>
}

function EmptyState({ title, text }: { title: string; text: string }) { return <div className="activity-placeholder"><div className="activity-empty"><div className="activity-icon"><Search size={48} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p></div></div> }

function RodadaProgresso({ rodada }: { rodada: RodadaDisponivelData }) {
  const progresso = rodada.valorAlvo > 0 ? Math.min(100, Math.round((rodada.valorCaptado / rodada.valorAlvo) * 100)) : 0
  return <div className="rodada-card-progresso"><div className="progresso-header"><span className="progresso-label">Progresso da rodada</span><span className="progresso-porcentagem">{progresso}%</span></div><div className="progresso-bar"><div className="progresso-fill" style={{ width: `${progresso}%` }} /></div><div className="progresso-footer"><span>{formatarMoeda(rodada.valorCaptado)} captados</span></div></div>
}

function RodadaCard({ rodada, match, connection, cancelling, onDetails, onPropose, onCancel }: { rodada: RodadaDisponivelData; match: MatchScoreData | null; connection?: ConnectionData; cancelling: boolean; onDetails: () => void; onPropose: () => void; onCancel: () => void }) {
  const { startup } = rodada
  const progresso = rodada.valorAlvo > 0 ? Math.min(100, Math.round((rodada.valorCaptado / rodada.valorAlvo) * 100)) : 0
  const fundacaoTexto = startup.dataFundacao ? `Fundada em ${formatarMesAno(startup.dataFundacao)}` : 'Fundação não informada'
  return <div className="startup-profile-preview-card rodada-preview-card">
    <div className="startup-profile-preview-header">
      <a className="round-startup-profile-link round-startup-logo-link" href={`/startups/${startup.usuarioId}`} aria-label={`Abrir perfil da ${startup.nomeStartup}`}><div className="startup-profile-preview-logo"><img src={startup.imagemPerfil || genericStartupImage} alt={startup.imagemPerfil ? `Imagem de perfil da ${startup.nomeStartup}` : ''} loading="lazy" /></div></a>
      <div>
        <h3><a className="round-startup-profile-link" href={`/startups/${startup.usuarioId}`}>{startup.nomeStartup}</a></h3>
        <p>
          <span className="segment-preview-primary"><SegmentIcon nome={startup.segmentoNome} />{startup.segmentoNome}</span>
        </p>
      </div>
      <span className="startup-profile-preview-status is-open">Rodada aberta</span>
    </div>
    <div className="startup-profile-preview-metrics">
      <div><span>Meta</span><strong>{formatarMoeda(rodada.valorAlvo)}</strong></div>
      <div><span>Equity oferecido</span><strong>{rodada.percentualEquityOferecido}%</strong></div>
    </div>
    <div className="startup-profile-preview-progress">
      <div><span>Progresso da rodada</span><strong>{progresso}%</strong></div>
      <div className="startup-profile-preview-progress-bar"><span style={{ width: `${progresso}%` }} /></div>
      <small>{formatarMoeda(rodada.valorCaptado)} captados · {fundacaoTexto}</small>
    </div>
    <div className="startup-profile-preview-traction">
      <div className="startup-profile-preview-traction-heading"><TrendingUp size={16} aria-hidden="true" /><span>Tração mais recente</span></div>
      {startup.tracao ? <TractionSummary tracao={startup.tracao} /> : <small>Esta startup ainda não informou seus sinais de tração.</small>}
    </div>
    {match && <MatchIndicator id={rodada.id} result={match} />}
    <div className="startup-profile-preview-actions">{connection ? <button className="button button-proposal-cancel button-compact" type="button" disabled={cancelling} onClick={onCancel}>{cancelling ? <LoaderCircle className="feed-spin" size={16} /> : <X size={16} aria-hidden="true" />}Cancelar proposta</button> : <button className="button button-navy button-compact" type="button" onClick={onPropose}>Tenho interesse<ArrowRight size={16} aria-hidden="true" /></button>}<button className="button button-outline button-compact" type="button" onClick={onDetails}><Info size={16} aria-hidden="true" />Mais detalhes</button></div>
  </div>
}

function MatchIndicator({ id, result }: { id: number; result: MatchScoreData }) {
  const tooltipId = `match-tooltip-${id}`
  return <div className="match-indicator">
    <div className="match-indicator-heading"><span><TrendingUp size={16} aria-hidden="true" /><strong>{result.percentual}% de match</strong></span><div className="match-tooltip-wrap"><button type="button" aria-label="Entenda o cálculo do match" aria-describedby={tooltipId}><HelpCircle size={17} aria-hidden="true" /></button><div className="match-tooltip" id={tooltipId} role="tooltip"><div className="match-tooltip-header"><div><small>Análise personalizada</small><strong>Compatibilidade com sua tese</strong></div><b>{result.percentual}%</b></div><div className="match-tooltip-factors"><MatchFactor label="Segmentos" score={result.segmentos} max={35} /><MatchFactor label="Faixa de investimento" score={result.investimento} max={30} /><MatchFactor label="Tração" score={result.tracao} max={25} /><MatchFactor label="Localização" score={result.localizacao} max={10} /></div><div className="match-tooltip-reasons"><strong>Por que este resultado?</strong><ul>{result.motivos.map((motivo) => <li className={motivo.positivo ? 'is-positive' : 'is-negative'} key={motivo.texto} aria-label={`${motivo.positivo ? 'Ponto positivo' : 'Ponto negativo'}: ${motivo.texto}`}>{motivo.texto}</li>)}</ul></div></div></div></div>
    <div className="match-indicator-track" aria-label={`${result.percentual}% de compatibilidade`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.percentual}><span style={{ width: `${result.percentual}%` }} /></div>
  </div>
}

function MatchFactor({ label, score, max }: { label: string; score: number; max: number }) {
  return <div className="match-tooltip-factor"><div><span>{label}</span><strong>{score}/{max}</strong></div><div><span style={{ width: `${Math.round((score / max) * 100)}%` }} /></div></div>
}

function StartupDetailsModal({ rodada, connection, cancelling, onClose, onPropose, onCancel }: { rodada: RodadaDisponivelData; connection?: ConnectionData; cancelling: boolean; onClose: () => void; onPropose: () => void; onCancel: (connection: ConnectionData) => void }) {
  const { startup } = rodada
  const videoEmbedUrl = startup.videoPitchUrl ? getYoutubeEmbedUrl(startup.videoPitchUrl) : null
  return createPortal(<div className="details-modal-backdrop details-modal-backdrop--centered" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="details-modal details-modal--explore" role="dialog" aria-modal="true" aria-labelledby="startup-details-title"><button className="details-modal-close" type="button" onClick={onClose} aria-label="Fechar detalhes"><X size={20} aria-hidden="true" /></button><div className="details-modal-heading details-modal-heading--profile-link"><a className="details-modal-profile-image" href={`/startups/${startup.usuarioId}`} aria-label={`Ver perfil da ${startup.nomeStartup}`}><div className="rodada-card-logo"><img src={startup.imagemPerfil || genericStartupImage} alt={startup.imagemPerfil ? `Imagem de perfil da ${startup.nomeStartup}` : `Imagem padrão da ${startup.nomeStartup}`} /></div></a><div><p className="kicker">Detalhes da oportunidade</p><h2 id="startup-details-title"><a className="details-modal-profile-name" href={`/startups/${startup.usuarioId}`}>{startup.nomeStartup}</a></h2><p>{startup.segmentoNome}</p></div></div><div className="details-modal-progress"><div className="rodada-card-metricas"><div className="metrica-box"><span className="metrica-box-label">Meta</span><span className="metrica-box-valor">{formatarMoeda(rodada.valorAlvo)}</span></div></div><RodadaProgresso rodada={rodada} /></div><div className="details-modal-grid"><div><span>Equity oferecido</span><strong>{rodada.percentualEquityOferecido}%</strong></div><div><span>Fundação</span><strong>{formatarMesAno(startup.dataFundacao)}</strong></div></div>{startup.tracao && <div className="details-modal-section details-modal-section--traction"><h3>Tração comprovada</h3><TractionSummary tracao={startup.tracao} /><p>{startup.tracao.evidenciaTracao}</p><small>Dados de {formatarMesAno(startup.tracao.mesReferencia)}</small></div>}<div className="details-modal-section details-modal-section--about"><h3>Sobre a startup</h3><p className="details-modal-about-text">{startup.descricao || 'Descrição não informada.'}</p></div>{startup.segmentosSecundarios.length > 0 && <div className="details-modal-section"><h3>Segmentos secundários</h3><div className="details-modal-tags">{startup.segmentosSecundarios.map((segmento) => <span key={segmento}><SegmentIcon nome={segmento} />{segmento}</span>)}</div></div>} {(startup.cidade || startup.estado || startup.siteUrl || startup.linkedinUrl) && <div className="details-modal-section details-modal-section--links"><h3>Informações adicionais</h3><div className="details-modal-links">{(startup.cidade || startup.estado) && <span className="details-modal-link-item"><span className="details-modal-link-icon details-modal-link-icon--muted" aria-hidden="true"><MapPin size={14} /></span><span className="details-modal-link-label">{[startup.cidade, startup.estado].filter(Boolean).join(' - ')}</span></span>}{startup.siteUrl && <a className="details-modal-link-item details-modal-link-item--anchor" href={startup.siteUrl} target="_blank" rel="noreferrer"><span className="details-modal-link-icon details-modal-link-icon--teal" aria-hidden="true"><Globe size={14} /></span><span className="details-modal-link-label">Site da startup</span></a>}{startup.linkedinUrl && <a className="details-modal-link-item details-modal-link-item--anchor" href={startup.linkedinUrl} target="_blank" rel="noreferrer"><span className="details-modal-link-icon details-modal-link-icon--linkedin" aria-hidden="true"><img src={linkedinLogo} alt="" /></span><span className="details-modal-link-label">LinkedIn</span></a>}</div></div>}{videoEmbedUrl && <div className="details-modal-section"><h3>Vídeo de pitch</h3><div className="details-modal-video"><iframe src={videoEmbedUrl} title={`Vídeo de pitch da ${startup.nomeStartup}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></div>}<div className="details-modal-actions">{connection ? <button className="button button-proposal-cancel" type="button" disabled={cancelling} onClick={() => onCancel(connection)}>{cancelling ? <LoaderCircle className="feed-spin" size={17} /> : <X size={17} aria-hidden="true" />}Cancelar proposta</button> : <button className="button button-navy" type="button" onClick={onPropose}>Tenho interesse <ArrowRight size={17} aria-hidden="true" /></button>}</div></section></div>, document.body)
}

function TractionSummary({ tracao }: { tracao: NonNullable<RodadaDisponivelData['startup']['tracao']> }) {
  const volume = tracao.clientesAtivos && tracao.clientesAtivos > 0 ? tracao.clientesAtivos : tracao.pilotosAtivos
  return <div className="traction-summary">
    <div><DollarSign size={16} aria-hidden="true" /><span>Receita no mês</span><strong>{tracao.receitaMensal === null ? 'Não informado' : formatarMoeda(tracao.receitaMensal)}</strong></div>
    <div><BarChart3 size={16} aria-hidden="true" /><span>MRR</span><strong>{tracao.mrr === null ? 'Não informado' : formatarMoeda(tracao.mrr)}</strong></div>
    <div><Users size={16} aria-hidden="true" /><span>{tracao.clientesAtivos && tracao.clientesAtivos > 0 ? 'Clientes' : 'Pilotos'}</span><strong>{volume === null ? 'Não informado' : new Intl.NumberFormat('pt-BR').format(volume)}</strong></div>
    <div><TrendingUp size={16} aria-hidden="true" /><span>Crescimento</span><strong>{tracao.crescimentoMensal === null ? 'Não informado' : `${tracao.crescimentoMensal}%`}</strong></div>
  </div>
}

function getYoutubeEmbedUrl(value: string) { try { const url = new URL(value); const id = url.hostname.includes('youtu.be') ? url.pathname.slice(1) : url.searchParams.get('v') ?? url.pathname.split('/').filter(Boolean).pop(); return id ? `https://www.youtube.com/embed/${id}` : null } catch { return null } }
function formatarMesAno(value: string | null) { if (!value) return 'Não informada'; const date = new Date(`${value.slice(0, 7)}-01T00:00:00`); return Number.isNaN(date.getTime()) ? 'Não informada' : new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date) }
function formatarMoeda(valor: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor) }
function mesesDesdeReferencia(value?: string) { if (!value) return Number.POSITIVE_INFINITY; const [year, month] = value.slice(0, 7).split('-').map(Number); const now = new Date(); return Math.max(0, (now.getFullYear() - year) * 12 + now.getMonth() + 1 - month) }
