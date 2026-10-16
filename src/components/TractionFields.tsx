import { BarChart3, CalendarDays, TrendingUp, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { z } from 'zod'
import { formatarMesParaLeitura, mesAtual, mesReferenciaMinima } from '../utils/datas'

export interface StartupTractionValues {
  mesReferencia: string
  receitaMensal: string
  mrr: string
  clientesAtivos: string
  pilotosAtivos: string
  crescimentoMensal: string
  evidenciaTracao: string
}

const optionalNonNegativeNumber = z.union([
  z.literal(''),
  z.coerce.number().min(0, 'Use um valor maior ou igual a zero.'),
])

export const startupTractionSchema = z.object({
  mesReferencia: z.string()
    .regex(/^\d{4}-\d{2}$/, 'Informe o mês de referência.')
    .refine((value) => value >= mesReferenciaMinima(), 'Use um mês de referência dos últimos 12 meses.')
    .refine((value) => value <= mesAtual(), 'O mês de referência não pode ser futuro.'),
  receitaMensal: optionalNonNegativeNumber,
  mrr: optionalNonNegativeNumber,
  clientesAtivos: z.union([
    z.literal(''),
    z.coerce.number().int('Informe um número inteiro.').min(0, 'Use um valor maior ou igual a zero.'),
  ]),
  pilotosAtivos: z.union([
    z.literal(''),
    z.coerce.number().int('Informe um número inteiro.').min(0, 'Use um valor maior ou igual a zero.'),
  ]),
  crescimentoMensal: z.union([
    z.literal(''),
    z.coerce.number().min(-100, 'O crescimento não pode ser menor que -100%.').max(1000, 'Revise o crescimento informado.'),
  ]),
  evidenciaTracao: z.string().trim()
    .max(500, 'Use no máximo 500 caracteres.'),
})

export function temSinalTracao(values: Record<'receitaMensal' | 'mrr' | 'clientesAtivos' | 'pilotosAtivos', string | number>) {
  return [values.receitaMensal, values.mrr, values.clientesAtivos, values.pilotosAtivos]
    .some((value) => value !== '' && Number(value) > 0)
}

export function criarTracaoInicial(): StartupTractionValues {
  return {
    mesReferencia: mesAtual(),
    receitaMensal: '',
    mrr: '',
    clientesAtivos: '',
    pilotosAtivos: '',
    crescimentoMensal: '',
    evidenciaTracao: '',
  }
}

interface TractionFieldsProps {
  values: StartupTractionValues
  errors: Record<string, string>
  onChange: <Field extends keyof StartupTractionValues>(field: Field, value: StartupTractionValues[Field]) => void
}

export function TractionFields({ values, errors, onChange }: TractionFieldsProps) {
  return (
    <section className="traction-form-section" aria-labelledby="traction-section-title">
      <div className="traction-form-heading">
        <span className="traction-form-icon" aria-hidden="true"><TrendingUp size={20} /></span>
        <div>
          <p className="kicker">Sinais de tração</p>
          <h2 id="traction-section-title">Mostre o que já foi validado no mercado.</h2>
          <p>Use dados do mês mais recente. Ao menos um indicador e uma evidência são obrigatórios.</p>
        </div>
      </div>

      <label className="profile-field">
        <span>Mês de referência</span>
        <div className="profile-field-with-icon">
          <CalendarDays size={17} aria-hidden="true" />
          <input type="month" min={mesReferenciaMinima()} max={mesAtual()} value={values.mesReferencia} onChange={(event) => onChange('mesReferencia', event.target.value)} />
        </div>
        <small className="profile-field-hint">Período aceito: {formatarMesParaLeitura(mesReferenciaMinima())} a {formatarMesParaLeitura(mesAtual())}.</small>
        {errors.mesReferencia && <small className="form-error">{errors.mesReferencia}</small>}
      </label>

      <div className="traction-fields-grid">
        <TractionNumberField
          label="Receita no mês (R$)"
          icon={<BarChart3 size={17} aria-hidden="true" />}
          value={values.receitaMensal}
          error={errors.receitaMensal}
          onChange={(value) => onChange('receitaMensal', value)}
        />
        <TractionNumberField
          label="MRR (R$)"
          icon={<TrendingUp size={17} aria-hidden="true" />}
          value={values.mrr}
          error={errors.mrr}
          onChange={(value) => onChange('mrr', value)}
        />
        <TractionNumberField
          label="Clientes ativos"
          icon={<Users size={17} aria-hidden="true" />}
          value={values.clientesAtivos}
          error={errors.clientesAtivos}
          step="1"
          onChange={(value) => onChange('clientesAtivos', value)}
        />
        <TractionNumberField
          label="Pilotos ativos"
          icon={<Users size={17} aria-hidden="true" />}
          value={values.pilotosAtivos}
          error={errors.pilotosAtivos}
          step="1"
          onChange={(value) => onChange('pilotosAtivos', value)}
        />
      </div>

      <label className="profile-field">
        <span>Crescimento no mês (%) <span className="optional-label">(opcional)</span></span>
        <input
          type="number"
          min="-100"
          max="1000"
          step="0.1"
          placeholder="Ex.: 12,5"
          value={values.crescimentoMensal}
          onChange={(event) => onChange('crescimentoMensal', event.target.value)}
        />
        {errors.crescimentoMensal && <small className="form-error">{errors.crescimentoMensal}</small>}
      </label>

      <label className="profile-field">
        <span>Principal evidência de tração</span>
        <textarea
          maxLength={500}
          rows={4}
          placeholder="Ex.: Crescemos de 40 para 68 clientes pagantes nos últimos três meses e renovamos 85% dos contratos."
          value={values.evidenciaTracao}
          onChange={(event) => onChange('evidenciaTracao', event.target.value)}
        />
        {errors.evidenciaTracao && <small className="form-error">{errors.evidenciaTracao}</small>}
      </label>
    </section>
  )
}

function TractionNumberField({
  label,
  icon,
  value,
  error,
  step = '0.01',
  onChange,
}: {
  label: string
  icon: ReactNode
  value: string
  error?: string
  step?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="profile-field">
      <span>{label}</span>
      <div className="profile-field-with-icon">
        {icon}
        <input type="number" min="0" step={step} placeholder="0" value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
      {error && <small className="form-error">{error}</small>}
    </label>
  )
}

