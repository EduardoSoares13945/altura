import { apiRequest } from './api'

export type NotificationType = 'conexao' | 'status_conexao' | 'mensagem' | 'curtida' | 'comentario'

export interface NotificationData {
  id: number
  tipo: NotificationType
  titulo: string
  mensagem: string
  atorId: string
  atorNome: string
  atorTipo: 'startup' | 'investidor'
  atorImagem: string | null
  destino: string
  lida: boolean
  criadoEm: string
}

export function carregarNotificacoes(limit = 30) {
  return apiRequest<NotificationData[]>(`/notifications?limit=${limit}`)
}

export function contarNotificacoesNaoLidas() {
  return apiRequest<{ naoLidas: number }>('/notifications/unread-count')
}

export function marcarNotificacaoComoLida(notificationId: number) {
  return apiRequest<void>(`/notifications/${notificationId}/read`, { method: 'PATCH' })
}

export function marcarTodasNotificacoesComoLidas() {
  return apiRequest<void>('/notifications/read-all', { method: 'PATCH' })
}

export function excluirTodasNotificacoes() {
  return apiRequest<void>('/notifications', { method: 'DELETE' })
}
