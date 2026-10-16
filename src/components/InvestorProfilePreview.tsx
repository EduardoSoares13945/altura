import investorImage from '../assets/generic_Investor.png'
import { Check, Info } from 'lucide-react'
import { SegmentIcon } from './SegmentIcon'

interface InvestorProfilePreviewProps {
  imagemPerfil: string
  nome: string
  tipo: string
  segmentos: string[]
  cidade: string
  estado: string
}

export function InvestorProfilePreview({ imagemPerfil, nome, tipo, segmentos, cidade, estado }: InvestorProfilePreviewProps) {
  const nomeExibido = nome.trim() || 'Nome do investidor'
  const tipoExibido = tipo || 'Tipo de investidor não selecionado'
  const localizacaoExibida = [cidade.trim(), estado].filter(Boolean).join(', ')
  const segmentosExibidos = segmentos.length > 0 ? segmentos : ['Segmentos de interesse não selecionados']

  return (
    <div className="startup-profile-preview investor-profile-preview">
      <div className="startup-profile-preview-card">
        <div className="startup-profile-preview-header">
          <div className="startup-profile-preview-logo">
            <img src={imagemPerfil || investorImage} alt={imagemPerfil ? `Foto de perfil de ${nomeExibido}` : ''} />
          </div>
          <div>
            <h3>{nomeExibido}</h3>
            <p>{tipoExibido}{localizacaoExibida && ` · ${localizacaoExibida}`}</p>
          </div>
        </div>
        <div className="investor-profile-preview-segments">
          <span>Segmentos de interesse</span>
          <div>
            {segmentosExibidos.map((segmento) => <em key={segmento}><SegmentIcon nome={segmento} />{segmento}</em>)}
          </div>
        </div>
        <div className="startup-profile-preview-actions">
          <button className="button button-success button-compact" type="button" disabled>
            <Check size={16} aria-hidden="true" />
            Aceitar proposta
          </button>
          <button className="button button-outline button-compact" type="button" disabled>
            <Info size={16} aria-hidden="true" />
            Mais detalhes
          </button>
        </div>
      </div>
      <small>Prévia do perfil exibido para startups</small>
    </div>
  )
}
