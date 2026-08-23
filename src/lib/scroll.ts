import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReduced } from './env'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null

export function initScroll() {
  if (lenis) return lenis
  if (prefersReduced()) {
    ScrollTrigger.normalizeScroll(false)
    return null
  }

  lenis = new Lenis({
    duration: 1.1,
    // exponential settle — carries inertia without feeling floaty
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1.6,
    wheelMultiplier: 0.92,
  })

  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis!.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export function scrollTo(target: string | HTMLElement, offset = 0) {
  if (lenis) lenis.scrollTo(target, { offset, duration: 1.4 })
  else {
    const el = typeof target === 'string' ? document.querySelector(target) : target
    el?.scrollIntoView({ behavior: 'auto', block: 'start' })
  }
}

export function stopScroll(stop: boolean) {
  if (!lenis) { document.body.classList.toggle('is-locked', stop); return }
  stop ? lenis.stop() : lenis.start()
  document.body.classList.toggle('is-locked', stop)
}

export { gsap, ScrollTrigger }
