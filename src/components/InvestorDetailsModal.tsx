import { Linkedin, LoaderCircle, MessageCircle, Send, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import genericInvestorImage from '../assets/generic_Investor.png'
import { traduzirErroApi } from '../lib/apiErrors'
import { criarConexaoInicial } from '../lib/connectionApi'
import { carregarDetalhesInvestidor, type InvestorDetailsData } from '../lib/perfilApi'
import { useAuth } from '../auth/useAuth'
import { SegmentIcon } from './SegmentIcon'
import { ZoomableImage } from './ZoomableImage'
import { useErrorToast } from './ToastProvider'

export function InvestorDetailsModal({ investorUserId, onClose }: { investorUserId: string; onClose: () => void }) {
  const { usuario } = useAuth()
  const [investor, setInvestor] = useState<InvestorDetailsData | null>(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [connectionSent, setConnectionSent] = useState(false)
  const [composing, setComposing] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  useErrorToast(error)
  useErrorToast(actionError)

  useEffect(() => {
    let active = true
    void carregarDetalhesInvestidor(investorUserId)
      .then((data) => {
        if (!active) return
        setInvestor(data)
        setMessage(buildHelloMessage(data))
      })
      .catch((requestError) => { if (active) setError(traduzirErroApi(requestError)) })
    return () => { active = false }
  }, [investorUserId])

  const startNegotiation = () => {
    if (connectionSent || usuario?.tipo !== 'startup') return
    setActionError('')
    setComposing(true)
  }

  const sendHello = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (sending || connectionSent || message.trim().length < 10) return
    if (sending || connectionSent || usuario?.tipo !== 'startup') return
    setSending(true)
    setActionError('')
    try {
      await criarConexaoInicial(investorUserId, message.trim())
      setConnectionSent(true)
      setComposing(false)
    } catch (requestError) {
      setActionError(traduzirErroApi(requestError))
    } finally {
      setSending(false)
    }
  }

  return createPortal(<div className="details-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="details-modal investor-details-modal" role="dialog" aria-modal="true" aria-labelledby="investor-details-title">
      <button className="details-modal-close" type="button" onClick={onClose} aria-label="Fechar perfil"><X size={20} /></button>
      {!investor && !error ? <div className="investor-details-status"><LoaderCircle className="feed-spin" size={30} /><p>Carregando perfil do investidor…</p></div>
        : error || !investor ? <div className="investor-details-status"><p>{error || 'Perfil indisponível.'}</p></div>
        : <>
          <div className="startup-profile-preview-header investor-details-preview-header">
            <div className="startup-profile-preview-logo investor-details-preview-avatar"><ZoomableImage src={investor.imagemPerfil || genericInvestorImage} alt={investor.imagemPerfil ? `Foto de ${investor.nome}` : `Imagem padrão de ${investor.nome}`} /></div>
            <div><p className="kicker">Perfil do investidor</p><h2 id="investor-details-title">{investor.nome}</h2><p>{investor.tipo}{(investor.cidade || investor.estado) && ` · ${[investor.cidade, investor.estado].filter(Boolean).join(', ')}`}</p></div>
          </div>
          <div className="details-modal-section details-modal-section--about"><h3>Sobre</h3><p className="details-modal-about-text">{investor.biografia || 'O investidor ainda não adicionou uma biografia.'}</p></div>
          <div className="details-modal-section"><h3>Segmentos de interesse</h3>{investor.segmentos.length > 0 ? <div className="details-modal-tags">{investor.segmentos.map((segment) => <span key={segment}><SegmentIcon nome={segment} />{segment}</span>)}</div> : <p className="investor-details-muted">Nenhum segmento informado.</p>}</div>
          {composing && !connectionSent && <form className="investor-hello-composer" onSubmit={sendHello}>
            <p className="kicker">Primeiro contato</p>
            <h3>Apresente sua startup</h3>
            <p>Escreva uma mensagem curta para abrir a conversa. O investidor poderá aceitar ou recusar sua solicitação.</p>
            <textarea rows={5} maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} aria-label="Mensagem para o investidor" />
            <small className="proposal-counter">{message.length}/500</small>
            <div className="proposal-actions">
              <button className="button button-outline" type="button" onClick={() => setComposing(false)}>Cancelar</button>
              <button className="button button-navy" type="submit" disabled={sending || message.trim().length < 10}>{sending ? <LoaderCircle className="feed-spin" size={17} /> : <Send size={17} />}Enviar solicitação</button>
            </div>
          </form>}
          <div className="details-modal-actions investor-linkedin-actions">
            {!composing && <button className="button button-navy investor-negotiation-button" type="button" disabled={connectionSent || usuario?.tipo !== 'startup'} onClick={startNegotiation} title={usuario?.tipo !== 'startup' ? 'Disponível para startups' : undefined}>
              <MessageCircle size={17} aria-hidden="true" />
              {connectionSent ? 'Solicitação enviada' : 'Iniciar negociação'}
            </button>}
            {investor.linkedinUrl && <a className="button button-linkedin" href={investor.linkedinUrl} target="_blank" rel="noreferrer"><Linkedin size={17} aria-hidden="true" />Ver LinkedIn</a>}
          </div>
        </>}
    </section>
  </div>, document.body)
}

function buildHelloMessage(investor: InvestorDetailsData) {
  const focus = investor.segmentos.slice(0, 2).join(' e ')
  return focus
    ? `Olá, ${investor.nome}! Vi que você acompanha oportunidades em ${focus}. Nossa startup está em um momento de captação e acredito que podemos chegar a um acordo. Gostaria de apresentar melhor o projeto e entender se faz sentido conversarmos.`
    : `Olá, ${investor.nome}! Conheci seu perfil e acredito que podemos chegar a um acordo. Gostaria de apresentar melhor o projeto e entender se faz sentido conversarmos.`
}
