import { apiRequest } from './api'

export type PostCategory = 'atualizacao' | 'conquista' | 'rodada' | 'insight'

export interface FeedComment {
  id: number
  autorId: string
  autorNome: string
  autorTipo: 'startup' | 'investidor'
  autorImagem: string | null
  conteudo: string
  criadoEm: string
}

export interface FeedPost {
  id: number
  autorId: string
  autorNome: string
  autorTipo: 'startup' | 'investidor'
  autorDescricao: string | null
  autorImagem: string | null
  conteudo: string
  categoria: PostCategory
  metricaRotulo: string | null
  metricaValor: string | null
  imagemUrl: string | null
  youtubeVideoId: string | null
  criadoEm: string
  curtidas: number
  curtidoPorMim: boolean
  meuPost: boolean
  comentarios: FeedComment[]
}

export interface CreateFeedPost {
  conteudo: string
  categoria: PostCategory
  metricaRotulo?: string
  metricaValor?: string
  youtubeVideoId?: string
}

export function carregarFeed(limit = 20) {
  return apiRequest<FeedPost[]>(`/feed?limit=${limit}`)
}

export function carregarPostsStartup(startupUserId: string, limit = 50) {
  return apiRequest<FeedPost[]>(`/feed/startups/${startupUserId}?limit=${limit}`)
}

export function criarPostagem(payload: CreateFeedPost, imagem?: File | null) {
  if (imagem) {
    const body = new FormData()
    body.append('post', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    body.append('image', imagem, imagem.name)
    return apiRequest<FeedPost>('/feed', { method: 'POST', body })
  }
  return apiRequest<FeedPost>('/feed', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function alternarCurtida(postId: number) {
  return apiRequest<{ curtido: boolean; curtidas: number }>(`/feed/${postId}/like`, {
    method: 'POST',
  })
}

export function comentarPostagem(postId: number, conteudo: string) {
  return apiRequest<FeedComment>(`/feed/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ conteudo }),
  })
}

export function excluirPostagem(postId: number) {
  return apiRequest<void>(`/feed/${postId}`, { method: 'DELETE' })
}
