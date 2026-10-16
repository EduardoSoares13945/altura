import { Camera, Check, Trash2, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import genericInvestorImage from '../assets/generic_Investor.png'
import genericStartupImage from '../assets/generic_Startup.png'
import { prepararImagemPerfil, validarArquivoImagemPerfil } from '../utils/imagemPerfil'

const TAMANHO_AREA_RECORTE = 280

interface ImagemSelecionada {
  arquivo: File
  url: string
}

interface ProfileImageFieldProps {
  tipo: 'startup' | 'investidor'
  value: string
  onChange: (value: string) => void
}

export function ProfileImageField({ tipo, value, onChange }: ProfileImageFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)
  const [imagemSelecionada, setImagemSelecionada] = useState<ImagemSelecionada | null>(null)
  const [dimensoes, setDimensoes] = useState({ largura: 0, altura: 0 })
  const [zoom, setZoom] = useState(1)
  const [deslocamento, setDeslocamento] = useState({ x: 0, y: 0 })
  const arraste = useRef<{ inicioX: number; inicioY: number; origemX: number; origemY: number } | null>(null)
  const fallback = tipo === 'startup' ? genericStartupImage : genericInvestorImage
  const titulo = tipo === 'startup' ? 'Logo ou imagem de perfil' : 'Foto de perfil'

  const selecionar = (arquivo?: File) => {
    if (!arquivo) return
    setErro('')
    try {
      validarArquivoImagemPerfil(arquivo)
      setImagemSelecionada({ arquivo, url: URL.createObjectURL(arquivo) })
      setDimensoes({ largura: 0, altura: 0 })
      setZoom(1)
      setDeslocamento({ x: 0, y: 0 })
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível processar a imagem.')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const fecharRecorte = () => {
    if (imagemSelecionada) URL.revokeObjectURL(imagemSelecionada.url)
    setImagemSelecionada(null)
    setDimensoes({ largura: 0, altura: 0 })
    arraste.current = null
  }

  const aplicarRecorte = async () => {
    if (!imagemSelecionada || !dimensoes.largura || !dimensoes.altura) return
    setProcessando(true)
    setErro('')
    try {
      onChange(await prepararImagemPerfil(imagemSelecionada.arquivo, {
        zoom,
        deslocamentoX: deslocamento.x,
        deslocamentoY: deslocamento.y,
        tamanhoArea: TAMANHO_AREA_RECORTE,
      }))
      fecharRecorte()
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível processar a imagem.')
    } finally {
      setProcessando(false)
    }
  }

  const limitarDeslocamento = (x: number, y: number, proximoZoom = zoom) => {
    if (!dimensoes.largura || !dimensoes.altura) return { x: 0, y: 0 }
    const escalaBase = Math.max(TAMANHO_AREA_RECORTE / dimensoes.largura, TAMANHO_AREA_RECORTE / dimensoes.altura)
    const largura = dimensoes.largura * escalaBase * proximoZoom
    const altura = dimensoes.altura * escalaBase * proximoZoom
    const limiteX = Math.max(0, (largura - TAMANHO_AREA_RECORTE) / 2)
    const limiteY = Math.max(0, (altura - TAMANHO_AREA_RECORTE) / 2)
    return {
      x: Math.max(-limiteX, Math.min(limiteX, x)),
      y: Math.max(-limiteY, Math.min(limiteY, y)),
    }
  }

  const estiloImagemRecorte = () => {
    if (!dimensoes.largura || !dimensoes.altura) return undefined
    const escalaBase = Math.max(TAMANHO_AREA_RECORTE / dimensoes.largura, TAMANHO_AREA_RECORTE / dimensoes.altura)
    const escala = escalaBase * zoom
    const largura = dimensoes.largura * escala
    const altura = dimensoes.altura * escala
    return {
      width: largura,
      height: altura,
      left: (TAMANHO_AREA_RECORTE - largura) / 2 + deslocamento.x,
      top: (TAMANHO_AREA_RECORTE - altura) / 2 + deslocamento.y,
    }
  }

  return (
    <div className="profile-image-field">
      <span className="profile-image-label">{titulo} <span className="optional-label">(opcional)</span></span>
      <div className="profile-image-control">
        <div className={`profile-image-preview profile-image-preview-${tipo}`}>
          <img src={value || fallback} alt={value ? `Prévia da ${titulo.toLowerCase()}` : ''} />
        </div>
        <div className="profile-image-copy">
          <div className="profile-image-actions">
            <button className="button button-outline button-compact" type="button" disabled={processando} onClick={() => inputRef.current?.click()}>
              <Camera size={16} aria-hidden="true" />
              {processando ? 'Processando...' : value ? 'Trocar imagem' : 'Adicionar imagem'}
            </button>
            {value && (
              <button className="profile-image-remove" type="button" onClick={() => { onChange(''); setErro('') }} aria-label="Remover imagem de perfil">
                <Trash2 size={16} aria-hidden="true" />
                Remover
              </button>
            )}
          </div>
          <small>JPG, PNG ou WebP, com até 5 MB. A imagem será recortada em formato quadrado.</small>
          {erro && <small className="form-error" role="alert">{erro}</small>}
        </div>
      </div>
      <input
        ref={inputRef}
        id={inputId}
        className="profile-image-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => selecionar(event.target.files?.[0])}
      />
      {imagemSelecionada && (
        <div className="profile-crop-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !processando) fecharRecorte() }}>
          <section className="profile-crop-modal" role="dialog" aria-modal="true" aria-labelledby={`${inputId}-crop-title`}>
            <div className="profile-crop-heading">
              <div><span className="kicker">Ajustar imagem</span><h2 id={`${inputId}-crop-title`}>Escolha o enquadramento</h2></div>
              <button type="button" onClick={fecharRecorte} disabled={processando} aria-label="Fechar editor de imagem"><X size={20} /></button>
            </div>
            <p>Arraste a imagem e use o zoom até deixar o perfil como deseja.</p>
            <div
              className={`profile-crop-area profile-crop-area-${tipo}`}
              onPointerDown={(event) => {
                arraste.current = { inicioX: event.clientX, inicioY: event.clientY, origemX: deslocamento.x, origemY: deslocamento.y }
                event.currentTarget.setPointerCapture(event.pointerId)
              }}
              onPointerMove={(event) => {
                if (!arraste.current) return
                setDeslocamento(limitarDeslocamento(
                  arraste.current.origemX + event.clientX - arraste.current.inicioX,
                  arraste.current.origemY + event.clientY - arraste.current.inicioY,
                ))
              }}
              onPointerUp={(event) => { arraste.current = null; event.currentTarget.releasePointerCapture(event.pointerId) }}
              onPointerCancel={() => { arraste.current = null }}
            >
              <img
                src={imagemSelecionada.url}
                alt="Imagem a ser recortada"
                draggable="false"
                style={estiloImagemRecorte()}
                onLoad={(event) => setDimensoes({ largura: event.currentTarget.naturalWidth, altura: event.currentTarget.naturalHeight })}
              />
              <span className="profile-crop-grid" aria-hidden="true" />
            </div>
            <label className="profile-crop-zoom">
              <span>Zoom</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(event) => {
                  const proximoZoom = Number(event.target.value)
                  setZoom(proximoZoom)
                  setDeslocamento((atual) => limitarDeslocamento(atual.x, atual.y, proximoZoom))
                }}
              />
              <output>{Math.round(zoom * 100)}%</output>
            </label>
            <div className="profile-crop-actions">
              <button className="button button-outline" type="button" onClick={fecharRecorte} disabled={processando}>Cancelar</button>
              <button className="button button-navy" type="button" onClick={() => void aplicarRecorte()} disabled={processando || !dimensoes.largura}>
                <Check size={17} aria-hidden="true" />
                {processando ? 'Aplicando...' : 'Aplicar recorte'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
