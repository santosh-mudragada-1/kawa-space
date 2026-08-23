import { useScene, revealLines, revealSoft, gsap } from '../../lib/useReveal'

const PRINCIPLES = [
  ['01', 'Master the details.', 'Nullius in verba'],
  ['02', 'Speed matters. Deadlines are sacred. Results count.', 'Festina lente'],
  ['03', 'Space is the next silk route — build roads, not shops.', 'Infrastructure'],
  ['04', 'Obsession and hard work over talent.', '初心'],
  ['05', 'Make physics dangerous again.', 'House rule'],
]

export default function Mission() {
  const root = useScene<HTMLElement>(({ root, reduced }) => {
    if (reduced) return
    revealLines(root, '.mis__h .line-inner')
    revealSoft(root.querySelectorAll('[data-soft]'), root, 0.15)
    gsap.from(root.querySelectorAll('.prin__row'), {
      opacity: 0, y: 26, duration: 0.95, stagger: 0.07, ease: 'expo.out',
      scrollTrigger: { trigger: root.querySelector('.prin'), start: 'top 84%', once: true },
    })
  })

  return (
    <section className="act section mis scrim scrim--left" data-act="mission" id="mission" ref={root} aria-labelledby="mis-h">
      <div className="grid12">
        <p className="eyebrow mono" style={{ gridColumn: '1 / -1' }} data-soft>
          <b>08</b><span>Mission</span><span>New Delhi · Bangalore</span>
        </p>

        <h2 className="mis__h" id="mis-h">
          <span className="line-wrap"><span className="line-inner">Built by people</span></span>
          <span className="line-wrap"><span className="line-inner">who have needed it.</span></span>
        </h2>

        <div className="mis__body">
          <p className="lead" data-soft>
            Among our team are people who have worked on every front of sovereignty and national
            security. They have launched satellites, flown deep into contested airspace, commanded
            warships, led patrols, forged alliances and called for fire.
          </p>
          <p className="lead dim" data-soft>
            Every role at Kawa is forward deployed. If the person who depends on this is standing on
            a border or somewhere in the middle of the Indian Ocean, that is where we go and build
            it with them — because intelligence that arrives after the decision is just a record.
          </p>
        </div>

        <div className="prin">
          {PRINCIPLES.map(([i, t, s]) => (
            <div className="prin__row" key={i}>
              <em>{i}</em>
              <span style={{ color: 'inherit', font: 'inherit', letterSpacing: 'inherit', textTransform: 'none', marginLeft: 0 }}>{t}</span>
              <span>{s}</span>
            </div>
          ))}
        </div>

        <div className="mis__foot mono" data-soft>
          <span>New Delhi · Bangalore</span>
          <span>Forward-deployed engineering</span>
          <a className="btn" href="mailto:missions@kawa.space">
            <span className="btn__dot" /> Join the mission
          </a>
        </div>
      </div>
    </section>
  )
}
