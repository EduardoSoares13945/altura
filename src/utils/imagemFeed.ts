const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp'])
const TAMANHO_MAXIMO_ORIGINAL = 5 * 1024 * 1024
const MAIOR_LADO = 1600
const ALVO_COMPRESSAO = 500_000

export interface ImagemFeedProcessada {
  arquivo: File
  largura: number
  altura: number
  tamanhoOriginal: number
}

export async function comprimirImagemFeed(arquivo: File): Promise<ImagemFeedProcessada> {
  if (!TIPOS_PERMITIDOS.has(arquivo.type)) {
    throw new Error('Escolha uma imagem JPG, PNG ou WebP.')
  }
  if (arquivo.size > TAMANHO_MAXIMO_ORIGINAL) {
    throw new Error('A imagem original deve ter no máximo 5 MB.')
  }

  const imagem = await carregarImagem(arquivo)
  const escala = Math.min(1, MAIOR_LADO / Math.max(imagem.naturalWidth, imagem.naturalHeight))
  const largura = Math.max(1, Math.round(imagem.naturalWidth * escala))
  const altura = Math.max(1, Math.round(imagem.naturalHeight * escala))
  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  const contexto = canvas.getContext('2d')
  if (!contexto) throw new Error('Não foi possível processar a imagem neste navegador.')

  contexto.imageSmoothingEnabled = true
  contexto.imageSmoothingQuality = 'high'
  contexto.drawImage(imagem, 0, 0, largura, altura)

  let resultado: Blob | null = null
  for (const qualidade of [0.86, 0.78, 0.7, 0.62, 0.54]) {
    resultado = await canvasParaBlob(canvas, qualidade)
    if (resultado.size <= ALVO_COMPRESSAO) break
  }
  if (!resultado || resultado.size > 1_000_000) {
    throw new Error('Não foi possível reduzir a imagem para menos de 1 MB. Escolha outra imagem.')
  }

  return {
    arquivo: new File([resultado], nomeWebp(arquivo.name), { type: 'image/webp' }),
    largura,
    altura,
    tamanhoOriginal: arquivo.size,
  }
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
      (blob) => blob ? resolve(blob) : reject(new Error('Não foi possível comprimir a imagem.')),
      'image/webp',
      qualidade,
    )
  })
}

function nomeWebp(nomeOriginal: string) {
  return `${nomeOriginal.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60) || 'publicacao'}.webp`
}
