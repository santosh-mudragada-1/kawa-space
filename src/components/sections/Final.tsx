import { useScene, gsap } from '../../lib/useReveal'
import { scrollTo } from '../../lib/scroll'

export default function Final() {
  const root = useScene<HTMLElement>(({ root, reduced }) => {
    const lines = root.querySelectorAll<HTMLElement>('.line-inner')
    if (reduced) return

    gsap.set(lines, { yPercent: 118 })
    const tl = gsap.timeline({
      scrollTrigger: { trigger: root, start: 'top 62%', once: true },
      defaults: { ease: 'expo.out' },
    })
    // one detection, then the sentence it earns
    tl.from('.ping__core', { scale: 0, transformOrigin: 'center', duration: 0.55, ease: 'back.out(2.6)' })
      .from('.ping__ring', { scale: 0, opacity: 0, transformOrigin: 'center', duration: 0.9, stagger: 0.09 }, '-=0.35')
      .to(lines, { yPercent: 0, duration: 1.15, stagger: 0.075 }, '-=0.72')
      .from(root.querySelectorAll('[data-soft]'), { opacity: 0, y: 18, duration: 0.85, stagger: 0.06 }, '-=0.75')
  })

  return (
    <section className="act fin scrim scrim--left" data-act="final" id="contact" ref={root} aria-labelledby="fin-h">
      <div className="fin__ping" aria-hidden="true">
        <svg width="86" height="86" viewBox="0 0 86 86" fill="none">
          <circle className="ping__ring" cx="43" cy="43" r="42" stroke="#FF6A1A" strokeWidth=".8" opacity=".16" />
          <circle className="ping__ring" cx="43" cy="43" r="27" stroke="#FF6A1A" strokeWidth=".9" opacity=".3" />
          <circle className="ping__ring" cx="43" cy="43" r="14" stroke="#FF6A1A" strokeWidth="1" opacity=".55" />
          <circle className="ping__core" cx="43" cy="43" r="3.4" fill="#FF6A1A" />
        </svg>
      </div>

      <h2 className="fin__h" id="fin-h">
        <span className="line-wrap"><span className="line-inner">The world is full</span></span>
        <span className="line-wrap"><span className="line-inner">of signals.</span></span>
        <span className="line-wrap"><span className="line-inner"><em>We make them</em></span></span>
        <span className="line-wrap"><span className="line-inner"><em>intelligible.</em></span></span>
      </h2>

      <div className="fin__row">
        <a className="btn btn--primary" href="#top" data-soft onClick={(e) => { e.preventDefault(); scrollTo('#top') }}>
          <span className="btn__dot" /> Explore Kawa Space
        </a>
        <a className="btn" href="mailto:missions@kawa.space" data-soft>Talk to the team</a>
        <span className="mono faint" data-soft>missions@kawa.space</span>
      </div>
    </section>
  )
}
