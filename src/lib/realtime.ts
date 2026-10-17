import { getApiBaseUrl, getSession } from '../auth/authApi'
import type { MessageData, ProposalData } from './connectionApi'

export type RealtimeEvent =
  | { type: 'message.created'; connectionId: number; message: MessageData }
  | { type: 'connection.deleted'; connectionId: number; message: null }
  | { type: 'connection.changed'; connectionId: number; message: null }
  | { type: 'proposal.changed'; connectionId: number; message: ProposalData | null }
  | { type: 'notification.changed'; connectionId: 0; message: null }
  | { type: 'round.changed'; connectionId: number; message: null }

export function subscribeRealtime(listener: (event: RealtimeEvent) => void) {
  let stopped = false
  let socket: WebSocket | null = null
  let reconnectTimer: number | null = null

  const connect = async () => {
    const session = await getSession()
    if (stopped || !session) return

    socket = new WebSocket(buildWebSocketUrl(session.accessToken))
    socket.onmessage = (message) => {
      try {
        listener(JSON.parse(message.data as string) as RealtimeEvent)
      } catch {
        // Ignora eventos inválidos sem derrubar a conexão.
      }
    }
    socket.onclose = () => {
      if (!stopped) reconnectTimer = window.setTimeout(() => void connect(), 3000)
    }
    socket.onerror = () => socket?.close()
  }

  void connect()
  return () => {
    stopped = true
    if (reconnectTimer !== null) window.clearTimeout(reconnectTimer)
    socket?.close()
  }
}

function buildWebSocketUrl(accessToken: string) {
  const apiUrl = new URL(getApiBaseUrl(), window.location.origin)
  apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  apiUrl.pathname = `${apiUrl.pathname.replace(/\/?api\/?$/, '')}/ws`.replace(/\/{2,}/g, '/')
  apiUrl.search = ''
  apiUrl.searchParams.set('access_token', accessToken)
  return apiUrl.toString()
}
