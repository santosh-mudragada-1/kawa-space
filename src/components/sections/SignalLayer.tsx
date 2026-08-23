import { useScene, gsap, revealLines, revealSoft, ScrollTrigger } from '../../lib/useReveal'
import { useEffect, useState } from 'react'

const BANDS = [
  { k: 'L', f: 1.5, x: 4 }, { k: 'S', f: 3, x: 15 }, { k: 'C', f: 5.5, x: 30 },
  { k: 'X', f: 9.5, x: 52 }, { k: 'Ku', f: 14, x: 76 }, { k: 'K', f: 18, x: 96 },
]

type Row = { b: string; f: string; pos: string; cls: string; s: string; label: string }
const ROWS: Row[] = [
  { b: 'X', f: '9.410', pos: '11.28°N 072.44°E', cls: 'Navigation radar', s: 'geolocated', label: 'Geolocated' },
  { b: 'S', f: '3.055', pos: '14.02°N 073.91°E', cls: 'Surface search', s: 'geolocated', label: 'Geolocated' },
  { b: 'L', f: '1.575', pos: '19.07°N 072.87°E', cls: 'Handset cluster', s: 'correlated', label: 'Correlated' },
  { b: 'C', f: '5.620', pos: '08.44°S 105.12°E', cls: 'VSAT uplink', s: 'detected', label: 'Detected' },
  { b: 'X', f: '9.375', pos: '06.91°N 081.03°E', cls: 'Navigation radar', s: 'dark', label: 'AIS silent 41m' },
  { b: 'S', f: '2.998', pos: '21.35°N 069.72°E', cls: 'Coastal radar', s: 'geolocated', label: 'Geolocated' },
  { b: 'Ku', f: '14.250', pos: '03.18°N 098.66°E', cls: 'Mobile terminal', s: 'detected', label: 'Detected' },
  { b: 'L', f: '1.227', pos: '12.55°N 045.03°E', cls: 'Unknown emitter', s: 'unresolved', label: 'Unresolved' },
]

function Counter() {
  const [n, setN] = useState(1_284_907)
  useEffect(() => {
    const id = setInterval(() => setN((v) => v + 1 + Math.floor(Math.random() * 4)), 900)
    return () => clearInterval(id)
  }, [])
  return <b>{n.toLocaleString('en-US')}</b>
}

export default function SignalLayer() {
  const root = useScene<HTMLElement>(({ root, reduced }) => {
    if (reduced) return
    revealLines(root, '.sig-sec__h .line-inner')
    revealSoft(root.querySelectorAll('[data-soft]'), root, 0.2)

    const track = root.querySelector<HTMLElement>('.ruler__track')
    ScrollTrigger.create({
      trigger: root.querySelector('.ruler'), start: 'top 84%', end: 'top 38%', scrub: 0.5,
      onUpdate: (self) => track?.style.setProperty('--fill', self.progress.toFixed(3)),
    })

    gsap.from(root.querySelectorAll('.ruler__band'), {
      opacity: 0, y: 10, duration: 0.8, stagger: 0.07, ease: 'power2.out',
      scrollTrigger: { trigger: root.querySelector('.ruler'), start: 'top 78%', once: true },
    })

    gsap.from(root.querySelectorAll('.log__row'), {
      opacity: 0, x: -18, duration: 0.85, stagger: 0.055, ease: 'power3.out',
      scrollTrigger: { trigger: root.querySelector('.log'), start: 'top 80%', once: true },
    })
  })

  return (
    <section className="act section sig-sec scrim scrim--left" data-act="signal" id="signal" ref={root} aria-labelledby="sig-h">
      <div className="grid12">
        <p className="eyebrow mono" style={{ gridColumn: '1 / -1' }} data-soft>
          <b>02</b><span>The signal layer</span><span>Invisible / everywhere / unrecorded</span>
        </p>

        <div className="sig-sec__head">
          <h2 className="sig-sec__h" id="sig-h">
            <span className="line-wrap"><span className="line-inner">The world is</span></span>
            <span className="line-wrap"><span className="line-inner">full of signals.</span></span>
          </h2>
        </div>

        <div className="sig-sec__body">
          <p className="lead" data-soft>
            Every vessel, tower, handset, radar and terminal is transmitting right now. Almost none
            of it is recorded, located or attributed. It is the largest ungoverned dataset on the
            planet — and it is sitting in the air above every area you care about.
          </p>
        </div>

        <div className="ruler">
          <div className="mono faint" data-soft>Collection envelope — Kawa constellation</div>
          <div className="ruler__track">
            {BANDS.map((b) => (
              <span className="ruler__band mono" key={b.k} style={{ left: `${b.x}%` }}>
                <i />
                <b>{b.k}</b>
                <span>{b.f} GHz</span>
              </span>
            ))}
          </div>
          <div className="ruler__caps mono">
            <span>0.5 GHz</span>
            <span className="sig">Tuneable on demand · Aura OS</span>
            <span>18.0 GHz</span>
          </div>
        </div>

        <div className="log">
          <div className="log__top mono">
            <span>Emitter stream — Indian Ocean region</span>
            <span>Detections today <Counter /></span>
          </div>
          {ROWS.map((r, i) => (
            <div className="log__row" data-s={r.s} key={i}>
              <b>{r.b}</b>
              <span>{r.f}</span>
              <span>{r.pos}</span>
              <span className="log__cls">{r.cls}</span>
              <span className="log__state"><i />{r.label}</span>
            </div>
          ))}
          <div className="log__foot mono" data-soft>
            <span>S &amp; X full-band scan</span>
            <span>AIS correlation</span>
            <span>ML/AI dark-vessel geolocation</span>
          </div>
        </div>
      </div>
    </section>
  )
}
