import { useScene, gsap } from '../../lib/useReveal'

const DOMS = [
  {
    w: 'Sea',
    c: 'Twelve thousand vessels are transmitting across the Indian Ocean at any moment. The ones that matter are the ones that went quiet.',
    m: ['S & X full-band scan', 'AIS correlation', 'Dark-vessel geolocation'],
  },
  {
    w: 'Land',
    c: 'Infrastructure has a signature. Emitters do not move the way declarations say they move, and the difference is the intelligence.',
    m: ['L-band handsets', 'Telecom deployment', 'Fixed & mobile emitters'],
  },
  {
    w: 'Air',
    c: 'Between the surface and the constellation everything is in motion, and almost all of it is talking to something else.',
    m: ['Airborne emitters', 'Comms links', 'Propagation modelling'],
  },
  {
    w: 'Space',
    c: 'Where the collection actually happens. Eighteen instruments, tuneable on demand, revisiting your area continuously.',
    m: ['18 spacecraft', '0.5 – 18 GHz', 'Near-real-time revisit'],
  },
]

export default function Domains() {
  const root = useScene<HTMLElement>(({ root, reduced }) => {
    const words = gsap.utils.toArray<HTMLElement>('.dom__word', root)
    const copies = gsap.utils.toArray<HTMLElement>('.dom__copy > div', root)
    const idx = gsap.utils.toArray<HTMLElement>('.dom__idx span', root)

    if (reduced) {
      gsap.set(words.slice(1), { position: 'relative' })
      gsap.set([words, copies], { opacity: 1, yPercent: 0 })
      gsap.set(copies.slice(1), { position: 'relative' })
      idx.forEach((s) => s.setAttribute('data-on', '1'))
      return
    }

    gsap.set(words.slice(1), { yPercent: 108 })
    gsap.set(copies.slice(1), { opacity: 0, y: 22 })

    const tl = gsap.timeline({
      defaults: { ease: 'expo.inOut' },
      scrollTrigger: {
        trigger: root, start: 'top top', end: '+=420%',
        pin: '.dom__pin', scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress
          const a = p < 0.30 ? 0 : p < 0.60 ? 1 : p < 0.90 ? 2 : 3
          idx.forEach((s, i) => s.setAttribute('data-on', i === a ? '1' : '0'))
        },
      },
    })

    // each domain lifts the previous one out of the same mask — a traverse, not a swap
    DOMS.forEach((_, i) => {
      if (i === 0) return
      tl.to(words[i - 1], { yPercent: -108, duration: 0.5 }, i - 0.25)
        .to(words[i], { yPercent: 0, duration: 0.5 }, i - 0.25)
        .to(copies[i - 1], { opacity: 0, y: -18, duration: 0.28, ease: 'power2.in' }, i - 0.3)
        .to(copies[i], { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, i - 0.05)
    })
  })

  return (
    <section className="act dom" data-act="domains" id="domains" ref={root} aria-labelledby="dom-h">
      <h2 className="sr-only" id="dom-h">Cross-domain intelligence — sea, land, air and space</h2>
      <div className="dom__pin scrim scrim--base">
        <div className="dom__top mono">
          <span><b className="sig" style={{ fontWeight: 400 }}>04</b>&nbsp;&nbsp;Cross-domain</span>
          <span>One collection layer · four operating pictures</span>
        </div>

        <div className="dom__stack">
          <span className="dom__mask">
            {DOMS.map((d) => (
              <h3 className="dom__word" key={d.w}>{d.w}</h3>
            ))}
          </span>
        </div>

        <div className="dom__copy">
          {DOMS.map((d) => (
            <div key={d.w}>
              <p className="lead">{d.c}</p>
              <p className="dom__meta mono">{d.m.map((x) => <span key={x}>{x}</span>)}</p>
            </div>
          ))}
        </div>

        <div className="dom__idx" aria-hidden="true">
          {DOMS.map((d, i) => <span key={d.w} data-on={i === 0 ? '1' : '0'}>{d.w}</span>)}
        </div>
      </div>
    </section>
  )
}
