import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/scroll'
import { prefersReduced } from '../lib/env'

const LOG = [
  ['UPLINK', 'ground segment · handshake'],
  ['EPHEMERIS', '18 spacecraft · 3 planes'],
  ['RECEIVER', '0.5 – 18.0 GHz · tuneable'],
  ['AURA OS', 'geolocation engine online'],
]

export default function Boot({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const reduced = prefersReduced()

    if (reduced) {
      gsap.set(el, { display: 'none' })
      onDone()
      return
    }

    const state = { v: 0 }
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })

    tl.to(el.querySelectorAll('.boot__line'), { opacity: 1, duration: 0.4, stagger: 0.14 }, 0.15)
      .to(el.querySelector('.boot__bar i'), { scaleX: 1, duration: 1.5, ease: 'power2.inOut' }, 0.1)
      .to(state, {
        v: 100, duration: 1.5, ease: 'power2.inOut',
        onUpdate: () => setPct(Math.round(state.v)),
      }, 0.1)
      .to(el.querySelector('.boot__mid'), { opacity: 0, y: -22, duration: 0.6, ease: 'power2.in' }, '+=0.16')
      .to(el, {
        clipPath: 'inset(0% 0% 100% 0%)', duration: 1.0, ease: 'expo.inOut',
        onStart: () => document.body.classList.remove('is-locked'),
      }, '-=0.2')
      .add(onDone, '-=0.62')
      .set(el, { display: 'none' })

    document.body.classList.add('is-locked')
    window.scrollTo(0, 0)
    return () => { tl.kill(); document.body.classList.remove('is-locked') }
  }, [])

  return (
    <div className="boot" ref={root} aria-hidden="true">
      <div className="boot__grid" />
      <div className="boot__mid">
        <p className="mono dim" style={{ marginBottom: '1.2rem' }}>Kawa Space · Spectrum Intelligence</p>
        <p className="boot__title">Establishing<br />downlink</p>
        <div className="boot__lines mono">
          {LOG.map(([k, v]) => (
            <div className="boot__line" key={k}><b>{k}</b><span>{v}</span></div>
          ))}
        </div>
        <div className="boot__bar"><i /></div>
        <div className="boot__pct mono">
          <span>Acquiring</span>
          <span>{String(pct).padStart(3, '0')} %</span>
        </div>
      </div>
    </div>
  )
}
