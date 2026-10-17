import { apiRequest } from './api'

export type RoundStatus = 'aberta' | 'encerrada' | 'cancelada'

export interface ManagedRoundData {
  id: number
  valorAlvo: number
  valorCaptado: number
  percentualEquityOferecido: number
  status: RoundStatus
  dataInicio: string
  dataFim: string | null
  propostas: number
  propostasPendentes: number
}

export interface DashboardSummaryData {
  tipo: 'startup' | 'investidor'
  quantidadePrincipal: number
  valorTotal: number
}

export interface RoundInput {
  valorAlvo: number
  percentualEquityOferecido: number
  dataFim: string | null
}

export const carregarMinhasRodadas = () => apiRequest<ManagedRoundData[]>('/rounds/mine')
export const criarRodada = (input: RoundInput) => apiRequest<ManagedRoundData>('/rounds', { method: 'POST', body: JSON.stringify(input) })
export const atualizarRodada = (id: number, input: RoundInput) => apiRequest<ManagedRoundData>(`/rounds/${id}`, { method: 'PUT', body: JSON.stringify(input) })
export const atualizarStatusRodada = (id: number, status: RoundStatus) => apiRequest<ManagedRoundData>(`/rounds/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
export const carregarResumoDashboard = () => apiRequest<DashboardSummaryData>('/dashboard/summary')
