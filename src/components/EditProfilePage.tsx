import { ArrowLeft, ArrowRight, Globe, LocateFixed, LogOut, MapPin } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { z } from 'zod'
import { signOut } from '../auth/authApi'
import { useAuth } from '../auth/useAuth'
import { tiposInvestidor } from '../data/perfil'
import { estadosBrasil } from '../data/perfil'
import {
  carregarPerfilInvestidor,
  carregarPerfilStartup,
  carregarSegmentos,
  salvarPerfilInvestidor,
  salvarPerfilStartup,
  type SegmentoOption,
  type StartupPerfilData,
} from '../lib/perfilApi'
import { traduzirErroApi } from '../lib/apiErrors'
import { mascararCnpj, mascararCpf, somenteDigitos, validarCnpj, validarCpf } from '../utils/documentos'
import { validarUrlLinkedin, validarUrlWeb, validarUrlYoutube } from '../utils/videos'
import { carregarRascunho, limparRascunho, salvarRascunho } from '../utils/perfilDraft'
import { buscarLocalizacaoPorCoordenadas } from '../utils/localizacao'
import { mesAtual } from '../utils/datas'
import { Brand } from './Brand'
import { DashboardNavMenu } from './DashboardNavMenu'
import { useErrorToast } from './ToastProvider'
import { ThemeToggle } from './ThemeToggle'
import { RangeSlider } from './RangeSlider'
import { StartupProfilePreview } from './StartupProfilePreview'
import { InvestorProfilePreview } from './InvestorProfilePreview'
import { ProfileImageField } from './ProfileImageField'
import { SegmentIcon } from './SegmentIcon'
import {
  criarTracaoInicial,
  startupTractionSchema,
  temSinalTracao,
  TractionFields,
  type StartupTractionValues,
} from './TractionFields'
import linkedinLogo from '../assets/svg/linkedin-svgrepo-com.svg'
import { AppLoader } from './AppLoader'

interface EditProfilePageProps {
  onCancel: () => void
  onSave: () => void
}

const startupSchema = z.object({
  nomeResponsavel: z.string().trim().min(2, 'Informe o nome do responsável.'),
  nomeStartup: z.string().trim().min(2, 'Informe o nome da startup.'),
  cnpj: z.string().refine(validarCnpj, 'Informe um CNPJ válido.'),
  segmentoId: z.coerce.number().int().positive('Escolha um segmento.'),
  segmentosSecundarios: z.array(z.number()).default([]),
  descricao: z.string().trim().min(10, 'Descreva a startup em pelo menos 10 caracteres.').max(500, 'Use no máximo 500 caracteres.'),
  videoPitchUrl: z.string().trim().refine((value) => value === '' || validarUrlYoutube(value), 'Informe uma URL válida do YouTube.'),
  dataFundacao: z.string().regex(/^\d{4}-\d{2}$/, 'Informe mês e ano de fundação.').refine((value) => value <= mesAtual(), 'A data de fundação não pode ser futura.'),
  siteUrl: z.string().trim().refine((value) => value === '' || validarUrlWeb(value), 'Informe uma URL válida.'),
  linkedinUrl: z.string().trim().refine((value) => value === '' || validarUrlLinkedin(value), 'Informe uma URL válida do LinkedIn.'),
  localizacao: z.string().trim().max(120, 'Use no máximo 120 caracteres.'),
    cidade: z.string().trim().min(2, 'Informe a cidade.').max(100, 'Use no máximo 100 caracteres.'),
    estado: z.enum(estadosBrasil, { message: 'Selecione o estado.' }),
  valorAlvo: z.coerce.number().positive('Informe uma meta de captação válida.'),
  valorCaptado: z.coerce.number().min(0, 'Informe um valor captado válido.'),
  percentualEquityOferecido: z.coerce.number().positive('Informe o equity oferecido.').max(49.9, 'O equity não pode ultrapassar 49,9%.'),
  status: z.enum(['aberta', 'encerrada']),
  dataFim: z.string(),
}).and(startupTractionSchema).superRefine((data, context) => {
  if (!temSinalTracao(data)) {
    context.addIssue({ code: 'custom', path: ['clientesAtivos'], message: 'Informe ao menos um sinal real de tração: receita, MRR, clientes ou pilotos ativos.' })
  }
  if (data.evidenciaTracao.trim().length < 20) {
    context.addIssue({ code: 'custom', path: ['evidenciaTracao'], message: 'Descreva ao menos uma evidência de tração em 20 caracteres.' })
  }
})

const investidorSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome.'),
  cpf: z.string().refine(validarCpf, 'Informe um CPF válido.'),
  tipo: z.enum(tiposInvestidor, { message: 'Escolha o tipo de investidor.' }),
  biografia: z.string().trim().min(10, 'Escreva uma biografia curta.').max(500, 'Use no máximo 500 caracteres.'),
  segmentos: z.array(z.number()).min(1, 'Escolha pelo menos um segmento.'),
  linkedinUrl: z.string().trim().refine((value) => value === '' || validarUrlLinkedin(value), 'Informe uma URL válida do LinkedIn.'),
  localizacao: z.string().trim().max(120, 'Use no máximo 120 caracteres.'),
  cidade: z.string().trim().min(2, 'Informe a cidade.').max(100, 'Use no máximo 100 caracteres.'),
  estado: z.enum(estadosBrasil, { message: 'Selecione o estado.' }),
  ticketMin: z.number().min(0, 'O ticket mínimo não pode ser negativo.'),
  ticketMax: z.number().positive('Informe um ticket máximo.'),
}).refine((data) => data.ticketMin <= data.ticketMax, { path: ['ticketMax'], message: 'O ticket máximo deve ser maior ou igual ao mínimo.' })

interface StartupValues extends StartupTractionValues {
  nomeResponsavel: string
  nomeStartup: string
  cnpj: string
  segmentoId: number
  segmentosSecundarios: number[]
  descricao: string
  videoPitchUrl: string
  valorAlvo: string
  valorCaptado: string
  percentualEquityOferecido: string
  status: string
  dataFim: string
  dataFundacao: string
  siteUrl: string
  linkedinUrl: string
  localizacao: string
  cidade: string
  estado: string
  latitude: number | null
  longitude: number | null
  imagemPerfil: string
}

interface InvestidorValues {
  nome: string
  cpf: string
  tipo: string
  biografia: string
  segmentos: number[]
  linkedinUrl: string
  localizacao: string
  cidade: string
  estado: string
  latitude: number | null
  longitude: number | null
  imagemPerfil: string
  ticketMin: number
  ticketMax: number
}

type StartupField = keyof StartupValues
type InvestidorField = keyof InvestidorValues

const startupInitial: StartupValues = {
  nomeResponsavel: '',
  nomeStartup: '',
  cnpj: '',
  segmentoId: 0,
  segmentosSecundarios: [],
  descricao: '',
  videoPitchUrl: '',
  valorAlvo: '',
  valorCaptado: '',
  percentualEquityOferecido: '',
  status: '',
  dataFim: '',
  dataFundacao: '',
  siteUrl: '',
  linkedinUrl: '',
  localizacao: '',
  cidade: '',
  estado: '',
  latitude: null,
  longitude: null,
  imagemPerfil: '',
  ...criarTracaoInicial(),
}

const investidorInitial: InvestidorValues = {
  nome: '',
  cpf: '',
  tipo: 'Investidor-anjo',
  biografia: '',
  segmentos: [],
  linkedinUrl: '',
  localizacao: '',
  cidade: '',
  estado: '',
  latitude: null,
  longitude: null,
  imagemPerfil: '',
  ticketMin: 0,
  ticketMax: 10000000,
}

export function EditProfilePage({ onCancel, onSave }: EditProfilePageProps) {
  const { usuario, user, refresh } = useAuth()
  const [segmentos, setSegmentos] = useState<SegmentoOption[]>([])
  const [startupValues, setStartupValues] = useState<StartupValues>(startupInitial)
  const [investidorValues, setInvestidorValues] = useState<InvestidorValues>(investidorInitial)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [locationMessage, setLocationMessage] = useState('')
  const draftReady = useRef(false)

  useEffect(() => {
    let active = true
    void Promise.all([carregarSegmentos(), loadProfileData()])
      .then(([items]) => {
        if (active) setSegmentos(items)
      })
      .catch((error) => {
        console.error('Error loading data:', error)
        if (active) setServerError('Não foi possível carregar os dados. Tente novamente.')
      })
      .finally(() => {
        if (active) setLoadingData(false)
      })
    return () => {
      active = false
    }
  }, [usuario, user])

  useEffect(() => {
    if (loadingData || !user || !usuario) return
    const startupDraft = carregarRascunho<StartupValues>(user.id, 'startup-edit')
    const investorDraft = carregarRascunho<InvestidorValues>(user.id, 'investidor-edit')
    if (startupDraft) setStartupValues((current) => ({ ...current, ...startupDraft }))
    if (investorDraft) setInvestidorValues((current) => ({ ...current, ...investorDraft }))
    draftReady.current = true
  }, [loadingData, user, usuario])

  useEffect(() => {
    if (!draftReady.current || loadingData || !user || !usuario) return
    salvarRascunho(user.id, 'startup-edit', startupValues)
    salvarRascunho(user.id, 'investidor-edit', investidorValues)
  }, [loadingData, user, usuario, startupValues, investidorValues])

  const loadProfileData = async () => {
    if (!usuario || !user) return

    try {
      if (usuario.tipo === 'startup') {
        const data = await carregarPerfilStartup(user.id)
        if (data) {
          setStartupValues({
            nomeResponsavel: data.nomeResponsavel,
            nomeStartup: data.nomeStartup,
            cnpj: mascararCnpj(data.cnpj),
            segmentoId: data.segmentoId,
            segmentosSecundarios: data.segmentosSecundarios,
            descricao: data.descricao,
            videoPitchUrl: data.videoPitchUrl ?? '',
            dataFundacao: data.dataFundacao?.slice(0, 7) ?? '',
            siteUrl: data.siteUrl ?? '',
            linkedinUrl: data.linkedinUrl ?? '',
            localizacao: data.localizacao ?? '',
            cidade: data.cidade ?? '',
            estado: data.estado ?? '',
            latitude: data.latitude,
            longitude: data.longitude,
            imagemPerfil: data.imagemPerfil ?? '',
            valorAlvo: data.rodada?.valorAlvo.toString() ?? '',
            valorCaptado: data.rodada?.valorCaptado.toString() ?? '',
            percentualEquityOferecido: data.rodada?.percentualEquityOferecido.toString() ?? '',
            status: data.rodada?.status ?? 'aberta',
            dataFim: data.rodada?.dataFim ?? '',
            mesReferencia: data.tracao?.mesReferencia ?? mesAtual(),
            receitaMensal: numberToInput(data.tracao?.receitaMensal),
            mrr: numberToInput(data.tracao?.mrr),
            clientesAtivos: numberToInput(data.tracao?.clientesAtivos),
            pilotosAtivos: numberToInput(data.tracao?.pilotosAtivos),
            crescimentoMensal: numberToInput(data.tracao?.crescimentoMensal),
            evidenciaTracao: data.tracao?.evidenciaTracao ?? '',
          })
        }
      } else {
        const data = await carregarPerfilInvestidor(user.id)
        if (data) {
          setInvestidorValues({
            nome: data.nome,
            cpf: mascararCpf(data.cpf),
            tipo: data.tipo,
            biografia: data.biografia,
            segmentos: data.segmentos,
            linkedinUrl: data.linkedinUrl ?? '',
            localizacao: data.localizacao ?? '',
            cidade: data.cidade ?? '',
            estado: data.estado ?? '',
            latitude: data.latitude,
            longitude: data.longitude,
            imagemPerfil: data.imagemPerfil ?? '',
            ticketMin: data.ticketMin,
            ticketMax: data.ticketMax,
          })
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setServerError('Não foi possível carregar seu perfil. Tente novamente.')
    }
  }

  const title = usuario?.tipo === 'startup' ? 'Editar perfil da startup.' : 'Editar perfil de investidor.'

  const selectedSegmentNames = useMemo(
    () => segmentos.filter((segmento) => investidorValues.segmentos.includes(segmento.id)).map((segmento) => segmento.nome),
    [segmentos, investidorValues.segmentos],
  )

  if (!usuario || !user) {
    return (
      <main id="conteudo" className="auth-shell">
        <section className="auth-panel">
          <div className="auth-card">
            <Brand />
            <h1>Perfil base não encontrado.</h1>
            <p>Saia e faça um novo cadastro.</p>
            <button className="button button-outline" type="button" onClick={() => void signOut()}>
              <LogOut size={18} aria-hidden="true" />
              Sair
            </button>
          </div>
        </section>
      </main>
    )
  }

  if (loadingData) {
    return <AppLoader message="Carregando dados do perfil..." />
  }

  const setStartupField = (field: StartupField, value: StartupValues[StartupField]) => {
    setStartupValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
    setServerError('')
  }

  const setInvestidorField = (field: InvestidorField, value: InvestidorValues[InvestidorField]) => {
    setInvestidorValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
    setServerError('')
  }

  const usarMinhaLocalizacao = () => {
    const tipoPerfil = usuario.tipo
    if (!navigator.geolocation) {
      setLocationMessage('Seu navegador não oferece localização automática.')
      return
    }
    setLocationMessage('Solicitando permissão...')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (tipoPerfil === 'startup') {
          setStartupValues((current) => ({ ...current, latitude: coords.latitude, longitude: coords.longitude }))
        } else {
          setInvestidorValues((current) => ({ ...current, latitude: coords.latitude, longitude: coords.longitude }))
        }
        void buscarLocalizacaoPorCoordenadas(coords.latitude, coords.longitude)
          .then((localizacao) => {
            if (tipoPerfil === 'startup') {
              if (localizacao.cidade) setStartupField('cidade', localizacao.cidade)
              if (localizacao.estado) setStartupField('estado', localizacao.estado)
            } else {
              if (localizacao.cidade) setInvestidorField('cidade', localizacao.cidade)
              if (localizacao.estado) setInvestidorField('estado', localizacao.estado)
            }
            setLocationMessage(localizacao.cidade || localizacao.estado ? 'Cidade e estado identificados. Confirme os dados.' : 'Coordenadas capturadas. Informe a cidade e o estado.')
          })
          .catch(() => setLocationMessage('Coordenadas capturadas. Informe a cidade e o estado.'))
      },
      () => setLocationMessage('Não foi possível obter sua localização. Você pode informar a região manualmente.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }

  const applyErrors = (error: z.ZodError) => {
    const next: Record<string, string> = {}
    error.issues.forEach((issue) => {
      const field = String(issue.path[0])
      if (!next[field]) next[field] = issue.message
    })
    setFieldErrors(next)
  }

  const handleStartupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = startupSchema.safeParse(startupValues)
    if (!parsed.success) {
      applyErrors(parsed.error)
      return
    }

    setLoading(true)
    setServerError('')
    try {
      await salvarPerfilStartup({
        usuarioId: user.id,
        nomeResponsavel: parsed.data.nomeResponsavel.trim(),
        nomeStartup: parsed.data.nomeStartup.trim(),
        cnpj: somenteDigitos(parsed.data.cnpj),
        fase: 'Tração',
        segmentoId: parsed.data.segmentoId,
        segmentosSecundarios: parsed.data.segmentosSecundarios.filter((id) => id !== parsed.data.segmentoId),
        descricao: parsed.data.descricao.trim(),
        videoPitchUrl: parsed.data.videoPitchUrl.trim() || null,
        dataFundacao: `${parsed.data.dataFundacao}-01`,
        siteUrl: parsed.data.siteUrl.trim() || null,
        linkedinUrl: parsed.data.linkedinUrl.trim() || null,
        localizacao: parsed.data.localizacao.trim() || null,
        cidade: parsed.data.cidade.trim() || null,
        estado: parsed.data.estado,
        latitude: startupValues.latitude,
        longitude: startupValues.longitude,
        imagemPerfil: startupValues.imagemPerfil || null,
        rodada: {
          valorAlvo: parsed.data.valorAlvo,
          valorCaptado: parsed.data.valorCaptado,
          percentualEquityOferecido: parsed.data.percentualEquityOferecido,
          status: parsed.data.status,
          dataFim: parsed.data.dataFim || null,
        },
        tracao: temSinalTracao(parsed.data) && parsed.data.evidenciaTracao.trim().length >= 20 ? {
          mesReferencia: parsed.data.mesReferencia,
          receitaMensal: nullableNumber(parsed.data.receitaMensal),
          mrr: nullableNumber(parsed.data.mrr),
          clientesAtivos: nullableNumber(parsed.data.clientesAtivos),
          pilotosAtivos: nullableNumber(parsed.data.pilotosAtivos),
          crescimentoMensal: nullableNumber(parsed.data.crescimentoMensal),
          evidenciaTracao: parsed.data.evidenciaTracao.trim(),
        } : null,
      })
      await refresh()
      limparRascunho(user.id, 'startup-edit')
      onSave()
    } catch (error) {
      setServerError(traduzirErroApi(error))
    } finally {
      setLoading(false)
    }
  }

  const handleInvestidorSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = investidorSchema.safeParse(investidorValues)
    if (!parsed.success) {
      applyErrors(parsed.error)
      return
    }

    setLoading(true)
    setServerError('')
    try {
      await salvarPerfilInvestidor({
        usuarioId: user.id,
        nome: parsed.data.nome.trim(),
        cpf: somenteDigitos(parsed.data.cpf),
        tipo: parsed.data.tipo,
        biografia: parsed.data.biografia.trim(),
        segmentos: parsed.data.segmentos,
        linkedinUrl: parsed.data.linkedinUrl.trim() || null,
        localizacao: parsed.data.localizacao.trim() || null,
        cidade: parsed.data.cidade.trim(),
        estado: parsed.data.estado,
        latitude: investidorValues.latitude,
        longitude: investidorValues.longitude,
        imagemPerfil: investidorValues.imagemPerfil || null,
        ticketMin: parsed.data.ticketMin,
        ticketMax: parsed.data.ticketMax,
      })
      await refresh()
      limparRascunho(user.id, 'investidor-edit')
      onSave()
    } catch (error) {
      setServerError(traduzirErroApi(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main id="conteudo" className="auth-shell">
      <section className="auth-panel" aria-labelledby="edit-profile-title">
        <div className="auth-card">
          <div className="auth-top">
            <div className="auth-brand-nav"><DashboardNavMenu /><Brand /></div>
            <div className="onboarding-actions">
              <ThemeToggle />
              <button className="button button-ghost button-compact" type="button" onClick={onCancel}>
                <ArrowLeft size={17} aria-hidden="true" />
                Voltar
              </button>
              <button className="button button-ghost button-compact" type="button" onClick={() => void signOut()}>
                <LogOut size={17} aria-hidden="true" />
                Sair
              </button>
            </div>
          </div>
          <p className="kicker">Editar perfil</p>
          <h1 id="edit-profile-title">{title}</h1>
          <p className="auth-description">Atualize suas informações abaixo.</p>

          {usuario.tipo === 'startup' ? (
            <form className="profile-form" onSubmit={handleStartupSubmit} noValidate>
              <Field label="Nome do responsável" error={fieldErrors.nomeResponsavel}>
                <input value={startupValues.nomeResponsavel} onChange={(event) => setStartupField('nomeResponsavel', event.target.value)} />
              </Field>
              <Field label="Nome da startup" error={fieldErrors.nomeStartup}>
                <input value={startupValues.nomeStartup} onChange={(event) => setStartupField('nomeStartup', event.target.value)} />
              </Field>
              <ProfileImageField tipo="startup" value={startupValues.imagemPerfil} onChange={(value) => setStartupField('imagemPerfil', value)} />
              <Field label="CNPJ" error={fieldErrors.cnpj}>
                <input inputMode="numeric" value={startupValues.cnpj} onChange={(event) => setStartupField('cnpj', mascararCnpj(event.target.value))} />
              </Field>
              <div className="profile-grid">
                <Field label="Segmento" error={fieldErrors.segmentoId}>
                  <div className="segment-select-with-icon">
                    <SegmentIcon nome={segmentos.find((segmento) => segmento.id === startupValues.segmentoId)?.nome ?? ''} />
                    <select value={startupValues.segmentoId} onChange={(event) => setStartupField('segmentoId', Number(event.target.value))}>
                      <option value={0}>Selecione</option>
                      {segmentos.map((segmento) => <option key={segmento.id} value={segmento.id}>{segmento.nome}</option>)}
                    </select>
                  </div>
                </Field>
              </div>
              <fieldset className="segment-selector">
                <legend>Segmentos secundários <span className="optional-label">(opcional)</span></legend>
                <div>
                  {segmentos.filter((segmento) => segmento.id !== startupValues.segmentoId).map((segmento) => {
                    const selected = startupValues.segmentosSecundarios.includes(segmento.id)
                    return (
                      <button
                        className={selected ? 'is-selected' : ''}
                        key={segmento.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setStartupField('segmentosSecundarios', selected
                          ? startupValues.segmentosSecundarios.filter((id) => id !== segmento.id)
                          : [...startupValues.segmentosSecundarios, segmento.id])}
                      >
                        <SegmentIcon nome={segmento.nome} />
                        {segmento.nome}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
              <Field label="Descrição" error={fieldErrors.descricao}>
                <textarea maxLength={500} rows={5} placeholder="Ex.: Plataforma que resolve [problema] para [público-alvo] por meio de [solução]." value={startupValues.descricao} onChange={(event) => setStartupField('descricao', event.target.value)} />
              </Field>
              <Field label={<><span>Vídeo de pitch no YouTube</span> <span className="optional-label">(opcional)</span></>} error={fieldErrors.videoPitchUrl}>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={startupValues.videoPitchUrl}
                  onChange={(event) => setStartupField('videoPitchUrl', event.target.value)}
                />
              </Field>
              <div className="profile-grid">
                <Field label={<><span>Site da startup</span> <span className="optional-label">(opcional)</span></>} error={fieldErrors.siteUrl}>
                  <div className="profile-field-with-icon"><Globe size={17} aria-hidden="true" /><input type="url" placeholder="https://sua-startup.com" value={startupValues.siteUrl} onChange={(event) => setStartupField('siteUrl', event.target.value)} /></div>
                </Field>
                <Field label="Cidade" error={fieldErrors.cidade}>
                  <div className="profile-field-with-icon"><MapPin size={17} aria-hidden="true" /><input placeholder="Cidade" value={startupValues.cidade} onChange={(event) => setStartupField('cidade', event.target.value)} /></div>
                </Field>
              </div>
              <Field label={<><span>LinkedIn</span> <span className="optional-label">(opcional)</span></>} error={fieldErrors.linkedinUrl}>
                <div className="profile-field-with-icon"><img className="linkedin-field-icon" src={linkedinLogo} alt="" /><input type="url" placeholder="https://www.linkedin.com/company/..." value={startupValues.linkedinUrl} onChange={(event) => setStartupField('linkedinUrl', event.target.value)} /></div>
              </Field>
              <Field label="Estado" error={fieldErrors.estado}>
                <select value={startupValues.estado} onChange={(event) => setStartupField('estado', event.target.value)}>
                  <option value="">Selecione</option>
                  {estadosBrasil.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                </select>
              </Field>
              <div className="location-actions">
                <button className="button button-outline button-compact" type="button" onClick={usarMinhaLocalizacao}><LocateFixed size={16} aria-hidden="true" />Usar minha localização</button>
                {locationMessage && <small>{locationMessage}</small>}
              </div>
              <TractionFields values={startupValues} errors={fieldErrors} onChange={setStartupField} />
              <RangeSlider
                label="Valores da rodada"
                min={0}
                max={10000000}
                step={50000}
                valueMin={Number(startupValues.valorCaptado) || 0}
                valueMax={Number(startupValues.valorAlvo) || 0}
                minLabel="Captado"
                maxLabel="Meta"
                onChange={(valorCaptado, valorAlvo) => {
                  setStartupField('valorCaptado', String(valorCaptado))
                  setStartupField('valorAlvo', String(valorAlvo))
                }}
              />
              {fieldErrors.valorAlvo && <small className="form-error">{fieldErrors.valorAlvo}</small>}
              {fieldErrors.valorCaptado && <small className="form-error">{fieldErrors.valorCaptado}</small>}
              <div className="profile-grid">
                <Field label="Equity oferecido (%)" error={fieldErrors.percentualEquityOferecido}>
                  <input
                    type="number"
                    min="0.1"
                    max="49.9"
                    step="0.1"
                    value={startupValues.percentualEquityOferecido}
                    onChange={(event) => {
                      const value = event.target.value
                      setStartupField('percentualEquityOferecido', value === '' ? '' : String(Math.min(Number(value), 49.9)))
                    }}
                  />
                </Field>
                <Field label="Data de fundação" error={fieldErrors.dataFundacao}>
                  <input type="month" max={mesAtual()} value={startupValues.dataFundacao} onChange={(event) => setStartupField('dataFundacao', event.target.value)} />
                </Field>
                <Field label="Encerramento previsto (opcional)">
                  <input type="date" min={new Date().toISOString().slice(0, 10)} value={startupValues.dataFim} onChange={(event) => setStartupField('dataFim', event.target.value)} />
                </Field>
              </div>
              <Field label="Status da rodada" error={fieldErrors.status}>
                <select value={startupValues.status} onChange={(event) => setStartupField('status', event.target.value)}>
                  <option value="">Selecione</option>
                  <option value="aberta">Rodada aberta</option>
                  <option value="encerrada">Rodada encerrada</option>
                </select>
              </Field>
              <SubmitArea loading={loading} error={serverError} />
            </form>
          ) : (
            <form className="profile-form" onSubmit={handleInvestidorSubmit} noValidate>
              <Field label="Nome" error={fieldErrors.nome}>
                <input value={investidorValues.nome} onChange={(event) => setInvestidorField('nome', event.target.value)} />
              </Field>
              <ProfileImageField tipo="investidor" value={investidorValues.imagemPerfil} onChange={(value) => setInvestidorField('imagemPerfil', value)} />
              <Field label="CPF" error={fieldErrors.cpf}>
                <input inputMode="numeric" value={investidorValues.cpf} onChange={(event) => setInvestidorField('cpf', mascararCpf(event.target.value))} />
              </Field>
              <Field label="Tipo de investidor" error={fieldErrors.tipo}>
                <select value={investidorValues.tipo} onChange={(event) => setInvestidorField('tipo', event.target.value)}>
                  {tiposInvestidor.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                </select>
              </Field>
              <Field label="Biografia" error={fieldErrors.biografia}>
                <textarea maxLength={500} rows={5} placeholder="Ex.: Investidor com experiência em [área], interessado em apoiar negócios de [segmentos] com [capital, mentoria ou conexões]." value={investidorValues.biografia} onChange={(event) => setInvestidorField('biografia', event.target.value)} />
              </Field>
              <Field label={<><span>LinkedIn</span> <span className="optional-label">(opcional)</span></>} error={fieldErrors.linkedinUrl}>
                <div className="profile-field-with-icon"><img className="linkedin-field-icon" src={linkedinLogo} alt="" /><input type="url" placeholder="https://www.linkedin.com/in/..." value={investidorValues.linkedinUrl} onChange={(event) => setInvestidorField('linkedinUrl', event.target.value)} /></div>
              </Field>
              <div className="profile-grid">
                <Field label="Cidade" error={fieldErrors.cidade}>
                  <div className="profile-field-with-icon"><MapPin size={17} aria-hidden="true" /><input placeholder="Cidade" value={investidorValues.cidade} onChange={(event) => setInvestidorField('cidade', event.target.value)} /></div>
                </Field>
                <Field label="Estado" error={fieldErrors.estado}>
                  <select value={investidorValues.estado} onChange={(event) => setInvestidorField('estado', event.target.value)}>
                    <option value="">Selecione</option>
                    {estadosBrasil.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                  </select>
                </Field>
              </div>
              <div className="location-actions">
                <button className="button button-outline button-compact" type="button" onClick={usarMinhaLocalizacao}><LocateFixed size={16} aria-hidden="true" />Usar minha localização</button>
                {locationMessage && <small>{locationMessage}</small>}
              </div>
              <fieldset className="segment-selector">
                <legend>Segmentos de interesse</legend>
                <div>
                  {segmentos.map((segmento) => {
                    const selected = investidorValues.segmentos.includes(segmento.id)
                    return (
                      <button
                        className={selected ? 'is-selected' : ''}
                        key={segmento.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          const next = selected
                            ? investidorValues.segmentos.filter((id) => id !== segmento.id)
                            : [...investidorValues.segmentos, segmento.id]
                          setInvestidorField('segmentos', next)
                        }}
                      >
                        <SegmentIcon nome={segmento.nome} />
                        {segmento.nome}
                      </button>
                    )
                  })}
                </div>
                {selectedSegmentNames.length > 0 && <small>Selecionados: {selectedSegmentNames.join(', ')}</small>}
                {fieldErrors.segmentos && <small className="form-error">{fieldErrors.segmentos}</small>}
              </fieldset>
              <div className="investor-ticket-preference">
                <RangeSlider min={0} max={10000000} step={50000} valueMin={investidorValues.ticketMin} valueMax={investidorValues.ticketMax} label="Faixa de investimento" onChange={(ticketMin, ticketMax) => { setInvestidorField('ticketMin', ticketMin); setInvestidorField('ticketMax', ticketMax) }} />
                <small>Preferência privada usada apenas nos filtros e no cálculo de match.</small>
                {fieldErrors.ticketMax && <small className="form-error">{fieldErrors.ticketMax}</small>}
              </div>
              <SubmitArea loading={loading} error={serverError} />
            </form>
          )}
        </div>
      </section>
      <EditProfileAside tipo={usuario.tipo} startupValues={startupValues} investidorValues={investidorValues} segmentos={segmentos} selectedSegmentNames={selectedSegmentNames} />
    </main>
  )
}

function Field({ label, error, children }: { label: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="profile-field">
      <span>{label}</span>
      {children}
      {error && <small className="form-error">{error}</small>}
    </label>
  )
}

function SubmitArea({ loading, error }: { loading: boolean; error: string }) {
  useErrorToast(error)
  return (
    <>
      <button className="button button-navy auth-submit" type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar alterações'}
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </>
  )
}

function EditProfileAside({
  tipo,
  startupValues,
  investidorValues,
  segmentos,
  selectedSegmentNames,
}: {
  tipo: 'startup' | 'investidor'
  startupValues: StartupValues
  investidorValues: InvestidorValues
  segmentos: SegmentoOption[]
  selectedSegmentNames: string[]
}) {
  const isStartup = tipo === 'startup'
  return (
    <aside className="auth-aside" aria-label="Informações sobre o processo">
      <div className="auth-aside-content">
        {isStartup ? (
          <>
            <p>Prévia do perfil</p>
            <h2>Veja como sua startup será apresentada.</h2>
            <StartupProfilePreview
              imagemPerfil={startupValues.imagemPerfil}
              nomeStartup={startupValues.nomeStartup}
              segmentoNome={segmentos.find((segmento) => segmento.id === startupValues.segmentoId)?.nome ?? ''}
              descricao={startupValues.descricao}
              videoPitchUrl={startupValues.videoPitchUrl}
              valorAlvo={startupValues.valorAlvo}
              valorCaptado={startupValues.valorCaptado}
              percentualEquityOferecido={startupValues.percentualEquityOferecido}
              status={startupValues.status}
              dataFundacao={startupValues.dataFundacao}
              receitaMensal={startupValues.receitaMensal}
              mrr={startupValues.mrr}
              clientesAtivos={startupValues.clientesAtivos}
              pilotosAtivos={startupValues.pilotosAtivos}
              crescimentoMensal={startupValues.crescimentoMensal}
            />
          </>
        ) : (
          <>
            <p>Prévia do perfil</p>
            <h2>Veja como você será apresentado.</h2>
            <InvestorProfilePreview
              imagemPerfil={investidorValues.imagemPerfil}
              nome={investidorValues.nome}
              tipo={investidorValues.tipo}
              biografia={investidorValues.biografia}
              segmentos={selectedSegmentNames}
              cidade={investidorValues.cidade}
              estado={investidorValues.estado}
              linkedinUrl={investidorValues.linkedinUrl}
            />
          </>
        )}
      </div>
    </aside>
  )
}

function nullableNumber(value: string | number) {
  return value === '' ? null : Number(value)
}

function numberToInput(value: number | null | undefined) {
  return value === null || value === undefined ? '' : String(value)
}
