interface ApiLikeError {
  status?: number
  message?: string
}

export function traduzirErroApi(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Não foi possível salvar. Tente novamente em instantes.'
  const apiError = error as ApiLikeError
  if (apiError.status === 401 || apiError.status === 403) {
    return 'Sua sessão expirou ou não tem permissão. Entre novamente.'
  }
  if (apiError.status === 409) return apiError.message ?? 'Já existe um cadastro com esses dados.'
  if (apiError.message && apiError.status && apiError.status < 500) return apiError.message
  return 'Não foi possível salvar. Verifique os dados e tente novamente.'
}
