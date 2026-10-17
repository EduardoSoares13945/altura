import { ArrowRight } from 'lucide-react'
import { hero } from '../data/landing'
import heroImage from '../../assets/hero.png'
import investorHeroImage from '../../assets/hero2.png'

export function Hero() {
  const titleHighlight = 'mais alto'
  const titlePrefix = hero.title.slice(0, -titleHighlight.length)

  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <div className="container hero-grid">
        <div className="hero-copy">
          <h1 id="hero-title">{titlePrefix}<span className="hero-title-highlight">{titleHighlight}</span></h1>
          <p className="hero-description">{hero.description}</p>
          <div className="hero-actions">
            {hero.actions.map((action) => (
              <div className="hero-action" key={action.type}>
                <a className={`button button-${action.type === 'startup' ? 'navy' : 'teal'}`} href={action.href}>
                  {action.label}<ArrowRight size={18} aria-hidden="true" />
                </a>
                <span>{action.helper}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-visual" aria-label="Prévia visual dos perfis da plataforma Altura">
          <img
            className="hero-startup-image"
            src={heroImage}
            alt="Prévia de uma rodada de startup na plataforma Altura"
            loading="eager"
            fetchPriority="high"
          />
          <img
            className="hero-investor-image"
            src={investorHeroImage}
            alt=""
            aria-hidden="true"
            loading="eager"
            fetchPriority="auto"
          />
        </div>
      </div>
    </section>
  )
}
