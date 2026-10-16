export function mesAtual() {
  return formatarMes(new Date())
}

export function mesReferenciaMinima() {
  const hoje = new Date()
  return `${hoje.getFullYear() - 1}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

export function formatarMesParaLeitura(value: string) {
  const [ano, mes] = value.split('-').map(Number)
  if (!ano || !mes) return value
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(ano, mes - 1, 1))
}

function formatarMes(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
