import { useEffect, useRef, useState } from 'react'
import { S, ACTS, type ActId } from '../gl/state'
import { isCoarse } from '../lib/env'

const ACT_LABELS: Record<ActId, string> = {
  hero: 'Acquisition',
  signal: 'Signal layer',
  pipeline: 'Processing',
  domains: 'Domains',
  constellation: 'Constellation',
  studio: 'Operations',
  fusion: 'Fusion',
  mission: 'Mission',
  final: 'Link',
}

/* ---------- instrument frame ---------- */
export function Frame() {
  return (
    <div className="frame" aria-hidden="true">
      <div className="frame__edge frame__edge--t" />
      <div className="frame__edge frame__edge--l" />
      <div className="frame__edge frame__edge--r" />
    </div>
  )
}

/* ---------- left telemetry rail ---------- */
export function Rail() {
  const [cur, setCur] = useState<ActId>('hero')
  useEffect(() => {
    let id = 0
    const tick = () => { setCur(S.current); id = requestAnimationFrame(tick) }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <nav className="rail" aria-label="Section progress">
      {ACTS.map((a, i) => (
        <div key={a} className="rail__item" data-on={a === cur ? '1' : '0'}>
          <span className="rail__bar" />
          <span>{String(i).padStart(2, '0')}</span>
          <span style={{ opacity: a === cur ? 1 : 0, transition: 'opacity .5s' }}>{ACT_LABELS[a]}</span>
        </div>
      ))}
    </nav>
  )
}

/* ---------- cursor reticle ---------- */
export function Reticle() {
  const ref = useRef<SVGSVGElement>(null)
  const txt = useRef<SVGTextElement>(null)
  const [big, setBig] = useState(false)

  useEffect(() => {
    if (isCoarse()) return
    const el = ref.current
    if (!el) return
    let x = window.innerWidth / 2, y = window.innerHeight / 2
    let tx = x, ty = y, raf = 0

    const move = (e: PointerEvent) => {
      tx = e.clientX; ty = e.clientY
      const t = e.target as HTMLElement
      setBig(!!t?.closest?.('a, button, [data-cursor]'))
    }
    const loop = () => {
      x += (tx - x) * 0.26; y += (ty - y) * 0.26
      el.style.transform = `translate3d(${x - 34}px, ${y - 34}px, 0)`
      if (txt.current) {
        const lat = (90 - (y / window.innerHeight) * 180).toFixed(2)
        const lon = ((x / window.innerWidth) * 360 - 180).toFixed(2)
        txt.current.textContent = `${lat}  ${lon}`
      }
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('pointermove', move, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf) }
  }, [])

  return (
    <svg ref={ref} className="reticle" width="68" height="68" viewBox="0 0 68 68" aria-hidden="true">
      <g
        stroke="#E9E7E1"
        fill="none"
        style={{ transition: 'transform .45s cubic-bezier(.22,1,.36,1), opacity .3s', transformOrigin: '34px 34px' }}
        transform={big ? 'scale(1.55)' : 'scale(1)'}
        opacity={big ? 1 : 0.75}
      >
        <circle cx="34" cy="34" r={big ? 13 : 8} strokeWidth="1" opacity=".5" />
        <path d="M34 21v7M34 40v7M21 34h7M40 34h7" strokeWidth="1" />
        <circle cx="34" cy="34" r="1.2" fill="#E9E7E1" stroke="none" />
      </g>
      <text
        ref={txt} x="34" y="62" textAnchor="middle" fill="#E9E7E1"
        fontFamily="'JetBrains Mono', monospace" fontSize="7" letterSpacing="1.1"
        opacity={big ? 0 : 0.42}
      />
    </svg>
  )
}
