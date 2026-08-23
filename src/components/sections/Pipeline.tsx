import { useMemo } from 'react'
import { useScene, gsap } from '../../lib/useReveal'

const STAGES = [
  {
    w: 'Signal',
    d: 'A spacecraft passes overhead and the receiver records raw IQ across the tasked band. At this point there is energy, and nothing else.',
    m: ['Raw IQ', '0.5 – 18 GHz'],
  },
  {
    w: 'Detect',
    d: 'Aura OS separates emission from noise. Anything that clears threshold becomes an event with a timestamp, a bandwidth and a signature.',
    m: ['Event 0x4F1A', '9.410 GHz'],
  },
  {
    w: 'Locate',
    d: 'Time and frequency difference of arrival across the constellation resolve that event to a single point on the surface of the Earth.',
    m: ['TDOA / FDOA', '06.91°N 081.03°E'],
  },
  {
    w: 'Correlate',
    d: 'The point is matched against AIS, prior passes, known infrastructure and every other emitter inside the area of interest.',
    m: ['5 passes', 'AIS · gap 41m'],
  },
  {
    w: 'Understand',
    d: 'What remains is behaviour. A vessel that went dark forty-one minutes ago, holding a heading it has no reason to hold.',
    m: ['Dark vessel', 'Heading 214°'],
  },
]

const KP = { x: 452, y: 244 }
const BASE = 424

/** deterministic noise trace — the raw band before anything is known */
function useTrace() {
  return useMemo(() => {
    let s = 20260822
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1
    const pts: string[] = []
    for (let i = 0; i <= 168; i++) {
      const x = 40 + (i / 168) * 640
      const n = rnd() * 0.55 + rnd() * 0.3 + rnd() * 0.15
      pts.push(`${x.toFixed(1)},${(BASE + n * 60).toFixed(1)}`)
    }
    return pts.join(' ')
  }, [])
}

const CORR = [
  { x: 452, y: 244 }, { x: 396, y: 286 }, { x: 340, y: 322 },
  { x: 288, y: 350 }, { x: 236, y: 362 },
]
// each node's reveal time, offset from the track draw's own start — proportional
// to how far along the drawn path (old → present) that node actually sits, so a
// node lights up exactly as the line reaches it rather than on a flat stagger
const CORR_T = [0.8, 0.575, 0.361, 0.171, 0]
const VERDICT_LINK = `M${KP.x} ${KP.y + 24} L470 470`

// quadratic bezier through KP at t=0.5: control = 2·KP − midpoint(p0, p2)
function bezierThroughKP(p0: [number, number], p2: [number, number]) {
  const cx = 2 * KP.x - (p0[0] + p2[0]) / 2
  const cy = 2 * KP.y - (p0[1] + p2[1]) / 2
  return `M${p0[0]} ${p0[1]} Q ${cx} ${cy} ${p2[0]} ${p2[1]}`
}
// endpoints kept well inside the map panel (40–680, 120–526); each curve's peak/trough
// is solved algebraically (not eyeballed) to confirm it never leaves that box either.
// two bearings only — a tall arch and a shallow line near-tangent to its peak, not
// three, since the third (bowing hard right toward the panel edge) read as arbitrary
const TDOA = [
  bezierThroughKP([60, 470], [650, 405]),
  bezierThroughKP([670, 195], [150, 300]),
]

export default function Pipeline() {
  const trace = useTrace()

  const root = useScene<HTMLElement>(({ root, reduced }) => {
    const stages = gsap.utils.toArray<HTMLElement>('.pipe__stage', root)
    const bars = gsap.utils.toArray<HTMLElement>('.pipe__rail span', root)

    gsap.set(stages.slice(1), { opacity: 0, yPercent: 8 })
    gsap.set(['#p-thresh', '#p-peak-line', '#p-peak-mark', '#p-map', '#p-tdoa', '#p-lock-mark', '#p-lock-label', '#p-corr', '#p-track', '#p-ais', '#p-verdict', '#p-ripple'], { opacity: 0 })
    gsap.set('#p-tdoa path, #p-track, #p-ais', { strokeDasharray: 900, strokeDashoffset: 900 })
    gsap.set('#p-verdict-link', { strokeDasharray: 210, strokeDashoffset: 210 })
    gsap.set('#p-noise', { opacity: 0.12, scaleY: 0.28, transformOrigin: `50% ${BASE}px` })

    if (reduced) {
      gsap.set(stages, { opacity: 1, yPercent: 0, position: 'relative' })
      gsap.set(['#p-map', '#p-tdoa', '#p-lock-mark', '#p-lock-label', '#p-corr', '#p-track', '#p-ais', '#p-verdict'], { opacity: 1 })
      gsap.set(['#p-thresh', '#p-peak-line', '#p-peak-mark'], { opacity: 0.15 })
      gsap.set('#p-tdoa path, #p-track, #p-ais, #p-verdict-link', { strokeDashoffset: 0 })
      gsap.set('#p-noise', { opacity: 0.25, scaleY: 0.2, transformOrigin: `50% ${BASE}px` })
      bars.forEach((b) => b.style.setProperty('--p', '1'))
      return
    }

    // organic idle shimmer, independent of scroll — the raw band never sits dead still
    gsap.to('#p-noise', { attr: { strokeWidth: 1.5 }, duration: 2.2, ease: 'sine.inOut', yoyo: true, repeat: -1 })

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: root, start: 'top top', end: '+=520%',
        pin: '.pipe__pin', scrub: 0.75, anticipatePin: 1, invalidateOnRefresh: true,
      },
    })

    // stage copy: one leaves as the next arrives
    stages.forEach((st, i) => {
      if (i > 0) tl.to(st, { opacity: 1, yPercent: 0, duration: 0.3 }, i - 0.22)
      if (i < stages.length - 1) tl.to(st, { opacity: 0, yPercent: -8, duration: 0.3 }, i + 0.62)
    })
    bars.forEach((b, i) => {
      tl.fromTo(b, { '--p': 0 } as any, { '--p': 1, duration: 0.9 } as any, i - 0.1)
    })

    // 00 → 01  the raw trace arrives — nothing is known yet
    tl.fromTo('#p-noise', { opacity: 0.12, scaleY: 0.28 },
      { opacity: 0.85, scaleY: 1, transformOrigin: `50% ${BASE}px`, duration: 0.9, ease: 'power2.out' }, 0)

    // 01 → 02  the band quietens; the threshold grows out from the trace itself
    // and one emission crosses it — fast, because a detection event is instant
    tl.to('#p-noise', { scaleY: 0.16, opacity: 0.22, transformOrigin: `50% ${BASE}px`, duration: 0.7 }, 0.75)
      .set('#p-thresh', { opacity: 1 }, 0.8)
      .fromTo('#p-thresh-line', { scaleX: 0, transformOrigin: `40px ${BASE - 74}px` },
        { scaleX: 1, duration: 0.4, ease: 'power2.out' }, 0.8)
      .fromTo('#p-thresh-label', { opacity: 0 }, { opacity: 1, duration: 0.25 }, 1.0)
      .fromTo('#p-peak-line', { opacity: 0, scaleY: 0, transformOrigin: `${KP.x}px ${BASE}px` },
        { opacity: 1, scaleY: 1, duration: 0.35, ease: 'power2.out' }, 1.05)
      .fromTo('#p-peak-mark', { opacity: 0, scale: 0.4, transformOrigin: `${KP.x}px ${KP.y}px` },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }, 1.32)
      .fromTo('#p-ripple', { opacity: 0.9, scale: 0.3, transformOrigin: `${KP.x}px ${KP.y}px` },
        { opacity: 0, scale: 3, duration: 0.55, ease: 'power2.out' }, 1.35)

    // 02 → 03  the scope becomes a map; the first peak stays as a ghost, not
    // erased, while three lines converge on it — the left-side label is only on
    // screen for ~0.54 units (i+0.08 → i+0.62), so this whole calculation has to
    // resolve inside that budget or it visibly bleeds into the next stage's label
    tl.to('#p-scope', { opacity: 0.12, duration: 0.5 }, 1.75)
      .to('#p-map', { opacity: 1, duration: 0.6 }, 1.8)
      .to('#p-peak', { scaleY: 0.3, opacity: 0.15, transformOrigin: `${KP.x}px ${BASE}px`, duration: 0.5 }, 1.95)
      .to('#p-thresh', { opacity: 0.15, duration: 0.35 }, 1.85)
      .to('#p-tdoa', { opacity: 1, duration: 0.2 }, 2.0)
      .to('#p-tdoa path', { strokeDashoffset: 0, duration: 0.42, stagger: 0.08, ease: 'power2.inOut' }, 2.05)
      .fromTo('#p-ripple', { opacity: 0.8, scale: 0.3, transformOrigin: `${KP.x}px ${KP.y}px` },
        { opacity: 0, scale: 2.4, duration: 0.3, ease: 'power2.out' }, 2.55)
      .fromTo('#p-lock-mark', { opacity: 0, scale: 1.8, transformOrigin: `${KP.x}px ${KP.y}px` },
        { opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out' }, 2.62)
      .fromTo('#p-lock-label', { opacity: 0 }, { opacity: 1, duration: 0.25 }, 2.82)

    // 03 → 04  the point becomes a track — nodes light exactly as the drawn
    // line reaches them, and the AIS record arrives as its own independent thread
    tl.to('#p-tdoa', { opacity: 0.22, duration: 0.35 }, 2.95)
      .to('#p-corr', { opacity: 1, duration: 0.2 }, 3.0)
      .to('#p-track', { opacity: 1, strokeDashoffset: 0, duration: 0.55, ease: 'power2.inOut' }, 3.0)
    CORR.forEach((c, i) => {
      tl.fromTo(`#corr-${i}`, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'power2.out', transformOrigin: `${c.x}px ${c.y}px` }, 3.0 + CORR_T[i] * 0.6875)
    })
    tl.to('#p-ais', { opacity: 1, strokeDashoffset: 0, duration: 0.4, ease: 'power2.inOut' }, 3.3)

    // 04 → 05  the target pulses once more, then the finding draws itself
    // outward from it — slow and settling, this is the resolution; nothing
    // downstream is racing it, so it's the one stage allowed to take its time
    tl.to('#p-lock-ring', { scale: 1.22, duration: 0.3, ease: 'power2.out', yoyo: true, repeat: 1, transformOrigin: `${KP.x}px ${KP.y}px` }, 3.85)
      .to('#p-verdict', { opacity: 1, duration: 0.2 }, 4.0)
      .to('#p-verdict-link', { strokeDashoffset: 0, duration: 0.3, ease: 'power1.inOut' }, 4.05)
      .from('#p-verdict rect', { scaleX: 0, transformOrigin: 'left center', duration: 0.35, ease: 'power2.out' }, 4.3)
      .from('#p-verdict text', { opacity: 0, duration: 0.28, stagger: 0.07 }, 4.5)
      .to('#p-map', { opacity: 0.45, duration: 0.5 }, 4.0)
  })

  return (
    <section className="act pipe" data-act="pipeline" id="processing" ref={root} aria-labelledby="pipe-h">
      <h2 className="sr-only" id="pipe-h">From signal to intelligence</h2>
      <div className="pipe__pin scrim scrim--left">
        <div className="pipe__inner grid12">
          <div className="pipe__text">
            <p className="pipe__count mono"><b>03</b><span>Signal → intelligence</span></p>

            <div className="pipe__stages">
              {STAGES.map((s, i) => (
                <div className="pipe__stage" key={s.w}>
                  <p className="mono faint" style={{ marginBottom: '.9rem' }}>
                    {String(i + 1).padStart(2, '0')} / 05
                  </p>
                  <h3 className="pipe__word">{s.w}</h3>
                  <p className="lead pipe__desc">{s.d}</p>
                  <p className="pipe__meta mono">{s.m.map((x) => <span key={x}>{x}</span>)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pipe__vis">
            <svg className="pipe__svg" viewBox="0 0 720 560" fill="none" role="img"
              aria-label="A raw radio trace resolving into a detected event, a geolocated point, a correlated track and finally a classified dark vessel.">

              {/* scope frame */}
              <g id="p-scope" stroke="#E9E7E1" strokeWidth="1" opacity=".22">
                <path d="M40 100h640M40 560h640" opacity=".3" />
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <path key={i} d={`M${40 + i * 106.6} 96v10M${40 + i * 106.6} 554v-10`} opacity=".5" />
                ))}
                <polyline id="p-noise" points={trace} stroke="#3F6BD8" strokeWidth="1.1" opacity=".85" fill="none" />
              </g>

              {/* detection */}
              <g id="p-thresh">
                <path id="p-thresh-line" d={`M40 ${BASE - 74}h640`} stroke="#FF6A1A" strokeWidth="1" strokeDasharray="3 6" opacity=".7" />
                <text id="p-thresh-label" x="46" y={BASE - 82} fill="#FF6A1A" fontFamily="'JetBrains Mono', monospace" fontSize="10" letterSpacing="1.6">THRESHOLD</text>
              </g>
              {/* not a literal waveform — the same ring-and-dot language as the lock
                  and correlation nodes, so "an event exists here" reads consistently
                  everywhere it appears in this diagram */}
              <g id="p-peak">
                <line id="p-peak-line" x1={KP.x} y1={BASE} x2={KP.x} y2={KP.y} stroke="#FF6A1A" strokeWidth="1.4" />
                <g id="p-peak-mark">
                  <circle cx={KP.x} cy={KP.y} r="8" stroke="#FF6A1A" strokeWidth="1" fill="none" opacity=".6" />
                  <circle cx={KP.x} cy={KP.y} r="3" fill="#FF6A1A" />
                </g>
              </g>

              {/* map graticule */}
              <g id="p-map" stroke="#8C9AA6" strokeWidth="1" opacity="0">
                {Array.from({ length: 8 }, (_, i) => (
                  <path key={`h${i}`} d={`M40 ${120 + i * 58}h640`} opacity=".10" />
                ))}
                {Array.from({ length: 11 }, (_, i) => (
                  <path key={`v${i}`} d={`M${40 + i * 64} 120v406`} opacity=".10" />
                ))}
                <path d="M40 120h640v406H40Z" opacity=".26" />
                <text x="48" y="140" fill="#8C9AA6" fontFamily="'JetBrains Mono', monospace" fontSize="10" letterSpacing="1.6" opacity=".8">AOI — ARABIAN SEA</text>
              </g>

              {/* geolocation */}
              {/* three independent bearings — TDOA/FDOA only means something if they
                  actually triangulate to one point, so each control point is solved
                  (2·KP − midpoint of the endpoints) so its curve passes through KP
                  exactly at t=0.5, not just near it */}
              <g id="p-tdoa" stroke="#FFD9A8" strokeWidth="1.1" opacity="0" fill="none">
                {TDOA.map((c, i) => <path key={i} d={c} opacity=".5" />)}
              </g>
              <g id="p-lock">
                {/* the crosshair pops in; the label only fades — scaling both together
                    made the label swing in from a wide arc, which read as an error */}
                <g id="p-lock-mark">
                  <circle id="p-lock-ring" cx={KP.x} cy={KP.y} r="22" stroke="#FF6A1A" strokeWidth="1" opacity=".55" fill="none" />
                  <circle cx={KP.x} cy={KP.y} r="4" fill="#FF6A1A" />
                  <path d={`M${KP.x} ${KP.y - 34}v14M${KP.x} ${KP.y + 20}v14M${KP.x - 34} ${KP.y}h14M${KP.x + 20} ${KP.y}h14`} stroke="#FF6A1A" strokeWidth="1" />
                </g>
                <text id="p-lock-label" x={KP.x + 34} y={KP.y - 22} fill="#FFD9A8" fontFamily="'JetBrains Mono', monospace" fontSize="10" letterSpacing="1.4">06.91°N 081.03°E</text>
              </g>

              {/* correlation */}
              <g id="p-corr">
                {CORR.map((c, i) => (
                  <g key={i} id={`corr-${i}`}>
                    <circle cx={c.x} cy={c.y} r={i === 0 ? 4 : 3} fill={i === 0 ? '#FF6A1A' : '#FFD9A8'} opacity={i === 0 ? 1 : 0.75} />
                    <circle cx={c.x} cy={c.y} r="11" stroke="#FFD9A8" strokeWidth=".8" opacity=".3" fill="none" />
                  </g>
                ))}
                <text x="204" y="392" fill="#8C9AA6" fontFamily="'JetBrains Mono', monospace" fontSize="10" letterSpacing="1.4">T−04:12</text>
                <text x={KP.x + 12} y={KP.y + 40} fill="#8C9AA6" fontFamily="'JetBrains Mono', monospace" fontSize="10" letterSpacing="1.4">T−00:00</text>
              </g>
              <path id="p-track" d={`M236 362 L288 350 L340 322 L396 286 L${KP.x} ${KP.y}`}
                stroke="#FF6A1A" strokeWidth="1.6" fill="none" />
              <path id="p-ais" d="M236 386 L292 374 L344 348 L372 330"
                stroke="#3F6BD8" strokeWidth="1.4" strokeDasharray="6 7" fill="none" />

              {/* classification */}
              <g id="p-verdict">
                <rect x="380" y="470" width="332" height="56" fill="rgba(255,106,26,.07)" stroke="#FF6A1A" strokeWidth="1" />
                <text x="396" y="492" fill="#FF6A1A" fontFamily="'JetBrains Mono', monospace" fontSize="11" letterSpacing="2">DARK VESSEL — CONFIDENCE 0.94</text>
                <text x="396" y="512" fill="#FFD9A8" fontFamily="'JetBrains Mono', monospace" fontSize="10" letterSpacing="1.2" opacity=".8">AIS SILENT 41 MIN · HEADING 214° · 11.4 KN</text>
                <path id="p-verdict-link" d={VERDICT_LINK} stroke="#FF6A1A" strokeWidth="1" opacity=".45" />
              </g>

              {/* reused at each moment something resolves — detection, lock, verdict */}
              <circle id="p-ripple" cx={KP.x} cy={KP.y} r="6" stroke="#FF6A1A" strokeWidth="1.2" fill="none" opacity="0" />
            </svg>
          </div>

          <div className="pipe__rail" aria-hidden="true">
            {STAGES.map((s) => <span key={s.w} />)}
          </div>
        </div>
      </div>
    </section>
  )
}
