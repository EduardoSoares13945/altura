const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp'])
const TAMANHO_MAXIMO_ARQUIVO = 5 * 1024 * 1024
const LADO_IMAGEM = 512
const TAMANHO_MAXIMO_DATA_URL = 480_000

export interface RecorteImagemPerfil {
  zoom: number
  deslocamentoX: number
  deslocamentoY: number
  tamanhoArea: number
}

export function validarArquivoImagemPerfil(arquivo: File) {
  if (!TIPOS_PERMITIDOS.has(arquivo.type)) {
    throw new Error('Escolha uma imagem JPG, PNG ou WebP.')
  }
  if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
    throw new Error('A imagem deve ter no máximo 5 MB.')
  }
}

export async function prepararImagemPerfil(arquivo: File, recorte: RecorteImagemPerfil): Promise<string> {
  validarArquivoImagemPerfil(arquivo)

  const imagem = await carregarImagem(arquivo)
  const canvas = document.createElement('canvas')
  canvas.width = LADO_IMAGEM
  canvas.height = LADO_IMAGEM
  const contexto = canvas.getContext('2d')
  if (!contexto) throw new Error('Não foi possível processar a imagem neste navegador.')

  const escalaBase = Math.max(
    recorte.tamanhoArea / imagem.naturalWidth,
    recorte.tamanhoArea / imagem.naturalHeight,
  )
  const escalaExibicao = escalaBase * recorte.zoom
  const larguraExibicao = imagem.naturalWidth * escalaExibicao
  const alturaExibicao = imagem.naturalHeight * escalaExibicao
  const esquerda = (recorte.tamanhoArea - larguraExibicao) / 2 + recorte.deslocamentoX
  const topo = (recorte.tamanhoArea - alturaExibicao) / 2 + recorte.deslocamentoY
  const origemX = Math.max(0, -esquerda / escalaExibicao)
  const origemY = Math.max(0, -topo / escalaExibicao)
  const ladoOrigem = recorte.tamanhoArea / escalaExibicao

  contexto.drawImage(
    imagem,
    origemX,
    origemY,
    Math.min(ladoOrigem, imagem.naturalWidth - origemX),
    Math.min(ladoOrigem, imagem.naturalHeight - origemY),
    0,
    0,
    LADO_IMAGEM,
    LADO_IMAGEM,
  )

  for (const qualidade of [0.86, 0.74, 0.62]) {
    const blob = await canvasParaBlob(canvas, qualidade)
    const dataUrl = await blobParaDataUrl(blob)
    if (dataUrl.length <= TAMANHO_MAXIMO_DATA_URL) return dataUrl
  }

  throw new Error('Não foi possível reduzir a imagem. Escolha um arquivo mais simples ou menor.')
}

function carregarImagem(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo)
    const imagem = new Image()
    imagem.onload = () => {
      URL.revokeObjectURL(url)
      resolve(imagem)
    }
    imagem.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('O arquivo selecionado não pôde ser lido como imagem.'))
    }
    imagem.src = url
  })
}

function canvasParaBlob(canvas: HTMLCanvasElement, qualidade: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Não foi possível processar a imagem.')),
      'image/webp',
      qualidade,
    )
  })
}

function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(String(leitor.result))
    leitor.onerror = () => reject(new Error('Não foi possível ler a imagem processada.'))
    leitor.readAsDataURL(blob)
  })
}
