import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CircleCheck,
  Globe2,
  Heart,
  Linkedin,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Rocket,
  Send,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import genericInvestorImage from '../assets/generic_Investor.png'
import genericStartupImage from '../assets/generic_Startup.png'
import { useAuth } from '../auth/useAuth'
import { traduzirErroApi } from '../lib/apiErrors'
import { carregarConexoes, type ConnectionData } from '../lib/connectionApi'
import {
  alternarCurtida,
  carregarPostsStartup,
  comentarPostagem,
  type FeedPost,
  type PostCategory,
} from '../lib/feedApi'
import { carregarDetalhesStartup, carregarRodadasAbertas, type RodadaDisponivelData, type StartupDetailsData } from '../lib/perfilApi'
import { Brand } from './Brand'
import { DashboardNavMenu } from './DashboardNavMenu'
import { ConnectionProposalModal } from './ConnectionProposalModal'
import { SegmentIcon } from './SegmentIcon'
import { ThemeToggle } from './ThemeToggle'

interface StartupPublicProfilePageProps {
  startupUserId: string
  onBack: () => void
  onOpenConversations: () => void
}

const categoryLabels: Record<PostCategory, string> = {
  atualizacao: 'Atualização',
  conquista: 'Conquista',
  rodada: 'Rodada / captação',
  insight: 'Tese / insight',
}

export function StartupPublicProfilePage({ startupUserId, onBack, onOpenConversations }: StartupPublicProfilePageProps) {
  const { usuario } = useAuth()
  const [startup, setStartup] = useState<StartupDetailsData | null>(null)
  const [openRound, setOpenRound] = useState<RodadaDisponivelData | null>(null)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [existingConnection, setExistingConnection] = useState<ConnectionData | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyPost, setBusyPost] = useState<number | null>(null)
  const [openComments, setOpenComments] = useState<number | null>(null)
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({})

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    void Promise.all([
      carregarDetalhesStartup(startupUserId),
      carregarPostsStartup(startupUserId),
      carregarRodadasAbertas().catch(() => [] as RodadaDisponivelData[]),
      usuario?.tipo === 'investidor' ? carregarConexoes().catch(() => [] as ConnectionData[]) : Promise.resolve([] as ConnectionData[]),
    ]).then(([profile, profilePosts, rounds, connections]) => {
      if (!active) return
      setStartup(profile)
      setPosts(profilePosts)
      setOpenRound(rounds.find((round) => round.startup.usuarioId === startupUserId) ?? null)
      setExistingConnection(connections.find((connection) => connection.contraparte.usuarioId === startupUserId) ?? null)
    }).catch((error) => {
      if (active) setLoadError(traduzirErroApi(error))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [startupUserId, usuario?.tipo])

  const curtir = async (postId: number) => {
    if (busyPost === postId) return
    setBusyPost(postId)
    setActionError('')
    try {
      const result = await alternarCurtida(postId)
      setPosts((current) => current.map((post) => post.id === postId
        ? { ...post, curtidoPorMim: result.curtido, curtidas: result.curtidas }
        : post))
    } catch (error) {
      setActionError(traduzirErroApi(error))
    } finally {
      setBusyPost(null)
    }
  }

  const comentar = async (event: FormEvent, postId: number) => {
    event.preventDefault()
    const conteudo = commentInputs[postId]?.trim()
    if (!conteudo || busyPost === postId) return
    setBusyPost(postId)
    setActionError('')
    try {
      const comment = await comentarPostagem(postId, conteudo)
      setPosts((current) => current.map((post) => post.id === postId
        ? { ...post, comentarios: [...post.comentarios, comment] }
        : post))
      setCommentInputs((current) => ({ ...current, [postId]: '' }))
    } catch (error) {
      setActionError(traduzirErroApi(error))
    } finally {
      setBusyPost(null)
    }
  }

  return <main id="conteudo" className="dashboard-shell startup-public-page">
    <header className="dashboard-header">
      <div className="dashboard-header-content">
        <div className="dashboard-brand"><DashboardNavMenu /><Brand /><div className="dashboard-user-info"><p className="kicker">Rede Altura</p><h1>Perfil da startup</h1></div></div>
        <div className="dashboard-actions"><ThemeToggle /><button className="button button-ghost button-compact" type="button" onClick={onBack}><ArrowLeft size={17} />Voltar ao feed</button></div>
      </div>
    </header>

    <div className="dashboard-content startup-public-content">
      {loading ? <ProfileStatus icon={<LoaderCircle className="feed-spin" size={34} />} title="Carregando perfil" text="Reunindo as informações públicas e publicações da startup." />
        : loadError || !startup ? <ProfileStatus icon={<BuildingIcon />} title="Perfil indisponível" text={loadError || 'Não foi possível encontrar esta startup.'} action={onBack} />
        : <>
          <section className="startup-public-hero">
            <div className="startup-public-cover" />
            <div className="startup-public-identity">
              <div className="startup-public-logo"><img src={startup.imagemPerfil || genericStartupImage} alt={startup.imagemPerfil ? `Imagem de perfil da ${startup.nomeStartup}` : ''} /></div>
              <div className="startup-public-title">
                <div><h2>{startup.nomeStartup}</h2></div>
                <p><SegmentIcon nome={startup.segmentoNome} />{startup.segmentoNome}</p>
                {(startup.cidade || startup.estado) && <p><MapPin size={16} />{[startup.cidade, startup.estado].filter(Boolean).join(' · ')}</p>}
              </div>
              <div className="startup-public-links">
                {usuario?.tipo === 'investidor' && existingConnection
                  ? <button className="button button-outline button-compact" type="button" onClick={onOpenConversations}><CircleCheck size={16} />Proposta enviada</button>
                  : usuario?.tipo === 'investidor' && openRound && <button className="button button-navy button-compact" type="button" onClick={() => setProposalOpen(true)}>Tenho interesse<ArrowRight size={16} /></button>}
                {startup.siteUrl && <a className="button button-outline button-compact" href={startup.siteUrl} target="_blank" rel="noreferrer"><Globe2 size={16} />Site</a>}
                {startup.linkedinUrl && <a className="button button-outline button-compact" href={startup.linkedinUrl} target="_blank" rel="noreferrer"><Linkedin size={16} />LinkedIn</a>}
              </div>
            </div>
            <div className="startup-public-about"><h3>Sobre</h3><p>{startup.descricao || 'A startup ainda não adicionou uma descrição pública.'}</p></div>
          </section>

          {actionError && <div className="feed-alert startup-public-alert" role="alert">{actionError}</div>}

          <div className="startup-public-grid">
            <section className="startup-public-activity" aria-labelledby="startup-posts-title">
              <div className="startup-public-section-heading"><div><p className="kicker">Atividade</p><h2 id="startup-posts-title">Publicações</h2></div><span>{posts.length} post{posts.length === 1 ? '' : 's'}</span></div>
              {posts.length === 0 ? <div className="startup-public-empty"><MessageCircle size={30} /><h3>Nenhuma publicação ainda</h3><p>As atualizações desta startup aparecerão aqui.</p></div>
                : <div className="feed-stream">{posts.map((post) => <article className="feed-post startup-profile-post" key={post.id}>
                  <header className="feed-post-header"><ProfileAvatar nome={post.autorNome} imagem={post.autorImagem} /><div className="feed-post-author"><div><strong>{post.autorNome}</strong><span className="feed-role feed-role-startup">Startup</span></div><p>{post.autorDescricao || 'Startup'} · <time dateTime={post.criadoEm}>{relativeTime(post.criadoEm)}</time></p></div></header>
                  <div className="feed-post-category">{categoryLabels[post.categoria]}</div>
                  <p className="feed-post-content">{post.conteudo}</p>
                  {post.imagemUrl && <div className="feed-post-media"><img src={post.imagemUrl} alt={`Imagem publicada por ${post.autorNome}`} loading="lazy" /></div>}
                  {post.youtubeVideoId && <div className="feed-post-media feed-post-video"><iframe src={`https://www.youtube-nocookie.com/embed/${post.youtubeVideoId}`} title={`Vídeo publicado por ${post.autorNome}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>}
                  {post.metricaRotulo && post.metricaValor && <div className="feed-metric"><BarChart3 size={22} /><div><span>{post.metricaRotulo}</span><strong>{post.metricaValor}</strong></div></div>}
                  <div className="feed-post-stats"><span>{post.curtidas} curtida{post.curtidas === 1 ? '' : 's'}</span><span>{post.comentarios.length} comentário{post.comentarios.length === 1 ? '' : 's'}</span></div>
                  <div className="feed-post-actions"><button className={post.curtidoPorMim ? 'is-liked' : ''} type="button" disabled={busyPost === post.id} onClick={() => void curtir(post.id)}><Heart size={18} fill={post.curtidoPorMim ? 'currentColor' : 'none'} />{post.curtidoPorMim ? 'Curtido' : 'Curtir'}</button><button type="button" onClick={() => setOpenComments(openComments === post.id ? null : post.id)}><MessageCircle size={18} />Comentar</button></div>
                  {openComments === post.id && <div className="feed-comments">
                    {post.comentarios.length > 0 && <div className="feed-comments-list">{post.comentarios.map((comment) => <div className="feed-comment" key={comment.id}><ProfileAvatar nome={comment.autorNome} imagem={comment.autorImagem} tipo={comment.autorTipo} small /><div><p><strong>{comment.autorNome}</strong><span>{relativeTime(comment.criadoEm)}</span></p><div>{comment.conteudo}</div></div></div>)}</div>}
                    <form className="feed-comment-form" onSubmit={(event) => void comentar(event, post.id)}><input maxLength={500} value={commentInputs[post.id] ?? ''} onChange={(event) => setCommentInputs((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Escreva um comentário…" aria-label="Novo comentário" /><button type="submit" disabled={!commentInputs[post.id]?.trim() || busyPost === post.id} aria-label="Publicar comentário"><Send size={17} /></button></form>
                  </div>}
                </article>)}</div>}
            </section>

            <aside className="startup-public-sidebar">
              <section className="startup-public-info-card"><h2><TrendingUp size={19} />Tração</h2>{startup.tracao ? <>
                <div className="startup-public-metrics"><Metric label="MRR" value={formatCurrency(startup.tracao.mrr)} /><Metric label="Receita mensal" value={formatCurrency(startup.tracao.receitaMensal)} /><Metric label="Clientes ativos" value={formatNumber(startup.tracao.clientesAtivos)} /><Metric label="Crescimento" value={startup.tracao.crescimentoMensal === null ? 'Não informado' : `${startup.tracao.crescimentoMensal}%`} /></div>
                <p className="startup-public-evidence">{startup.tracao.evidenciaTracao}</p><small>Referência: {formatMonth(startup.tracao.mesReferencia)}</small>
              </> : <p className="startup-public-muted">Métricas de tração ainda não informadas.</p>}</section>

              {startup.rodada && <section className="startup-public-info-card"><h2><Rocket size={19} />Captação</h2><div className="startup-public-round"><div><span>Meta</span><strong>{formatCurrency(startup.rodada.valorAlvo)}</strong></div><div><span>Equity</span><strong>{startup.rodada.percentualEquityOferecido}%</strong></div></div><RoundProgress captured={startup.rodada.valorCaptado} target={startup.rodada.valorAlvo} /><span className={`startup-public-round-status is-${startup.rodada.status}`}>{startup.rodada.status}</span></section>}

              <section className="startup-public-info-card"><h2><Users size={19} />Informações</h2><ul className="startup-public-facts"><li><CalendarDays size={16} /><span><small>Fundação</small>{formatFoundation(startup.dataFundacao)}</span></li><li><MapPin size={16} /><span><small>Localização</small>{[startup.cidade, startup.estado].filter(Boolean).join(' · ') || 'Não informada'}</span></li></ul>{startup.segmentosSecundarios.length > 0 && <div className="startup-public-segments"><span>Também atua em</span><div>{startup.segmentosSecundarios.map((segment) => <span key={segment}><SegmentIcon nome={segment} />{segment}</span>)}</div></div>}</section>
            </aside>
          </div>
        </>}
    </div>
    {proposalOpen && openRound && <ConnectionProposalModal rodada={openRound} onClose={() => setProposalOpen(false)} onCreated={(connection) => { setExistingConnection(connection); setProposalOpen(false) }} />}
  </main>
}

function ProfileStatus({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: () => void }) {
  return <section className="startup-public-status">{icon}<h2>{title}</h2><p>{text}</p>{action && <button className="button button-navy" type="button" onClick={action}>Voltar ao feed</button>}</section>
}

function BuildingIcon() { return <div className="startup-public-building" aria-hidden="true"><Rocket size={30} /></div> }

function ProfileAvatar({ nome, imagem, tipo = 'startup', small = false }: { nome: string; imagem: string | null; tipo?: 'startup' | 'investidor'; small?: boolean }) {
  const fallback = tipo === 'investidor' ? genericInvestorImage : genericStartupImage
  return <div className={`feed-avatar${small ? ' feed-avatar-small' : ''}`}><img src={imagem || fallback} alt={imagem ? `Imagem de perfil de ${nome}` : ''} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallback }} /></div>
}

function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div> }

function RoundProgress({ captured, target }: { captured: number; target: number }) {
  const percentage = target > 0 ? Math.min(100, Math.round((captured / target) * 100)) : 0
  return <div className="startup-public-progress"><div><span>Progresso</span><strong>{percentage}%</strong></div><div><span style={{ width: `${percentage}%` }} /></div><small>{formatCurrency(captured)} captados</small></div>
}

function formatCurrency(value: number | null) { return value === null ? 'Não informado' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value) }
function formatNumber(value: number | null) { return value === null ? 'Não informado' : new Intl.NumberFormat('pt-BR').format(value) }
function formatMonth(value: string) { const date = new Date(`${value.slice(0, 7)}-01T00:00:00`); return Number.isNaN(date.getTime()) ? 'Não informada' : new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date) }
function formatFoundation(value: string | null) { if (!value) return 'Não informada'; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? 'Não informada' : new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date) }
function relativeTime(value: string) { const date = new Date(value); const seconds = Math.round((date.getTime() - Date.now()) / 1000); const formatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }); const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]; for (const [unit, size] of units) if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit); return 'agora' }
