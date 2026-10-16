import { BriefcaseBusiness, Linkedin, LoaderCircle, MapPin, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import genericInvestorImage from '../assets/generic_Investor.png'
import { traduzirErroApi } from '../lib/apiErrors'
import { carregarDetalhesInvestidor, type InvestorDetailsData } from '../lib/perfilApi'
import { SegmentIcon } from './SegmentIcon'

export function InvestorDetailsModal({ investorUserId, onClose }: { investorUserId: string; onClose: () => void }) {
  const [investor, setInvestor] = useState<InvestorDetailsData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void carregarDetalhesInvestidor(investorUserId)
      .then((data) => { if (active) setInvestor(data) })
      .catch((requestError) => { if (active) setError(traduzirErroApi(requestError)) })
    return () => { active = false }
  }, [investorUserId])

  return <div className="details-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="details-modal investor-details-modal" role="dialog" aria-modal="true" aria-labelledby="investor-details-title">
      <button className="details-modal-close" type="button" onClick={onClose} aria-label="Fechar perfil"><X size={20} /></button>
      {!investor && !error ? <div className="investor-details-status"><LoaderCircle className="feed-spin" size={30} /><p>Carregando perfil do investidor…</p></div>
        : error || !investor ? <div className="investor-details-status"><p>{error || 'Perfil indisponível.'}</p></div>
        : <>
          <div className="details-modal-heading investor-details-heading">
            <div className="rodada-card-logo investor-details-avatar"><img src={investor.imagemPerfil || genericInvestorImage} alt={investor.imagemPerfil ? `Foto de ${investor.nome}` : ''} /></div>
            <div><p className="kicker">Perfil do investidor</p><h2 id="investor-details-title">{investor.nome}</h2><p><BriefcaseBusiness size={15} />{investor.tipo}</p></div>
          </div>
          {(investor.cidade || investor.estado) && <div className="investor-details-location"><MapPin size={16} />{[investor.cidade, investor.estado].filter(Boolean).join(' · ')}</div>}
          <div className="details-modal-section details-modal-section--about"><h3>Sobre</h3><p className="details-modal-about-text">{investor.biografia || 'O investidor ainda não adicionou uma biografia.'}</p></div>
          <div className="details-modal-section"><h3>Segmentos de interesse</h3>{investor.segmentos.length > 0 ? <div className="details-modal-tags">{investor.segmentos.map((segment) => <span key={segment}><SegmentIcon nome={segment} />{segment}</span>)}</div> : <p className="investor-details-muted">Nenhum segmento informado.</p>}</div>
          {investor.linkedinUrl && <div className="details-modal-actions"><a className="button button-navy" href={investor.linkedinUrl} target="_blank" rel="noreferrer"><Linkedin size={17} />Ver LinkedIn</a></div>}
        </>}
    </section>
  </div>
}
