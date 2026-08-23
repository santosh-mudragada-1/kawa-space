import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/scroll'
import { scrollTo, stopScroll } from '../lib/scroll'
import { S, type ActId } from '../gl/state'

const LINKS = [
  { label: 'Products', href: '#operations', idx: '01' },
  { label: 'Technology', href: '#processing', idx: '02' },
  { label: 'Applications', href: '#domains', idx: '03' },
  { label: 'Company', href: '#mission', idx: '04' },
  { label: 'Contact', href: '#contact', idx: '05' },
]

/** the nav tells you what the system is doing, not just where you are */
const READOUT: Record<ActId, string> = {
  hero: 'Link active',
  signal: 'Collecting',
  pipeline: 'Aura OS',
  domains: 'Cross-domain',
  constellation: '18 SC · 18 GHz',
  studio: 'Kawa Studio',
  fusion: 'RF · MSI · SAR',
  mission: 'Forward deployed',
  final: 'Link active',
}

function Glyph() {
  return (
    <svg className="nav__glyph" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1 11.4A7.2 7.2 0 0 0 15 11.4" stroke="currentColor" strokeWidth="1.05" opacity=".55" />
      <path d="M4.6 7.2a4.8 4.8 0 0 1 6.8 0" stroke="#FF6A1A" strokeWidth="1.05" />
      <path d="M6.9 4.3a8.1 8.1 0 0 1 2.2 0" stroke="#FF6A1A" strokeWidth="1.05" opacity=".55" />
      <circle cx="8" cy="9.8" r="1.15" fill="#FF6A1A" />
    </svg>
  )
}

export default function Nav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [act, setAct] = useState<ActId>('hero')
  const bar = useRef<HTMLSpanElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.42)
      setAct(S.current)
      if (bar.current) bar.current.style.transform = `scaleX(${S.p.toFixed(4)})`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const el = menu.current
    if (!el) return
    const items = el.querySelectorAll('.menu__list a, .menu__foot > *')
    const tl = gsap.timeline()
    if (open) {
      stopScroll(true)
      gsap.set(el, { visibility: 'visible' })
      tl.to(el, { clipPath: 'inset(0 0 0% 0)', duration: 0.72, ease: 'expo.inOut' })
        .from(items, { yPercent: 110, opacity: 0, duration: 0.7, stagger: 0.055, ease: 'expo.out' }, '-=0.34')
    } else {
      tl.to(el, { clipPath: 'inset(0 0 100% 0)', duration: 0.56, ease: 'expo.inOut' })
        .set(el, { visibility: 'hidden' })
        .add(() => stopScroll(false), 0)
    }
    return () => { tl.kill() }
  }, [open])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const go = (e: React.MouseEvent, href: string) => {
    e.preventDefault()
    setOpen(false)
    setTimeout(() => scrollTo(href, -40), open ? 380 : 0)
  }

  return (
    <>
      <header className="nav" data-scrolled={scrolled ? '1' : '0'}>
        <a className="nav__mark" href="#top" onClick={(e) => go(e, '#top')} aria-label="Kawa Space — home">
          <Glyph />
          <span className="nav__word" style={{ opacity: scrolled ? 0.55 : 1 }}>Kawa Space</span>
        </a>

        <nav className="nav__links" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} className="nav__link" href={l.href} onClick={(e) => go(e, l.href)}>{l.label}</a>
          ))}
          <span className="nav__status">
            <span className="nav__pulse" aria-hidden="true" />
            <span className="nav__status-stack">
              {/* invisible, always the longest readout — sets the box's width
                  via real layout, not a guessed CSS unit, so it can never be
                  wrong for whatever font actually renders and never clips
                  the real text sitting on top of it */}
              <span className="nav__status-ghost" aria-hidden="true">Forward deployed</span>
              <span className="nav__status-text">{READOUT[act]}</span>
            </span>
          </span>
        </nav>

        <button
          className="nav__burger" aria-expanded={open} aria-controls="menu"
          aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}
        >
          <i /><i />
        </button>

        <span className="nav__progress" ref={bar} aria-hidden="true" />
      </header>

      <div className="menu" id="menu" ref={menu} role="dialog" aria-modal="true" aria-label="Menu">
        <ul className="menu__list">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={(e) => go(e, l.href)}>
                <span>{l.idx}</span>{l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="menu__foot mono dim">
          <span>New Delhi · Bangalore</span>
          <a href="mailto:missions@kawa.space">missions@kawa.space</a>
        </div>
      </div>
    </>
  )
}
