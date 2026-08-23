import { useEffect, useState } from 'react'
import Boot from './components/Boot'
import Nav from './components/Nav'
import FieldCanvas from './components/FieldCanvas'
import { Frame, Reticle } from './components/Chrome'
import Hero from './components/sections/Hero'
import SignalLayer from './components/sections/SignalLayer'
import Pipeline from './components/sections/Pipeline'
import Domains from './components/sections/Domains'
import Constellation from './components/sections/Constellation'
import Operations from './components/sections/Operations'
import Fusion from './components/sections/Fusion'
import Mission from './components/sections/Mission'
import Final from './components/sections/Final'
import Footer from './components/Footer'
import { initScroll, ScrollTrigger } from './lib/scroll'

export default function App() {
  const [booted, setBooted] = useState(false)
  const [hoverSat, setHoverSat] = useState(-1)

  useEffect(() => {
    initScroll()
    // pinned sections change the document height; the field measures off it
    const sync = () => {
      ;(window as any).__kawaField?.measure?.()
    }
    ScrollTrigger.addEventListener('refresh', sync)
    const t = setTimeout(() => ScrollTrigger.refresh(), 120)
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    return () => { ScrollTrigger.removeEventListener('refresh', sync); clearTimeout(t) }
  }, [])

  return (
    <>
      <a className="skip" href="#signal">Skip to content</a>
      <FieldCanvas onSatHover={setHoverSat} />
      <Frame />
      <Reticle />
      <Nav />

      <main id="main">
        <Hero ready={booted} />
        <SignalLayer />
        <Pipeline />
        <Domains />
        <Constellation hover={hoverSat} />
        <Operations />
        <Fusion />
        <Mission />
        <Final />
      </main>

      <Footer />
      <Boot onDone={() => setBooted(true)} />
    </>
  )
}
