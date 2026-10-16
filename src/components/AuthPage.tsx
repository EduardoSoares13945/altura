import { ArrowLeft, ArrowRight, BadgeDollarSign, Building2, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { signIn, signUp } from '../auth/authApi'
import { auth, type TipoUsuario } from '../data/landing'
import { Brand } from './Brand'
import { ThemeToggle } from './ThemeToggle'

type AuthMode = 'login' | 'register'

interface AuthPageProps {
  mode: AuthMode
  initialRole?: TipoUsuario
}

const fieldIcons = {
  email: Mail,
  password: Lock,
  confirmPassword: Lock,
} as const

type AuthField = 'email' | 'password' | 'confirmPassword'

const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .regex(/[A-Za-zÀ-ÿ]/, 'A senha deve ter pelo menos uma letra.')
  .regex(/\d/, 'A senha deve ter pelo menos um número.')

const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})

const registerSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirme sua senha.'),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'As senhas não conferem.',
})

const initialValues: Record<AuthField, string> = {
  email: '',
  password: '',
  confirmPassword: '',
}

const testAccounts: Record<TipoUsuario, { email: string; password: string; description: string }> = {
  startup: {
    email: 'startup.teste@altura.com',
    password: 'Altura@123',
    description: 'Perfil completo com tração e rodada aberta.',
  },
  investidor: {
    email: 'investidor.teste@altura.com',
    password: 'Altura@123',
    description: 'Perfil pronto para explorar startups.',
  },
}

export function AuthPage({ mode, initialRole = 'startup' }: AuthPageProps) {
  const [role, setRole] = useState<TipoUsuario>(initialRole)
  const [selectedTestAccount, setSelectedTestAccount] = useState<TipoUsuario | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})
  const [values, setValues] = useState<Record<AuthField, string>>(initialValues)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AuthField, string>>>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const copy = mode === 'login' ? auth.login : auth.register
  const isRegister = mode === 'register'

  useEffect(() => {
    setRole(initialRole)
  }, [initialRole])

  const submitLabel = isRegister
    ? `${auth.register.submitLabel} como ${role === 'startup' ? 'startup' : 'investidor'}`
    : auth.login.submitLabel

  const updateField = (field: AuthField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setSelectedTestAccount(null)
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setServerError('')
  }

  const useTestAccount = (type: TipoUsuario) => {
    const account = testAccounts[type]
    setSelectedTestAccount(type)
    setValues({
      email: account.email,
      password: account.password,
      confirmPassword: '',
    })
    setFieldErrors({})
    setServerError('')
  }

  const applyZodErrors = (error: z.ZodError) => {
    const next: Partial<Record<AuthField, string>> = {}
    error.issues.forEach((issue) => {
      const field = issue.path[0]
      if (field === 'email' || field === 'password' || field === 'confirmPassword') {
        next[field] = issue.message
      }
    })
    setFieldErrors(next)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setServerError('')
    setFieldErrors({})

    const parsed = isRegister ? registerSchema.safeParse(values) : loginSchema.safeParse(values)
    if (!parsed.success) {
      applyZodErrors(parsed.error)
      return
    }

    setLoading(true)
    try {
      const result = isRegister
        ? await signUp({ email: values.email.trim(), password: values.password, tipo: role })
        : await signIn(values.email.trim(), values.password)

      if (!result.ok) {
        setServerError(result.message)
        return
      }

    } finally {
      setLoading(false)
    }
  }

  return (
    <main id="conteudo" className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-card">
          <div className="auth-top">
            <Brand />
            <div className="auth-top-actions">
              <ThemeToggle />
              <a className="auth-back" href="/">
                <ArrowLeft size={17} aria-hidden="true" />
                {auth.backHome}
              </a>
            </div>
          </div>

          <p className="kicker">{copy.eyebrow}</p>
          <h1 id="auth-title">{copy.title}</h1>
          <p className="auth-description">{copy.description}</p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {isRegister && (
              <fieldset className="role-fieldset">
                <legend>{auth.register.roleLabel}</legend>
                <div className="role-options">
                  {auth.register.roles.map((item) => {
                    const selected = role === item.type
                    const Icon = item.type === 'startup' ? Building2 : BadgeDollarSign

                    return (
                      <button
                        className={`role-option ${selected ? 'is-selected' : ''}`}
                        type="button"
                        aria-pressed={selected}
                        key={item.type}
                        onClick={() => setRole(item.type)}
                      >
                        <Icon size={19} aria-hidden="true" />
                        <span>
                          <strong>{item.label}</strong>
                          <small>{item.description}</small>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )}

            {!isRegister && (
              <section className="test-account-panel" aria-labelledby="test-account-title">
                <div className="test-account-heading">
                  <strong id="test-account-title">Acesso de teste</strong>
                  <small>Escolha um perfil para preencher o login.</small>
                </div>

                <div className="test-account-options">
                  {(['startup', 'investidor'] as const).map((type) => {
                    const selected = selectedTestAccount === type
                    const account = testAccounts[type]
                    const Icon = type === 'startup' ? Building2 : BadgeDollarSign

                    return (
                      <button
                        className={`test-account-option ${selected ? 'is-selected' : ''}`}
                        type="button"
                        aria-pressed={selected}
                        disabled={loading}
                        key={type}
                        onClick={() => useTestAccount(type)}
                      >
                        <Icon size={18} aria-hidden="true" />
                        <span>
                          <strong>{type === 'startup' ? 'Startup de teste' : 'Investidor de teste'}</strong>
                          <small>{account.description}</small>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            <div className="auth-fields">
              {copy.fields.map((field) => {
                const Icon = fieldIcons[field.id as keyof typeof fieldIcons]
                const isPassword = field.type === 'password'
                const passwordVisible = visiblePasswords[field.id] ?? false

                return (
                  <label className="auth-field" htmlFor={`auth-${field.id}`} key={field.id}>
                    <span>{field.label}</span>
                    <span className="auth-input-wrap">
                      <Icon size={18} aria-hidden="true" />
                      <input
                        id={`auth-${field.id}`}
                        type={isPassword && passwordVisible ? 'text' : field.type}
                        placeholder={field.placeholder}
                        autoComplete={field.autoComplete}
                        value={values[field.id as AuthField]}
                        onChange={(event) => updateField(field.id as AuthField, event.target.value)}
                        aria-invalid={fieldErrors[field.id as AuthField] ? 'true' : 'false'}
                        aria-describedby={fieldErrors[field.id as AuthField] ? `auth-${field.id}-error` : undefined}
                      />
                      {isPassword && (
                        <button
                          className="password-toggle"
                          type="button"
                          aria-label={passwordVisible ? `Ocultar ${field.label.toLowerCase()}` : `Ver ${field.label.toLowerCase()}`}
                          aria-pressed={passwordVisible}
                          onClick={() => setVisiblePasswords((current) => ({ ...current, [field.id]: !passwordVisible }))}
                        >
                          {passwordVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                        </button>
                      )}
                    </span>
                    {fieldErrors[field.id as AuthField] && (
                      <small className="form-error" id={`auth-${field.id}-error`}>{fieldErrors[field.id as AuthField]}</small>
                    )}
                  </label>
                )
              })}
            </div>

            {serverError && <p className="form-alert" role="alert">{serverError}</p>}

            <button className="button button-navy auth-submit" type="submit" disabled={loading}>
              {loading ? 'Aguarde...' : submitLabel}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>

          <p className="auth-switch">
            {copy.alternateLabel}{' '}
            <a href={copy.alternateHref}>{copy.alternateCta}</a>
          </p>
        </div>
      </section>

      <AuthAside />
    </main>
  )
}

function AuthAside() {
  return (
    <aside className="auth-aside" aria-label="Resumo da proposta Altura">
      <div className="auth-aside-content">
        <p>{auth.sidePanel.eyebrow}</p>
        <h2>{auth.sidePanel.title}</h2>
        <span>{auth.sidePanel.description}</span>
        <div className="auth-stats">
          {auth.sidePanel.stats.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <small>{stat.label}</small>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
