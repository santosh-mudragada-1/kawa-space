import { useState } from 'react'
import { useScene, gsap, revealLines, revealSoft } from '../../lib/useReveal'
import Waterfall from './Waterfall'

const TABS = ['Tasking', 'Area of interest', 'Signals', 'Team'] as const
type Tab = typeof TABS[number]

const QUEUE = [
  { id: 'T-4471', t: 'RF sweep · S & X band · Gulf of Aden', p: 1, s: 'complete', st: 'Complete' },
  { id: 'T-4472', t: 'SAR · 1 m spotlight · Port approach', p: 0.72, s: 'downlink', st: 'Downlink' },
  { id: 'T-4473', t: 'Multispectral · 10-band · AOI-09', p: 0.41, s: 'collect', st: 'Collecting' },
  { id: 'T-4474', t: 'RF · L-band handset survey · Coastal', p: 0.12, s: 'queued', st: 'Queued' },
  { id: 'T-4475', t: 'IQ export · Event 0x4F1A · 9.410 GHz', p: 0.94, s: 'complete', st: 'Ready' },
]

const CREW = [
  { i: 'AN', n: 'A. Nayar', r: 'Mission lead', s: 'Tasking AOI-09' },
  { i: 'RK', n: 'R. Kulkarni', r: 'Analyst', s: 'Reviewing 41 detections' },
  { i: 'SV', n: 'S. Verma', r: 'Forward deployed', s: 'On station · INS Vikrant' },
  { i: 'JD', n: 'J. Dsouza', r: 'ML engineer', s: 'Retraining classifier' },
]

function AoiMap() {
  return (
    <div className="aoi">
      <svg viewBox="0 0 620 320" fill="none" role="img" aria-label="Area of interest with coastline, tasked footprint and forty-one located emitters.">
        <defs>
          <pattern id="aoiGrid" width="31" height="32" patternUnits="userSpaceOnUse">
            <path d="M31 0V32M0 32H31" stroke="#E9E7E1" strokeWidth=".5" opacity=".07" />
          </pattern>
        </defs>
        <rect width="620" height="320" fill="url(#aoiGrid)" />
        {/* abstract coastline — geography as a boundary condition, not a picture */}
        <path d="M-4 208 C 70 196 108 224 168 214 C 232 203 258 168 320 172 C 372 175 404 205 452 198 C 512 189 546 152 624 158"
          stroke="#8C9AA6" strokeWidth="1.2" opacity=".5" />
        <path d="M-4 208 C 70 196 108 224 168 214 C 232 203 258 168 320 172 C 372 175 404 205 452 198 C 512 189 546 152 624 158 L624 324 L-4 324Z"
          fill="#8C9AA6" opacity=".045" />
        {/* tasked footprint */}
        <path d="M196 62 L470 48 L494 148 L214 164Z" stroke="#FF6A1A" strokeWidth="1" fill="rgba(255,106,26,.05)" strokeDasharray="5 5" />
        <text x="200" y="42" fill="#FF6A1A" fontFamily="'JetBrains Mono', monospace" fontSize="9.5" letterSpacing="1.6">AOI-09 · TASKED 04:12 UTC</text>
        {/* located emitters */}
        {[[248,96],[292,80],[336,112],[380,92],[418,120],[262,138],[356,140],[444,86],[214,116],[400,64]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="2.6" fill={i === 4 ? '#FF6A1A' : '#FFD9A8'} opacity={i === 4 ? 1 : .7} />
            {i === 4 && <circle cx={x} cy={y} r="13" stroke="#FF6A1A" strokeWidth=".9" opacity=".5" fill="none" />}
          </g>
        ))}
        <path d="M418 120 L470 190" stroke="#FF6A1A" strokeWidth=".9" opacity=".45" />
        <text x="476" y="194" fill="#FFD9A8" fontFamily="'JetBrains Mono', monospace" fontSize="9.5" letterSpacing="1.4">06.91°N 081.03°E</text>
        <text x="16" y="304" fill="#8C9AA6" fontFamily="'JetBrains Mono', monospace" fontSize="9.5" letterSpacing="1.6" opacity=".7">41 EMITTERS LOCATED · LAST PASS 00:04:12 AGO</text>
      </svg>
    </div>
  )
}

export default function Operations() {
  const [tab, setTab] = useState<Tab>('Tasking')

  const root = useScene<HTMLElement>(({ root, reduced }) => {
    if (reduced) return
    revealLines(root, '.ops__h .line-inner')
    revealSoft(root.querySelectorAll('[data-soft]'), root, 0.15)
    // the interface rises out of the spatial environment rather than cutting in
    gsap.from(root.querySelector('.studio'), {
      yPercent: 8, scale: 0.965, opacity: 0, filter: 'blur(10px)',
      duration: 1.5, ease: 'expo.out',
      scrollTrigger: { trigger: root.querySelector('.studio'), start: 'top 88%', once: true },
    })
    gsap.from(root.querySelectorAll('.q__bar i'), {
      scaleX: 0, duration: 1.2, stagger: 0.08, ease: 'expo.out',
      scrollTrigger: { trigger: root.querySelector('.studio'), start: 'top 70%', once: true },
    })
  })

  const switchTab = (t: Tab) => {
    setTab(t)
    const el = document.querySelector('.studio__panel > div')
    if (el) gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' })
  }

  return (
    <section className="act section ops scrim scrim--veil" data-act="studio" id="operations" ref={root} aria-labelledby="ops-h">
      <div className="grid12">
        <p className="eyebrow mono" style={{ gridColumn: '1 / -1' }} data-soft>
          <b>06</b><span>From orbit to operations</span><span>Kawa Studio</span>
        </p>

        <h2 className="ops__h" id="ops-h">
          <span className="line-wrap"><span className="line-inner">From orbit</span></span>
          <span className="line-wrap"><span className="line-inner">to operations.</span></span>
        </h2>

        <p className="lead ops__lead" data-soft>
          Kawa Studio is a unified command centre for your area of interest — task RF, multispectral
          and SAR together, pull IQ with one click, fuse what comes back, and hand the result to the
          people who have to act on it.
        </p>

        <div className="studio" role="region" aria-label="Kawa Studio interface">
          <div className="studio__bar">
            <span className="studio__dot" aria-hidden="true" />
            <b>Kawa Studio</b>
            <span>Session KS-2291</span>
            <span>AOI-09 · Arabian Sea</span>
            <span>04:12:07 UTC</span>
            <span className="studio__crew" aria-label="Four collaborators online">
              {CREW.map((c) => <i key={c.i}>{c.i}</i>)}
            </span>
          </div>

          <div className="studio__body">
            <div className="studio__tabs" role="tablist" aria-label="Studio views">
              {TABS.map((t, i) => (
                <button
                  key={t} className="studio__tab" role="tab" id={`tab-${i}`}
                  aria-selected={tab === t} aria-controls="studio-panel"
                  tabIndex={tab === t ? 0 : -1}
                  onClick={() => switchTab(t)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') switchTab(TABS[(i + 1) % TABS.length])
                    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') switchTab(TABS[(i - 1 + TABS.length) % TABS.length])
                  }}
                >
                  <em>{String(i + 1).padStart(2, '0')}</em>{t}
                </button>
              ))}
            </div>

            <div className="studio__panel" id="studio-panel" role="tabpanel" aria-labelledby={`tab-${TABS.indexOf(tab)}`}>
              {tab === 'Tasking' && (
                <div className="q">
                  {QUEUE.map((r) => (
                    <div className="q__row" key={r.id}>
                      <b>{r.id}</b>
                      <span>{r.t}</span>
                      <span className="q__bar"><i style={{ transform: `scaleX(${r.p})` }} /></span>
                      <span className="q__st" data-s={r.s}>{r.st}</span>
                    </div>
                  ))}
                </div>
              )}
              {tab === 'Area of interest' && <div><AoiMap /></div>}
              {tab === 'Signals' && (
                <div>
                  <Waterfall />
                  <div className="wf-legend">
                    <span>9.30 GHz</span><span className="sig">Event 0x4F1A · burst detected</span><span>9.52 GHz</span>
                  </div>
                  <div className="q" style={{ marginTop: '1.2rem' }}>
                    <div className="q__row"><b>IQ</b><span>Raw complex samples · 61.4 MB</span><span /><span className="q__st">Download</span></div>
                    <div className="q__row"><b>JSON</b><span>Lat, lon, time, emitter attributes</span><span /><span className="q__st">API · REST</span></div>
                  </div>
                </div>
              )}
              {tab === 'Team' && (
                <div className="team">
                  {CREW.map((c) => (
                    <div className="team__row" key={c.i}>
                      <span className="team__av">{c.i}</span>
                      <b>{c.n}</b>
                      <span>{c.r}</span>
                      <span>{c.s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="studio__side">
              <div className="studio__kv"><span>Constellation</span><b>18 / 18 nominal</b></div>
              <div className="studio__kv"><span>Next pass</span><b>00:07:41</b></div>
              <div className="studio__kv"><span>Tuned</span><b>9.30 – 9.52 GHz</b></div>
              <div className="studio__kv"><span>Detections</span><b>41 located</b></div>
              <div className="studio__kv"><span>Fusion</span><b>RF · MSI · SAR</b></div>
              <div className="studio__kv"><span>Delivery</span><b>API · Studio</b></div>
            </div>
          </div>

          <div className="studio__foot">
            <span><b>Operate</b> missions</span>
            <span><b>Task</b> RF, MSI &amp; SAR</span>
            <span><b>Explore</b> your AOI</span>
            <span><b>Fuse</b> datasets</span>
            <span><b>Collaborate</b> in place</span>
            <span><b>Download</b> findings</span>
          </div>
        </div>
      </div>
    </section>
  )
}
