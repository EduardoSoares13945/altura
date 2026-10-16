import { Bell, Briefcase, CheckCheck, Heart, LogOut, Megaphone, MessageCircle, Settings, Trash2, TrendingUp, UserPlus, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import genericInvestorImage from '../assets/generic_Investor.png'
import genericStartupImage from '../assets/generic_Startup.png'
import { signOut } from '../auth/authApi'
import { useAuth } from '../auth/useAuth'
import { carregarConexoes } from '../lib/connectionApi'
import { carregarNotificacoes, contarNotificacoesNaoLidas, excluirTodasNotificacoes, marcarNotificacaoComoLida, marcarTodasNotificacoesComoLidas, type NotificationData } from '../lib/notificationApi'
import { Brand } from './Brand'
import { DashboardNavMenu } from './DashboardNavMenu'
import { ExcluirPerfilButton } from './ExcluirPerfil'
import { ThemeToggle } from './ThemeToggle'

interface AppPlaceholderProps {
  /** Chamado após a exclusão do perfil com sucesso (leva o usuário ao /onboarding). */
  onExcluido: () => void
}

export function AppPlaceholder({ onExcluido }: AppPlaceholderProps) {
  const { usuario } = useAuth()
  const isStartup = usuario?.tipo === 'startup'
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [acceptedConnections, setAcceptedConnections] = useState(0)

  const refreshNotifications = useCallback(async (silent = false) => {
    if (!silent) setNotificationsLoading(true)
    try {
      const [items, count] = await Promise.all([
        carregarNotificacoes(),
        contarNotificacoesNaoLidas(),
      ])
      setNotifications(items)
      setUnreadCount(count.naoLidas)
    } catch {
      // O painel continua utilizável mesmo se o módulo ainda não estiver disponível.
    } finally {
      if (!silent) setNotificationsLoading(false)
    }
  }, [])

  const refreshConnections = useCallback(async () => {
    try {
      const connections = await carregarConexoes()
      setAcceptedConnections(connections.filter((connection) => connection.status === 'aceito').length)
    } catch {
      // Mantém o último total conhecido caso a API fique temporariamente indisponível.
    }
  }, [])

  useEffect(() => {
    void refreshNotifications()
    void refreshConnections()
    const intervalId = window.setInterval(() => {
      void refreshNotifications(true)
      void refreshConnections()
    }, 20000)
    return () => window.clearInterval(intervalId)
  }, [refreshConnections, refreshNotifications])

  const markRead = (notification: NotificationData) => {
    if (notification.lida) return
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, lida: true } : item))
    setUnreadCount((current) => Math.max(0, current - 1))
    void marcarNotificacaoComoLida(notification.id).catch(() => void refreshNotifications(true))
  }

  const markAllRead = async () => {
    setNotifications((current) => current.map((item) => ({ ...item, lida: true })))
    setUnreadCount(0)
    try {
      await marcarTodasNotificacoesComoLidas()
    } catch {
      void refreshNotifications(true)
    }
  }

  const clearNotifications = async () => {
    if (!window.confirm('Limpar toda a lista de notificações? Esta ação não pode ser desfeita.')) return
    try {
      await excluirTodasNotificacoes()
      setNotifications([])
      setUnreadCount(0)
    } catch {
      void refreshNotifications(true)
    }
  }

  return (
    <main id="conteudo" className="dashboard-shell">
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-brand">
            <DashboardNavMenu />
            <Brand />
            <div className="dashboard-user-info">
              <p className="kicker">Painel Altura</p>
              <h1>Olá, {usuario?.nome || 'bem-vindo(a)'}</h1>
            </div>
          </div>
          <div className="dashboard-actions">
            <ThemeToggle />
            <a className="button button-ghost button-compact" href="/editar-perfil">
              <Settings size={18} aria-hidden="true" />
              <span>Editar perfil</span>
            </a>
            <ExcluirPerfilButton onExcluido={onExcluido} />
            <button className="button button-outline button-compact" type="button" onClick={() => void signOut()}>
              <LogOut size={18} aria-hidden="true" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Visão geral</h2>
            <p className="section-description">
              {isStartup
                ? 'Acompanhe o progresso da sua startup e suas rodadas de captação.'
                : 'Acompanhe suas conexões e oportunidades de investimento.'}
            </p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-navy">
                {isStartup ? <Briefcase size={24} aria-hidden="true" /> : <Users size={24} aria-hidden="true" />}
              </div>
              <div className="stat-content">
                <p className="stat-label">{isStartup ? 'Rodadas abertas' : 'Conexões'}</p>
                <p className="stat-value">{isStartup ? 0 : acceptedConnections}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-teal">
                <TrendingUp size={24} aria-hidden="true" />
              </div>
              <div className="stat-content">
                <p className="stat-label">{isStartup ? 'Valor captado' : 'Investimentos'}</p>
                <p className="stat-value">
                  R$ 0
                </p>
              </div>
            </div>

            <button className="stat-card notification-stat-card" type="button" onClick={() => document.querySelector('#notificacoes')?.scrollIntoView({ behavior: 'smooth' })}>
              <div className="stat-icon stat-icon-navy">
                <Bell size={24} aria-hidden="true" />
              </div>
              <div className="stat-content">
                <p className="stat-label">Notificações</p>
                <p className="stat-value">{unreadCount}</p>
                <small>{unreadCount === 1 ? '1 nova interação' : `${unreadCount} novas interações`}</small>
              </div>
              {unreadCount > 0 && <span className="notification-stat-dot" aria-hidden="true" />}
            </button>
          </div>
        </section>

        <section className="dashboard-section" id="notificacoes">
          <div className="section-header">
            <div><h2>Notificações</h2><p className="section-description">Conexões, mensagens e interações recentes com seu perfil.</p></div>
            {notifications.length > 0 && <div className="notification-actions">
              {unreadCount > 0 && <button className="button button-ghost button-compact" type="button" onClick={() => void markAllRead()}><CheckCheck size={17} />Marcar todas como lidas</button>}
              <button className="button button-ghost button-compact notification-clear" type="button" onClick={() => void clearNotifications()}><Trash2 size={17} />Limpar lista</button>
            </div>}
          </div>
          <NotificationCenter notifications={notifications} loading={notificationsLoading} onRead={markRead} />
        </section>

        <section className="dashboard-section">
          <div className="section-header">
            <h2>Ações rápidas</h2>
            <p className="section-description">
              {isStartup
                ? 'Gerencie seu perfil e inicie novas rodadas.'
                : 'Gerencie seu perfil e descubra novas oportunidades.'}
            </p>
          </div>

          <div className="quick-actions">
            <a className="quick-action-card" href="/feed">
              <div className="quick-action-icon">
                <Megaphone size={24} aria-hidden="true" />
              </div>
              <div className="quick-action-content">
                <h3>Feed de tração</h3>
                <p>{isStartup ? 'Publique avanços e acompanhe a rede' : 'Busque startups e sinais de tração'}</p>
              </div>
            </a>

            <a className="quick-action-card" href="/conversas">
              <div className="quick-action-icon">
                <MessageCircle size={24} aria-hidden="true" />
              </div>
              <div className="quick-action-content">
                <h3>Conexões e conversas</h3>
                <p>{isStartup ? 'Responda investidores e converse' : 'Acompanhe propostas e negociações'}</p>
              </div>
            </a>

            {!isStartup && <a className="quick-action-card" href="/explorar-rodadas">
              <div className="quick-action-icon">
                <Users size={24} aria-hidden="true" />
              </div>
              <div className="quick-action-content">
                <h3>Explorar rodadas</h3>
                <p>Encontre oportunidades</p>
              </div>
            </a>}

            <a className="quick-action-card" href="/editar-perfil">
              <div className="quick-action-icon">
                <Settings size={24} aria-hidden="true" />
              </div>
              <div className="quick-action-content">
                <h3>Editar perfil</h3>
                <p>Atualize suas informações</p>
              </div>
            </a>

            {isStartup && (
              <div className="quick-action-card quick-action-disabled">
                <div className="quick-action-icon">
                  <Briefcase size={24} aria-hidden="true" />
                </div>
                <div className="quick-action-content">
                  <h3>Nova rodada</h3>
                  <p>Em breve</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function NotificationCenter({ notifications, loading, onRead }: { notifications: NotificationData[]; loading: boolean; onRead: (notification: NotificationData) => void }) {
  if (loading) return <div className="activity-placeholder notification-empty"><div className="activity-empty"><div className="activity-icon"><Bell size={42} /></div><h3>Carregando notificações</h3><p>Buscando as interações mais recentes.</p></div></div>
  if (notifications.length === 0) return <div className="activity-placeholder notification-empty"><div className="activity-empty"><div className="activity-icon"><Bell size={42} /></div><h3>Nenhuma notificação ainda</h3><p>Novas conexões, mensagens, curtidas e comentários aparecerão aqui.</p></div></div>

  return <div className="notification-center">
    {notifications.map((notification) => {
      const fallback = notification.atorTipo === 'investidor' ? genericInvestorImage : genericStartupImage
      return <a
        className={`notification-item${notification.lida ? '' : ' is-unread'}`}
        href={notification.destino}
        key={notification.id}
        onClick={() => onRead(notification)}
      >
        <div className="notification-avatar"><img src={notification.atorImagem || fallback} alt={notification.atorImagem ? `Imagem de perfil de ${notification.atorNome}` : ''} /><span><NotificationTypeIcon type={notification.tipo} /></span></div>
        <div className="notification-copy"><div><strong>{notification.titulo}</strong><time dateTime={notification.criadoEm}>{relativeTime(notification.criadoEm)}</time></div><p><b>{notification.atorNome}</b> {notification.mensagem}</p></div>
        {!notification.lida && <span className="notification-unread-dot" aria-label="Não lida" />}
      </a>
    })}
  </div>
}

function NotificationTypeIcon({ type }: { type: NotificationData['tipo'] }) {
  if (type === 'curtida') return <Heart size={12} fill="currentColor" />
  if (type === 'comentario' || type === 'mensagem') return <MessageCircle size={12} />
  return <UserPlus size={12} />
}

function relativeTime(value: string) {
  const date = new Date(value)
  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [unit, size] of units) if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit)
  return 'agora'
}
