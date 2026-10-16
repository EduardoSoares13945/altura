import { ApiError, apiRequest } from './api'

export interface SegmentoOption {
  id: number
  nome: string
}

export interface StartupTractionInput {
  mesReferencia: string
  receitaMensal: number | null
  mrr: number | null
  clientesAtivos: number | null
  pilotosAtivos: number | null
  crescimentoMensal: number | null
  evidenciaTracao: string
}

export type StartupTractionData = StartupTractionInput

export interface StartupRodadaInput {
  valorAlvo: number
  valorCaptado: number
  percentualEquityOferecido: number
  status: string
}

export interface StartupPerfilInput {
  usuarioId: string
  nomeResponsavel: string
  nomeStartup: string
  cnpj: string
  fase: string
  segmentoId: number
  descricao: string
  videoPitchUrl?: string | null
  dataFundacao?: string | null
  siteUrl?: string | null
  localizacao?: string | null
  cidade?: string | null
  estado?: string | null
  latitude?: number | null
  longitude?: number | null
  imagemPerfil?: string | null
  segmentosSecundarios: number[]
  linkedinUrl?: string | null
  rodada: StartupRodadaInput
  tracao: StartupTractionInput | null
}

export interface InvestidorPerfilInput {
  usuarioId: string
  nome: string
  cpf: string
  tipo: string
  biografia: string
  segmentos: number[]
  linkedinUrl?: string | null
  localizacao?: string | null
  cidade: string
  estado: string
  latitude?: number | null
  longitude?: number | null
  imagemPerfil?: string | null
}

export interface StartupRodadaData {
  valorAlvo: number
  valorCaptado: number
  percentualEquityOferecido: number
  status: string
}

export interface StartupPerfilData {
  nomeResponsavel: string
  nomeStartup: string
  cnpj: string
  fase: string
  segmentoId: number
  descricao: string
  videoPitchUrl: string | null
  dataFundacao: string | null
  siteUrl: string | null
  localizacao: string | null
  cidade: string | null
  estado: string | null
  latitude: number | null
  longitude: number | null
  imagemPerfil: string | null
  segmentosSecundarios: number[]
  linkedinUrl: string | null
  rodada: StartupRodadaData | null
  tracao: StartupTractionData | null
}

export interface InvestidorPerfilData {
  nome: string
  cpf: string
  tipo: string
  biografia: string
  segmentos: number[]
  linkedinUrl: string | null
  localizacao: string | null
  cidade: string | null
  estado: string | null
  latitude: number | null
  longitude: number | null
  imagemPerfil: string | null
}

export interface InvestorDetailsData {
  nome: string
  tipo: string
  biografia: string
  segmentos: string[]
  linkedinUrl: string | null
  cidade: string | null
  estado: string | null
  imagemPerfil: string | null
}

export interface RodadaDisponivelData {
  id: number
  startupId: number
  valorAlvo: number
  valorCaptado: number
  percentualEquityOferecido: number
  status: string
  dataInicio: string
  startup: {
    id: number
    usuarioId: string
    nomeStartup: string
    fase: string
    segmentoId: number
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
}

export interface StartupDetailsData {
  id: number
  nomeStartup: string
  fase: string
  segmentoId: number
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
  rodada: StartupRodadaData | null
}

type StartupPayload = Omit<StartupPerfilInput, 'usuarioId'>
type InvestorPayload = Omit<InvestidorPerfilInput, 'usuarioId'>

export function carregarSegmentos(): Promise<SegmentoOption[]> {
  return apiRequest('/segments')
}

export function carregarRodadasAbertas(): Promise<RodadaDisponivelData[]> {
  return apiRequest('/rounds/open')
}

export function carregarDetalhesStartup(usuarioId: string): Promise<StartupDetailsData> {
  return apiRequest(`/startups/${usuarioId}/details`)
}

export function carregarDetalhesInvestidor(usuarioId: string): Promise<InvestorDetailsData> {
  return apiRequest(`/investors/${usuarioId}/details`)
}

export async function salvarPerfilStartup({ usuarioId: _usuarioId, ...input }: StartupPerfilInput): Promise<void> {
  await apiRequest<StartupPerfilData>('/me/startup-profile', {
    method: 'PUT',
    body: JSON.stringify(input satisfies StartupPayload),
  })
}

export async function salvarPerfilInvestidor({ usuarioId: _usuarioId, ...input }: InvestidorPerfilInput): Promise<void> {
  await apiRequest<InvestidorPerfilData>('/me/investor-profile', {
    method: 'PUT',
    body: JSON.stringify(input satisfies InvestorPayload),
  })
}

export async function excluirPerfilStartup(): Promise<void> {
  await apiRequest<void>('/me/startup-profile', { method: 'DELETE' })
}

export async function excluirPerfilInvestidor(): Promise<void> {
  await apiRequest<void>('/me/investor-profile', { method: 'DELETE' })
}

export async function carregarPerfilStartup(_usuarioId: string): Promise<StartupPerfilData | null> {
  try {
    return await apiRequest('/me/startup-profile')
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function carregarPerfilInvestidor(_usuarioId: string): Promise<InvestidorPerfilData | null> {
  try {
    return await apiRequest('/me/investor-profile')
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}
