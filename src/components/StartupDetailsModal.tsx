import { ArrowRight, BarChart3, Globe, MapPin, TrendingUp, Users, X } from 'lucide-react'
import genericStartupImage from '../assets/generic_Startup.png'
import linkedinLogo from '../assets/svg/linkedin-svgrepo-com.svg'
import type { StartupRodadaData, StartupTractionData } from '../lib/perfilApi'
import { SegmentIcon } from './SegmentIcon'

export interface StartupDetailsView {
  id: number
  nomeStartup: string
  segmentoNome: string
  descricao: string
  dataFundacao: string | null
  siteUrl: string | null
  cidade: string | null
  estado: string | null
  videoPitchUrl: string | null
  linkedinUrl: string | null
  imagemPerfil: string | null
  segmentosSecundarios: string[]
  tracao: StartupTractionData | null
}

interface StartupDetailsModalProps {
  startup: StartupDetailsView
  rodada?: StartupRodadaData | null
  label?: string
  onClose: () => void
  onPropose?: () => void
}

export function StartupDetailsModal({
  startup,
  rodada = null,
  label = 'Detalhes da oportunidade',
  onClose,
  onPropose,
}: StartupDetailsModalProps) {
  const videoEmbedUrl = startup.videoPitchUrl ? getYoutubeEmbedUrl(startup.videoPitchUrl) : null

  return <div className="details-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="details-modal" role="dialog" aria-modal="true" aria-labelledby="startup-details-title">
      <button className="details-modal-close" type="button" onClick={onClose} aria-label="Fechar detalhes"><X size={20} aria-hidden="true" /></button>
      <div className="details-modal-heading">
        <div className="rodada-card-logo"><img src={startup.imagemPerfil || genericStartupImage} alt={startup.imagemPerfil ? `Imagem de perfil da ${startup.nomeStartup}` : ''} /></div>
        <div><p className="kicker">{label}</p><h2 id="startup-details-title">{startup.nomeStartup}</h2><p>{startup.segmentoNome}</p></div>
      </div>
      {rodada && <div className="details-modal-progress">
        <div className="rodada-card-metricas"><div className="metrica-box"><span className="metrica-box-label">Meta</span><span className="metrica-box-valor">{formatarMoeda(rodada.valorAlvo)}</span></div></div>
        <RodadaProgresso rodada={rodada} />
      </div>}
      <div className="details-modal-grid">
        {rodada && <div><span>Equity oferecido</span><strong>{rodada.percentualEquityOferecido}%</strong></div>}
        <div><span>Fundação</span><strong>{formatarMesAno(startup.dataFundacao)}</strong></div>
      </div>
      {startup.tracao && <div className="details-modal-section details-modal-section--traction"><h3>Tração comprovada</h3><TractionSummary tracao={startup.tracao} /><p>{startup.tracao.evidenciaTracao}</p><small>Dados de {formatarMesAno(startup.tracao.mesReferencia)}</small></div>}
      <div className="details-modal-section details-modal-section--about"><h3>Sobre a startup</h3><p className="details-modal-about-text">{startup.descricao || 'Descrição não informada.'}</p></div>
      {startup.segmentosSecundarios.length > 0 && <div className="details-modal-section"><h3>Segmentos secundários</h3><div className="details-modal-tags">{startup.segmentosSecundarios.map((segmento) => <span key={segmento}><SegmentIcon nome={segmento} />{segmento}</span>)}</div></div>}
      {(startup.cidade || startup.estado || startup.siteUrl || startup.linkedinUrl) && <div className="details-modal-section details-modal-section--links"><h3>Informações adicionais</h3><div className="details-modal-links">
        {(startup.cidade || startup.estado) && <span className="details-modal-link-item"><span className="details-modal-link-icon details-modal-link-icon--muted" aria-hidden="true"><MapPin size={14} /></span><span className="details-modal-link-label">{[startup.cidade, startup.estado].filter(Boolean).join(' - ')}</span></span>}
        {startup.siteUrl && <a className="details-modal-link-item details-modal-link-item--anchor" href={startup.siteUrl} target="_blank" rel="noreferrer"><span className="details-modal-link-icon details-modal-link-icon--teal" aria-hidden="true"><Globe size={14} /></span><span className="details-modal-link-label">Site da startup</span></a>}
        {startup.linkedinUrl && <a className="details-modal-link-item details-modal-link-item--anchor" href={startup.linkedinUrl} target="_blank" rel="noreferrer"><span className="details-modal-link-icon details-modal-link-icon--linkedin" aria-hidden="true"><img src={linkedinLogo} alt="" /></span><span className="details-modal-link-label">LinkedIn</span></a>}
      </div></div>}
      {videoEmbedUrl && <div className="details-modal-section"><h3>Vídeo de pitch</h3><div className="details-modal-video"><iframe src={videoEmbedUrl} title={`Vídeo de pitch da ${startup.nomeStartup}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></div>}
      {onPropose && <div className="details-modal-actions"><button className="button button-navy" type="button" onClick={onPropose}>Tenho interesse <ArrowRight size={17} aria-hidden="true" /></button></div>}
    </section>
  </div>
}

function RodadaProgresso({ rodada }: { rodada: StartupRodadaData }) {
  const progresso = rodada.valorAlvo > 0 ? Math.min(100, Math.round((rodada.valorCaptado / rodada.valorAlvo) * 100)) : 0
  return <div className="rodada-card-progresso"><div className="progresso-header"><span className="progresso-label">Progresso da rodada</span><span className="progresso-porcentagem">{progresso}%</span></div><div className="progresso-bar"><div className="progresso-fill" style={{ width: `${progresso}%` }} /></div><div className="progresso-footer"><span>{formatarMoeda(rodada.valorCaptado)} captados</span></div></div>
}

function TractionSummary({ tracao }: { tracao: StartupTractionData }) {
  const valorReceita = tracao.mrr && tracao.mrr > 0 ? tracao.mrr : tracao.receitaMensal
  const volume = tracao.clientesAtivos && tracao.clientesAtivos > 0 ? tracao.clientesAtivos : tracao.pilotosAtivos
  return <div className="traction-summary">
    <div><BarChart3 size={16} aria-hidden="true" /><span>{tracao.mrr && tracao.mrr > 0 ? 'MRR' : 'Receita/mês'}</span><strong>{valorReceita === null ? 'Não informado' : formatarMoeda(valorReceita)}</strong></div>
    <div><Users size={16} aria-hidden="true" /><span>{tracao.clientesAtivos && tracao.clientesAtivos > 0 ? 'Clientes' : 'Pilotos'}</span><strong>{volume === null ? 'Não informado' : new Intl.NumberFormat('pt-BR').format(volume)}</strong></div>
    <div><TrendingUp size={16} aria-hidden="true" /><span>Crescimento</span><strong>{tracao.crescimentoMensal === null ? 'Não informado' : `${tracao.crescimentoMensal}%`}</strong></div>
  </div>
}

function getYoutubeEmbedUrl(value: string) { try { const url = new URL(value); const id = url.hostname.includes('youtu.be') ? url.pathname.slice(1) : url.searchParams.get('v') ?? url.pathname.split('/').filter(Boolean).pop(); return id ? `https://www.youtube.com/embed/${id}` : null } catch { return null } }
function formatarMesAno(value: string | null) { if (!value) return 'Não informada'; const date = new Date(`${value.slice(0, 7)}-01T00:00:00`); return Number.isNaN(date.getTime()) ? 'Não informada' : new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date) }
function formatarMoeda(valor: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor) }
