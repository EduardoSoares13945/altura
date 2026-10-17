import { AlertCircle, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

type Toast = { id: number; message: string }
type ToastContextValue = { showError: (message: string) => void }

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), [])
  const showError = useCallback((message: string) => {
    if (!message.trim()) return
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((current) => [...current.slice(-3), { id, message }])
    window.setTimeout(() => dismiss(id), 6000)
  }, [dismiss])
  const value = useMemo(() => ({ showError }), [showError])

  return <ToastContext.Provider value={value}>{children}<div className="toast-region" aria-live="assertive" aria-atomic="true">{toasts.map((toast) => <div className="toast toast-error" role="alert" key={toast.id}><AlertCircle size={19} aria-hidden="true" /><p>{toast.message}</p><button type="button" onClick={() => dismiss(toast.id)} aria-label="Fechar mensagem"><X size={17} /></button></div>)}</div></ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast deve ser usado dentro de ToastProvider.')
  return context
}

export function useErrorToast(message: string) {
  const { showError } = useToast()
  const previous = useRef('')
  useEffect(() => {
    if (message && message !== previous.current) showError(message)
    previous.current = message
  }, [message, showError])
}
