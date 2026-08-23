import { useRef } from 'react'
import { useScene, gsap } from '../../lib/useReveal'
import { scrollTo } from '../../lib/scroll'

export default function Hero({ ready }: { ready: boolean }) {
  const done = useRef(false)

  const root = useScene<HTMLElement>(({ root, reduced }) => {
    const lines = root.querySelectorAll<HTMLElement>('.line-inner')
    const fill = root.querySelector<HTMLElement>('.fillword__fill')
    const soft = root.querySelectorAll<HTMLElement>('[data-soft]')

    if (reduced) {
      gsap.set([lines, soft], { clearProps: 'all' })
      gsap.set(fill, { clipPath: 'inset(0% 0 0 0)' })
      return
    }

    gsap.set(lines, { yPercent: 118 })
    gsap.set(soft, { opacity: 0, y: 16 })
    gsap.set(fill, { clipPath: 'inset(100% 0 0 0)' })

    if (ready && !done.current) {
      done.current = true
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.to(lines, { yPercent: 0, duration: 1.35, stagger: 0.085 })
        .to(soft, { opacity: 1, y: 0, duration: 1, stagger: 0.07 }, '-=0.85')
        // the word resolves: outline becomes solid. Unseen becomes seen.
        .to(fill, { clipPath: 'inset(0% 0 0 0)', duration: 1.5, ease: 'expo.inOut' }, '-=0.55')
    }

    // hero yields to the next act rather than cutting to it
    gsap.to(root.querySelector('.hero__inner'), {
      yPercent: -26, opacity: 0, filter: 'blur(6px)', ease: 'none',
      scrollTrigger: { trigger: root, start: 'top top', end: 'bottom 20%', scrub: 0.6 },
    })
  }, [ready])

  return (
    <section className="act hero" data-act="hero" id="top" ref={root} aria-labelledby="hero-h">
      <div className="hero__hud hero__hud--tr" aria-hidden="true">
        <div>Collection · active</div>
        <div>Band · 0.5 — 18.0 GHz</div>
        <div>Revisit · near-real-time</div>
      </div>

      <div className="hero__inner">
        <p className="hero__eyebrow mono" data-soft>
          <span className="sig">◆</span> Kawa Space — the cognitive infrastructure for spectrum intelligence
        </p>

        <h1 className="hero__h" id="hero-h">
          <span className="line-wrap"><span className="line-inner">Nothing</span></span>
          <span className="line-wrap"><span className="line-inner">transmits</span></span>
          <span className="line-wrap">
            <span className="line-inner">
              <span className="fillword">
                <span className="fillword__ghost" aria-hidden="true">unseen</span>
                <span className="fillword__fill" aria-hidden="true">unseen</span>
                <span className="sr-only">unseen</span>
              </span>
            </span>
          </span>
        </h1>

        <div className="hero__foot">
          <p className="lead" data-soft>
            Eighteen satellites, continuously collecting radio frequency across the spectrum.
            Kawa turns those signals into located, correlated intelligence — across land, sea,
            air and space, in seconds rather than days.
          </p>
          <span />
          <div className="btn-row" data-soft>
            <a className="btn btn--primary" href="#processing" onClick={(e) => { e.preventDefault(); scrollTo('#processing', -20) }}>
              <span className="btn__dot" /> Explore the system
            </a>
            <a className="btn" href="#contact" onClick={(e) => { e.preventDefault(); scrollTo('#contact', -20) }}>
              Talk to the team
            </a>
          </div>
        </div>

        <div className="hero__scroll mono" data-soft aria-hidden="true">
          <i /> <span>Scroll — descend through the spectrum</span>
        </div>
      </div>
    </section>
  )
}
