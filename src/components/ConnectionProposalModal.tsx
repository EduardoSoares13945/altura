import { LoaderCircle, Send, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { criarConexao, type ConnectionData } from '../lib/connectionApi'
import { traduzirErroApi } from '../lib/apiErrors'
import type { RodadaDisponivelData } from '../lib/perfilApi'

export function ConnectionProposalModal({ rodada, onClose, onCreated }: { rodada: RodadaDisponivelData; onClose: () => void; onCreated: (connection: ConnectionData) => void }) {
  const [value, setValue] = useState('')
  const [message, setMessage] = useState(`Olá! Tenho interesse em conhecer melhor a ${rodada.startup.nomeStartup} e entender os próximos passos da rodada.`)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (message.trim().length < 10 || busy) return
    const numericValue = value ? Number(value.replace(/\D/g, '')) : null
    if (numericValue !== null && numericValue < 1000) {
      setError('O valor indicativo mínimo é R$ 1.000.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const connection = await criarConexao({ captacaoId: rodada.id, valorProposto: numericValue, mensagem: message.trim() })
      onCreated(connection)
    } catch (requestError) {
      setError(traduzirErroApi(requestError))
    } finally {
      setBusy(false)
    }
  }

  return <div className="details-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="proposal-modal" role="dialog" aria-modal="true" aria-labelledby="proposal-title"><button className="details-modal-close" type="button" onClick={onClose} aria-label="Fechar proposta"><X size={20} /></button><p className="kicker">Demonstrar interesse</p><h2 id="proposal-title">Conectar com {rodada.startup.nomeStartup}</h2><p className="proposal-intro">Envie uma mensagem inicial. Se a startup aceitar, a conversa será liberada para os dois.</p><form onSubmit={submit}><label><span>Valor indicativo <small>(opcional)</small></span><div className="proposal-value-input"><span>R$</span><input type="text" inputMode="numeric" value={value} onChange={(event) => setValue(formatCurrencyInput(event.target.value))} placeholder="Ex.: 150.000" aria-label="Valor indicativo em reais" /></div></label><label><span>Mensagem para a startup</span><textarea rows={5} minLength={10} maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} /></label><small className="proposal-counter">{message.length}/500</small>{error && <div className="feed-alert" role="alert">{error}</div>}<div className="proposal-actions"><button className="button button-outline" type="button" onClick={onClose}>Cancelar</button><button className="button button-navy" type="submit" disabled={message.trim().length < 10 || busy}>{busy ? <LoaderCircle className="feed-spin" size={17} /> : <Send size={17} />}Enviar interesse</button></div></form></section></div>
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 15)
  return digits ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Number(digits)) : ''
}
