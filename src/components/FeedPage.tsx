import {
  ArrowLeft,
  BarChart3,
  Building2,
  Heart,
  ImagePlus,
  Lightbulb,
  LoaderCircle,
  LogOut,
  Megaphone,
  MessageCircle,
  Rocket,
  Search,
  Send,
  Trash2,
  Trophy,
  Youtube,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { signOut } from '../auth/authApi'
import { useAuth } from '../auth/useAuth'
import {
  alternarCurtida,
  carregarFeed,
  comentarPostagem,
  criarPostagem,
  excluirPostagem,
  type FeedPost,
  type PostCategory,
} from '../lib/feedApi'
import { traduzirErroApi } from '../lib/apiErrors'
import { useErrorToast } from './ToastProvider'
import {
  carregarPerfilInvestidor,
  carregarPerfilStartup,
} from '../lib/perfilApi'
import genericInvestorImage from '../assets/generic_Investor.png'
import genericStartupImage from '../assets/generic_Startup.png'
import { comprimirImagemFeed } from '../utils/imagemFeed'
import { extrairIdYoutube } from '../utils/videos'
import { Brand } from './Brand'
import { DashboardNavMenu } from './DashboardNavMenu'
import { InvestorDetailsModal } from './InvestorDetailsModal'
import { ThemeToggle } from './ThemeToggle'
import { ZoomableImage } from './ZoomableImage'

interface FeedPageProps { onBack: () => void; onOpenStartup: (startupUserId: string) => void }

const categories: Array<{ value: PostCategory; label: string; icon: typeof Megaphone }> = [
  { value: 'atualizacao', label: 'Atualização', icon: Megaphone },
  { value: 'conquista', label: 'Conquista', icon: Trophy },
  { value: 'rodada', label: 'Rodada', icon: Rocket },
  { value: 'insight', label: 'Insight', icon: Lightbulb },
]

const categoryLabels: Record<PostCategory, string> = {
  atualizacao: 'Atualização',
  conquista: 'Conquista',
  rodada: 'Rodada / captação',
  insight: 'Tese / insight',
}

export function FeedPage({ onBack, onOpenStartup }: FeedPageProps) {
  const { usuario } = useAuth()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [categoria, setCategoria] = useState<PostCategory>('atualizacao')
  const [metricaRotulo, setMetricaRotulo] = useState('')
  const [metricaValor, setMetricaValor] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [actionError, setActionError] = useState('')
  const [openComments, setOpenComments] = useState<number | null>(null)
  const [investorProfileUserId, setInvestorProfileUserId] = useState<string | null>(null)
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({})
  const [busyPost, setBusyPost] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [imagemPerfil, setImagemPerfil] = useState<string | null>(null)
  const [imagemPost, setImagemPost] = useState<File | null>(null)
  const [imagemPreview, setImagemPreview] = useState('')
  const [processandoImagem, setProcessandoImagem] = useState(false)
  const [youtubeAberto, setYoutubeAberto] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [mediaError, setMediaError] = useState('')
  const isInvestor = usuario?.tipo === 'investidor'
  const youtubeVideoId = useMemo(() => extrairIdYoutube(youtubeUrl), [youtubeUrl])
  useErrorToast(actionError)
  useErrorToast(mediaError)
  useErrorToast(loadError)

  const visiblePosts = useMemo(() => {
    const query = normalizeSearch(searchQuery)
    if (!isInvestor || !query) return posts
    return posts.filter((post) => normalizeSearch([
      post.autorNome,
      post.autorDescricao,
      post.conteudo,
      categoryLabels[post.categoria],
      post.metricaRotulo,
      post.metricaValor,
    ].filter(Boolean).join(' ')).includes(query))
  }, [isInvestor, posts, searchQuery])

  useEffect(() => {
    let active = true
    void carregarFeed(50).then((data) => {
      if (active) setPosts(data)
    }).catch((error) => {
      if (active) setLoadError(traduzirErroApi(error))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!usuario) return
    const carregar = usuario.tipo === 'startup' ? carregarPerfilStartup : carregarPerfilInvestidor
    void carregar(usuario.id).then((perfil) => setImagemPerfil(perfil?.imagemPerfil ?? null)).catch(() => undefined)
  }, [usuario])

  useEffect(() => () => {
    if (imagemPreview) URL.revokeObjectURL(imagemPreview)
  }, [imagemPreview])

  const selecionarImagem = async (arquivo?: File) => {
    if (!arquivo || processandoImagem) return
    setProcessandoImagem(true)
    setMediaError('')
    try {
      const processada = await comprimirImagemFeed(arquivo)
      setImagemPost(processada.arquivo)
      setImagemPreview(URL.createObjectURL(processada.arquivo))
      setYoutubeUrl('')
      setYoutubeAberto(false)
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : 'Não foi possível processar a imagem.')
    } finally {
      setProcessandoImagem(false)
    }
  }

  const removerImagem = () => {
    setImagemPost(null)
    setImagemPreview('')
  }

  const publicar = async (event: FormEvent) => {
    event.preventDefault()
    if (!conteudo.trim() || publishing) return
    if (youtubeUrl.trim() && !youtubeVideoId) {
      setMediaError('Informe uma URL válida do YouTube.')
      return
    }
    setPublishing(true)
    setActionError('')
    setMediaError('')
    try {
      const post = await criarPostagem({
        conteudo: conteudo.trim(),
        categoria,
        metricaRotulo: metricaRotulo.trim() || undefined,
        metricaValor: metricaValor.trim() || undefined,
        youtubeVideoId: youtubeVideoId ?? undefined,
      }, imagemPost)
      setPosts((current) => [post, ...current])
      setConteudo('')
      setMetricaRotulo('')
      setMetricaValor('')
      removerImagem()
      setYoutubeUrl('')
      setYoutubeAberto(false)
    } catch (error) {
      setActionError(traduzirErroApi(error))
    } finally {
      setPublishing(false)
    }
  }

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

  const comentar = async (postId: number) => {
    const text = commentInputs[postId]?.trim()
    if (!text || busyPost === postId) return
    setBusyPost(postId)
    setActionError('')
    try {
      const comment = await comentarPostagem(postId, text)
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

  const excluir = async (postId: number) => {
    if (!window.confirm('Excluir esta publicação? Esta ação não pode ser desfeita.')) return
    setBusyPost(postId)
    setActionError('')
    try {
      await excluirPostagem(postId)
      setPosts((current) => current.filter((post) => post.id !== postId))
    } catch (error) {
      setActionError(traduzirErroApi(error))
    } finally {
      setBusyPost(null)
    }
  }

  return <main id="conteudo" className="dashboard-shell feed-page">
    <header className="dashboard-header">
      <div className="dashboard-header-content">
        <div className="dashboard-brand">
          <DashboardNavMenu />
          <Brand />
          <div className="dashboard-user-info"><p className="kicker">Rede Altura</p><h1>Feed de tração</h1></div>
        </div>
        <div className="dashboard-actions">
          <ThemeToggle />
          <button className="button button-ghost button-compact" type="button" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" /><span>Painel</span></button>
          <button className="button button-outline button-compact" type="button" onClick={() => void signOut()}><LogOut size={17} aria-hidden="true" /><span>Sair</span></button>
        </div>
      </div>
    </header>

    <div className="dashboard-content feed-content">
      <aside className="feed-profile-card">
        <div className="feed-profile-accent" />
        <Avatar nome={usuario?.nome} imagem={imagemPerfil} tipo={usuario?.tipo} large />
        <p className="kicker">Seu perfil</p>
        <h2>{usuario?.nome}</h2>
        <span className={`feed-role feed-role-${usuario?.tipo}`}>{usuario?.tipo === 'startup' ? 'Startup' : 'Investidor'}</span>
        <p>{isInvestor
          ? 'Encontre startups em tração e acompanhe seus sinais de crescimento.'
          : 'Compartilhe sinais reais, aprendizados e oportunidades com a rede.'}</p>
        <a className="button button-outline button-compact" href="/editar-perfil">Editar perfil</a>
      </aside>

      <section className="feed-main" aria-label="Publicações da rede">
        {isInvestor ? <section className="feed-search-panel" aria-labelledby="feed-search-title">
          <div className="feed-search-heading">
            <div className="feed-search-icon"><Search size={20} aria-hidden="true" /></div>
            <div><p className="kicker">Descubra oportunidades</p><h2 id="feed-search-title">Buscar startups no feed</h2></div>
          </div>
          <label className="feed-search-input">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Busque por startup, segmento, métrica ou conteúdo…"
              aria-label="Buscar startups no feed"
            />
            {searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Limpar busca"><X size={17} /></button>}
          </label>
          <p className="feed-search-summary">{searchQuery
            ? `${visiblePosts.length} resultado${visiblePosts.length === 1 ? '' : 's'} encontrado${visiblePosts.length === 1 ? '' : 's'}`
            : 'Pesquise sinais de tração, rodadas, segmentos e nomes de startups.'}</p>
        </section> : <form className="feed-composer" onSubmit={publicar}>
          <div className="feed-composer-heading">
            <Avatar nome={usuario?.nome} imagem={imagemPerfil} tipo={usuario?.tipo} />
            <div><p className="kicker">Compartilhe com a rede</p><h2>O que está avançando?</h2></div>
          </div>
          <div className="feed-category-list" aria-label="Categoria da publicação">
            {categories.map(({ value, label, icon: Icon }) => <button key={value} type="button" className={categoria === value ? 'is-active' : ''} onClick={() => setCategoria(value)}><Icon size={15} aria-hidden="true" />{label}</button>)}
          </div>
          <textarea maxLength={1500} rows={4} value={conteudo} onChange={(event) => setConteudo(event.target.value)} placeholder={usuario?.tipo === 'startup' ? 'Compartilhe uma evidência de tração, marco de crescimento ou abertura de rodada…' : 'Compartilhe sua tese, leitura de mercado ou o que busca em startups em tração…'} />
          <div className="feed-media-toolbar" aria-label="Mídia da publicação">
            <label className={imagemPost ? 'is-active' : ''}>
              {processandoImagem ? <LoaderCircle className="feed-spin" size={17} /> : <ImagePlus size={17} />}
              {processandoImagem ? 'Comprimindo…' : 'Adicionar imagem'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={processandoImagem || publishing}
                onChange={(event) => {
                  void selecionarImagem(event.target.files?.[0])
                  event.currentTarget.value = ''
                }}
              />
            </label>
            <button
              type="button"
              className={youtubeAberto ? 'is-active' : ''}
              onClick={() => {
                setYoutubeAberto((value) => !value)
                removerImagem()
                setMediaError('')
              }}
            ><Youtube size={18} />Adicionar vídeo</button>
            <span>1 imagem ou 1 vídeo</span>
          </div>
          {imagemPreview && <div className="feed-media-preview feed-image-preview">
            <img src={imagemPreview} alt="Prévia da imagem da publicação" />
            <div><span>Imagem comprimida</span><small>{formatarBytes(imagemPost?.size ?? 0)} · WebP</small></div>
            <button type="button" onClick={removerImagem} aria-label="Remover imagem"><X size={18} /></button>
          </div>}
          {youtubeAberto && <div className="feed-youtube-field">
            <label htmlFor="feed-youtube-url">URL do vídeo no YouTube</label>
            <div><Youtube size={18} /><input id="feed-youtube-url" type="url" value={youtubeUrl} onChange={(event) => { setYoutubeUrl(event.target.value); setMediaError('') }} placeholder="https://www.youtube.com/watch?v=…" /></div>
            {youtubeUrl.trim() && !youtubeVideoId && <small>Use uma URL válida de youtube.com ou youtu.be.</small>}
          </div>}
          <div className="feed-metric-fields">
            <label><span>Métrica em destaque <small>(opcional)</small></span><input maxLength={40} value={metricaRotulo} onChange={(event) => setMetricaRotulo(event.target.value)} placeholder="Ex.: MRR" /></label>
            <label><span>Valor <small>(opcional)</small></span><input maxLength={80} value={metricaValor} onChange={(event) => setMetricaValor(event.target.value)} placeholder="Ex.: R$ 120 mil · +18% MoM" /></label>
          </div>
          <div className="feed-composer-footer"><span>{conteudo.length}/1500</span><button className="button button-navy button-compact" type="submit" disabled={!conteudo.trim() || publishing}>{publishing ? <LoaderCircle className="feed-spin" size={17} /> : <Send size={17} />}Publicar</button></div>
        </form>}

        {loading ? <FeedStatus icon={<LoaderCircle className="feed-spin" size={30} />} title="Carregando o feed" text="Buscando as atualizações mais recentes da rede." />
          : loadError ? <FeedStatus icon={<MessageCircle size={30} />} title="Não foi possível carregar o feed" text={loadError} />
          : posts.length === 0 ? <FeedStatus icon={<Megaphone size={30} />} title="Nenhuma atualização ainda" text="As publicações das startups em tração aparecerão aqui." />
          : visiblePosts.length === 0 ? <FeedStatus icon={<Search size={30} />} title="Nenhum resultado encontrado" text="Tente buscar por outro nome, segmento, métrica ou palavra-chave." />
          : <div className="feed-stream">{visiblePosts.map((post) => <article className="feed-post" key={post.id}>
            <header className="feed-post-header">
              <a className="feed-author-avatar-link" href={`/startups/${post.autorId}`} aria-label={`Abrir perfil da ${post.autorNome}`}><Avatar nome={post.autorNome} imagem={post.autorImagem} tipo={post.autorTipo} /></a>
              <div className="feed-post-author"><div><strong><a className="feed-author-name-link" href={`/startups/${post.autorId}`}>{post.autorNome}</a></strong><span className={`feed-role feed-role-${post.autorTipo}`}>{post.autorTipo === 'startup' ? 'Startup' : 'Investidor'}</span></div><p>{post.autorDescricao || (post.autorTipo === 'startup' ? 'Startup' : 'Investidor')} · <time dateTime={post.criadoEm}>{relativeTime(post.criadoEm)}</time></p></div>
              {post.meuPost && <button className="feed-delete" type="button" aria-label="Excluir publicação" title="Excluir publicação" disabled={busyPost === post.id} onClick={() => void excluir(post.id)}><Trash2 size={17} /></button>}
            </header>
            <div className="feed-post-category">{categoryLabels[post.categoria]}</div>
            <p className="feed-post-content">{post.conteudo}</p>
            {post.imagemUrl && <div className="feed-post-media"><ZoomableImage src={post.imagemUrl} alt={`Imagem publicada por ${post.autorNome}`} loading="lazy" /></div>}
            {post.youtubeVideoId && <div className="feed-post-media feed-post-video"><iframe src={`https://www.youtube-nocookie.com/embed/${post.youtubeVideoId}`} title={`Vídeo publicado por ${post.autorNome}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>}
            {post.metricaRotulo && post.metricaValor && <div className="feed-metric"><BarChart3 size={22} aria-hidden="true" /><div><span>{post.metricaRotulo}</span><strong>{post.metricaValor}</strong></div></div>}
            <div className="feed-post-stats"><span>{post.curtidas} curtida{post.curtidas === 1 ? '' : 's'}</span><span>{post.comentarios.length} comentário{post.comentarios.length === 1 ? '' : 's'}</span></div>
            <div className={`feed-post-actions${isInvestor ? ' feed-post-actions-with-profile' : ''}`}>
              <button className={post.curtidoPorMim ? 'is-liked' : ''} type="button" disabled={busyPost === post.id} onClick={() => void curtir(post.id)}><Heart size={18} fill={post.curtidoPorMim ? 'currentColor' : 'none'} />{post.curtidoPorMim ? 'Curtido' : 'Curtir'}</button>
              <button type="button" onClick={() => setOpenComments(openComments === post.id ? null : post.id)}><MessageCircle size={18} />Comentar</button>
              {isInvestor && <button type="button" onClick={() => onOpenStartup(post.autorId)}><Building2 size={18} />Analisar perfil</button>}
            </div>
            {openComments === post.id && <div className="feed-comments">
              {post.comentarios.length > 0 && <div className="feed-comments-list">{post.comentarios.map((comment) => <div className="feed-comment" key={comment.id}>
                {comment.autorTipo === 'startup'
                  ? <a className="feed-comment-profile-avatar" href={`/startups/${encodeURIComponent(comment.autorId)}`} aria-label={`Ver perfil de ${comment.autorNome}`}><Avatar nome={comment.autorNome} imagem={comment.autorImagem} tipo={comment.autorTipo} small /></a>
                  : <button className="feed-comment-profile-avatar" type="button" onClick={() => setInvestorProfileUserId(comment.autorId)} aria-label={`Ver perfil de ${comment.autorNome}`}><Avatar nome={comment.autorNome} imagem={comment.autorImagem} tipo={comment.autorTipo} small /></button>}
                <div><p><strong>{comment.autorTipo === 'startup'
                  ? <a className="feed-comment-profile-name" href={`/startups/${encodeURIComponent(comment.autorId)}`}>{comment.autorNome}</a>
                  : <button className="feed-comment-profile-name" type="button" onClick={() => setInvestorProfileUserId(comment.autorId)}>{comment.autorNome}</button>}</strong><span>{relativeTime(comment.criadoEm)}</span></p><div>{comment.conteudo}</div></div>
              </div>)}</div>}
              <form className="feed-comment-form" onSubmit={(event) => { event.preventDefault(); void comentar(post.id) }}><input maxLength={500} value={commentInputs[post.id] ?? ''} onChange={(event) => setCommentInputs((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Escreva um comentário…" aria-label="Novo comentário" /><button type="submit" disabled={!commentInputs[post.id]?.trim() || busyPost === post.id} aria-label="Publicar comentário"><Send size={17} /></button></form>
            </div>}
          </article>)}</div>}
      </section>

      <aside className="feed-guidance-card">
        {isInvestor ? <>
          <Search size={22} aria-hidden="true" />
          <h2>Encontre bons sinais</h2>
          <p>Use a busca para comparar startups com evidências recentes de crescimento e captação.</p>
          <ul><li>Nome e segmento</li><li>Receita e MRR</li><li>Crescimento mensal</li><li>Rodadas abertas</li></ul>
        </> : <>
          <BarChart3 size={22} aria-hidden="true" />
          <h2>O que ganha atenção</h2>
          <p>Atualizações objetivas, com contexto e números recentes, ajudam investidores a acompanhar a evolução.</p>
          <ul><li>Receita e MRR</li><li>Crescimento mensal</li><li>Clientes e pilotos</li><li>Abertura de rodada</li></ul>
        </>}
      </aside>
    </div>
    {investorProfileUserId && <InvestorDetailsModal investorUserId={investorProfileUserId} onClose={() => setInvestorProfileUserId(null)} />}
  </main>
}

function FeedStatus({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="feed-status">{icon}<h2>{title}</h2><p>{text}</p></div>
}

function Avatar({ nome, imagem, tipo = 'startup', large = false, small = false }: { nome?: string; imagem: string | null; tipo?: 'startup' | 'investidor'; large?: boolean; small?: boolean }) {
  const classes = ['feed-avatar', large ? 'feed-avatar-large' : '', small ? 'feed-avatar-small' : ''].filter(Boolean).join(' ')
  const fallback = tipo === 'investidor' ? genericInvestorImage : genericStartupImage
  return <div className={classes}><img
    src={imagem || fallback}
    alt={imagem ? `Imagem de perfil de ${nome || 'usuário'}` : ''}
    onError={(event) => {
      event.currentTarget.onerror = null
      event.currentTarget.src = fallback
    }}
  /></div>
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function formatarBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function relativeTime(value: string) {
  const date = new Date(value)
  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [unit, size] of units) if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit)
  return 'agora'
}
