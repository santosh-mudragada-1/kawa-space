import { useScene, gsap, revealLines, revealSoft, ScrollTrigger } from '../../lib/useReveal'

const LAYERS = [
  { i: 'RF', n: 'Radio frequency', d: 'What is transmitting, on what band, from exactly where — including everything that is not on any register.', m: '0.5 – 18 GHz · IQ · TDOA', x: -5 },
  { i: 'MSI', n: 'Multispectral', d: 'What the place looks like across the visible and infrared bands: material, condition, activity, change since the last pass.', m: '10 band · 10 m GSD', x: 4 },
  { i: 'SAR', n: 'Synthetic aperture', d: 'Structure and movement through cloud and darkness, at the moment the RF event was recorded.', m: '1 m spotlight · all-weather', x: -3 },
]

export default function Fusion() {
  const root = useScene<HTMLElement>(({ root, reduced }) => {
    if (reduced) return
    revealLines(root, '.fuse__h .line-inner')
    revealSoft(root.querySelectorAll('[data-soft]'), root, 0.15)

    const rows = gsap.utils.toArray<HTMLElement>('.layer', root)
    // the three reads arrive misregistered and settle into agreement
    rows.forEach((r, i) => {
      gsap.fromTo(r,
        { xPercent: LAYERS[i].x, opacity: 0.32 },
        {
          xPercent: 0, opacity: 1, ease: 'none',
          scrollTrigger: { trigger: root.querySelector('.layers'), start: 'top 82%', end: 'bottom 62%', scrub: 0.7 },
        })
    })
    ScrollTrigger.create({
      trigger: root.querySelector('.layers'), start: 'bottom 68%',
      onEnter: () => gsap.fromTo('.fuse__out', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out' }),
      once: true,
    })
  })

  return (
    <section className="act section fuse scrim scrim--veil" data-act="fusion" id="fusion" ref={root} aria-labelledby="fuse-h">
      <div className="grid12">
        <p className="eyebrow mono" style={{ gridColumn: '1 / -1' }} data-soft>
          <b>07</b><span>Data fusion</span><span>Three sensors · one place</span>
        </p>

        <h2 className="fuse__h" id="fuse-h">
          <span className="line-wrap"><span className="line-inner">One layer reports.</span></span>
          <span className="line-wrap"><span className="line-inner">Three layers agree.</span></span>
        </h2>

        <p className="lead fuse__lead" data-soft>
          A single emission is a fact. Registered against imagery and radar of the same square
          kilometre at the same minute, it becomes a finding you can act on — and the ambiguity
          that survives all three is the part worth arguing about.
        </p>

        <div className="layers">
          {LAYERS.map((l) => (
            <div className="layer" key={l.i}>
              <span className="layer__i">{l.i}</span>
              <span className="layer__n">{l.n}</span>
              <span className="layer__d">{l.d}</span>
              <span className="layer__m">{l.m}</span>
            </div>
          ))}
        </div>

        <div className="fuse__out" style={{ opacity: 0 }}>
          <span>Registered</span>
          <span><b>41</b> emitters</span>
          <span><b>3</b> sources</span>
          <span>Confidence <b>0.94</b></span>
          <span>Delivered as JSON via API or Kawa Studio</span>
        </div>
      </div>
    </section>
  )
}
