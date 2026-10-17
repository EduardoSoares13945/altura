import { Maximize2, X } from 'lucide-react'
import { useEffect, useRef, useState, type ImgHTMLAttributes, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

interface ZoomableImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
}

export function ZoomableImage({ src, alt, className = '', ...imageProps }: ZoomableImageProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLImageElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      triggerRef.current?.focus()
    }
  }, [open])

  const openFromKeyboard = (event: KeyboardEvent<HTMLImageElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    setOpen(true)
  }

  return <>
    <img
      {...imageProps}
      ref={triggerRef}
      src={src}
      alt={alt}
      className={`zoomable-image ${className}`.trim()}
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-label={alt ? `Ampliar: ${alt}` : 'Ampliar imagem'}
      onClick={() => setOpen(true)}
      onKeyDown={openFromKeyboard}
    />
    {open && createPortal(
      <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="Visualização ampliada da imagem" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
        <button ref={closeRef} className="image-lightbox-close" type="button" onClick={() => setOpen(false)} aria-label="Fechar imagem ampliada"><X size={22} /></button>
        <div className="image-lightbox-content">
          <img src={src} alt={alt} />
          {alt && <p>{alt}</p>}
        </div>
        <div className="image-lightbox-hint" aria-hidden="true"><Maximize2 size={15} />Imagem ampliada</div>
      </div>,
      document.body,
    )}
  </>
}
