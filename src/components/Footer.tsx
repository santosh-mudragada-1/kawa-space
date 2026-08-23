const COLS = [
  { h: 'Product', l: [['Maritime domain awareness', '#domains'], ['SIGINT', '#signal'], ['ELINT', '#processing'], ['Mission as a service', '#operations']] },
  { h: 'Technology', l: [['Aura OS', '#processing'], ['Kawa Studio', '#operations'], ['Constellation', '#constellation'], ['Data fusion', '#fusion']] },
  { h: 'Company', l: [['Mission', '#mission'], ['Careers', 'mailto:missions@kawa.space'], ['Contact', 'mailto:missions@kawa.space']] },
]

export default function Footer() {
  return (
    <footer className="foot">
      <div className="foot__grid">
        <div className="foot__brand">
          <b>Kawa Space</b>
          <p className="mono dim">The cognitive infrastructure<br />for spectrum intelligence</p>
          <a className="mono sig" href="mailto:missions@kawa.space">missions@kawa.space</a>
        </div>
        {COLS.map((c) => (
          <nav className="foot__col" key={c.h} aria-label={c.h}>
            <h3>{c.h}</h3>
            {c.l.map(([t, h]) => <a key={t} href={h}>{t}</a>)}
          </nav>
        ))}
      </div>
      <div className="foot__base mono">
        <span>New Delhi · Bangalore</span>
        <span>0.5 — 18.0 GHz</span>
        <span>© {new Date().getFullYear()} Kawa Space</span>
      </div>
    </footer>
  )
}
