import { apiRequest } from './api'

export type ConnectionStatus = 'pendente' | 'aceito' | 'recusado'

export interface ConnectionData {
  id: number
  status: ConnectionStatus
  valorProposto: number | null
  mensagemInicial: string
  criadoEm: string
  atualizadoEm: string
  naoLidas: number
  contraparte: {
    usuarioId: string
    nome: string
    tipo: 'startup' | 'investidor'
    tipoInvestidor: string | null
    nomeResponsavel: string | null
    imagemPerfil: string | null
  }
  rodada: {
    captacaoId: number
    startupId: number
    startupNome: string
  }
}

export interface MessageData {
  id: number
  remetenteId: string
  remetenteNome: string
  conteudo: string
  criadoEm: string
  lida: boolean
}

export function carregarConexoes() {
  return apiRequest<ConnectionData[]>('/connections')
}

export function criarConexao(input: { captacaoId: number; valorProposto: number | null; mensagem: string }) {
  return apiRequest<ConnectionData>('/connections', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function responderConexao(connectionId: number, status: 'aceito' | 'recusado') {
  return apiRequest<ConnectionData>(`/connections/${connectionId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function carregarMensagens(connectionId: number) {
  return apiRequest<MessageData[]>(`/connections/${connectionId}/messages`)
}

export function enviarMensagem(connectionId: number, conteudo: string) {
  return apiRequest<MessageData>(`/connections/${connectionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ conteudo }),
  })
}

export function excluirConexao(connectionId: number) {
  return apiRequest<void>(`/connections/${connectionId}`, { method: 'DELETE' })
}
