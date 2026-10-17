import investorImage from '../assets/generic_Investor.png'
import { Linkedin } from 'lucide-react'
import { SegmentIcon } from './SegmentIcon'

interface InvestorProfilePreviewProps {
  imagemPerfil: string
  nome: string
  tipo: string
  biografia: string
  segmentos: string[]
  cidade: string
  estado: string
  linkedinUrl: string
}

export function InvestorProfilePreview({ imagemPerfil, nome, tipo, biografia, segmentos, cidade, estado, linkedinUrl }: InvestorProfilePreviewProps) {
  const nomeExibido = nome.trim() || 'Nome do investidor'
  const tipoExibido = tipo || 'Tipo de investidor não selecionado'
  const localizacaoExibida = [cidade.trim(), estado].filter(Boolean).join(', ')
  const segmentosExibidos = segmentos.length > 0 ? segmentos : ['Segmentos de interesse não selecionados']

  return (
    <div className="startup-profile-preview investor-profile-preview">
      <div className="startup-profile-preview-card investor-profile-preview-card">
        <div className="startup-profile-preview-header investor-profile-preview-header">
          <div className="startup-profile-preview-logo">
            <img src={imagemPerfil || investorImage} alt={imagemPerfil ? `Foto de perfil de ${nomeExibido}` : ''} />
          </div>
          <div>
            <span className="investor-profile-preview-kicker">Perfil do investidor</span>
            <h3>{nomeExibido}</h3>
            <p>{tipoExibido}{localizacaoExibida && ` · ${localizacaoExibida}`}</p>
          </div>
        </div>
        <section className="investor-profile-preview-about">
          <span>Sobre</span>
          <p>{biografia.trim() || 'O investidor ainda não adicionou uma biografia.'}</p>
        </section>
        <div className="investor-profile-preview-segments">
          <span>Segmentos de interesse</span>
          <div>
            {segmentosExibidos.map((segmento) => <em key={segmento}><SegmentIcon nome={segmento} />{segmento}</em>)}
          </div>
        </div>
        {linkedinUrl.trim() && <div className="investor-profile-preview-actions"><span className="button button-linkedin button-compact"><Linkedin size={16} aria-hidden="true" />Ver LinkedIn</span></div>}
      </div>
      <small>Prévia do perfil exibido para startups</small>
    </div>
  )
}
