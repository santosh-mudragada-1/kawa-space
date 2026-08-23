import { useEffect, useRef } from 'react'
import { useScene, gsap, revealLines, revealSoft } from '../../lib/useReveal'
import { S } from '../../gl/state'

const PLANES = ['A', 'B', 'C']
const BANDS = ['L', 'S', 'C', 'X', 'Ku']

/** deterministic register — the same spacecraft every visit */
const SATS = Array.from({ length: 18 }, (_, i) => ({
  id: `KAWA-${String(i + 1).padStart(2, '0')}`,
  plane: PLANES[i % 3],
  alt: 508 + ((i * 37) % 44),
  inc: [45.0, 87.4, 22.6][i % 3],
  band: BANDS[(i * 7) % 5],
  bw: [40, 80, 120, 200][(i * 3) % 4],
}))

const STATS = [
  { n: '18', u: '', l: 'Spacecraft on orbit' },
  { n: '18', u: 'GHz', l: 'Upper collection limit' },
  { n: '03', u: '', l: 'Orbital planes' },
  { n: '< 60', u: 'sec', l: 'Signal to intelligence' },
]

function SatTip({ idx }: { idx: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const f = (window as any).__kawaField
      const el = ref.current
      if (el && f && idx >= 0 && f.satScreen[idx]) {
        const p = f.satScreen[idx]
        el.style.transform = `translate(${p.x + 16}px, ${p.y}px) translateY(-50%)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [idx])

  const s = idx >= 0 ? SATS[idx] : null
  return (
    <div className="sat" ref={ref} data-on={s ? '1' : '0'} aria-hidden="true" style={{ left: 0, top: 0 }}>
      {s && (
        <>
          <div className="sat__id"><span>{s.id}</span><span>Plane {s.plane}</span></div>
          <div className="sat__r"><span>Altitude</span><b>{s.alt} km</b></div>
          <div className="sat__r"><span>Inclination</span><b>{s.inc.toFixed(1)}°</b></div>
          <div className="sat__r"><span>Tuned</span><b>{s.band}-band · {s.bw} MHz</b></div>
          <div className="sat__r"><span>State</span><b style={{ color: '#FF6A1A' }}>Collecting</b></div>
        </>
      )}
    </div>
  )
}

export default function Constellation({ hover }: { hover: number }) {
  const root = useScene<HTMLElement>(({ root, reduced }) => {
    if (reduced) return
    revealLines(root, '.const__h .line-inner')
    revealSoft(root.querySelectorAll('[data-soft]'), root, 0.15)
    gsap.from(root.querySelectorAll('.const__stat'), {
      opacity: 0, y: 26, duration: 1, stagger: 0.09, ease: 'expo.out',
      scrollTrigger: { trigger: root.querySelector('.const__stats'), start: 'top 88%', once: true },
    })
  })

  return (
    <section className="act const" data-act="constellation" id="constellation" ref={root} aria-labelledby="const-h">
      <div className="const__pin scrim scrim--frame">
        <div>
          <p className="eyebrow mono" data-soft>
            <b>05</b><span>The constellation</span><span>Live ephemeris</span>
          </p>
          <div className="const__head">
            <h2 className="const__h" id="const-h">
              <span className="line-wrap"><span className="line-inner">Eighteen instruments.</span></span>
              <span className="line-wrap"><span className="line-inner">One aperture.</span></span>
            </h2>
            <p className="lead const__lead" data-soft>
              Three orbital planes in continuous collection from 0.5 to 18 GHz. Frequency is tuneable
              on demand through Aura OS, so the constellation is re-pointed at your problem rather
              than the other way round.
            </p>
          </div>
          <p className="const__hint mono" data-soft aria-hidden="true">
            <span className="sig">◆</span> Move across the constellation to interrogate a spacecraft
          </p>
          <div className="reg" aria-hidden="true">
            {SATS.map((s) => (
              <span key={s.id}><i />{s.id} · {s.band} · {s.alt} km</span>
            ))}
          </div>
        </div>

        <div className="const__stats">
          {STATS.map((s) => (
            <div className="const__stat" key={s.l}>
              <b className="stat-num">{s.n}{s.u && <i>{s.u}</i>}</b>
              <span>{s.l}</span>
            </div>
          ))}
        </div>
      </div>
      <SatTip idx={hover} />
    </section>
  )
}
