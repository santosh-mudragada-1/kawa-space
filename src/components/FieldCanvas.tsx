import { useEffect, useRef } from 'react'
import { Field } from '../gl/Field'
import { S, ACTS } from '../gl/state'
import { isLowPower, prefersReduced } from '../lib/env'
import { ScrollTrigger } from '../lib/scroll'
import { decodeEarthMask } from '../gl/earthTexture'

/**
 * The one persistent WebGL surface. Every section shares it, which is what
 * lets the page read as a single continuous move through space.
 */
export default function FieldCanvas({ onSatHover }: { onSatHover: (i: number) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const field = useRef<Field | null>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    let cancelled = false
    let cleanup: (() => void) | null = null

    // decoded up front so the globe's point placement can trace real coastlines
    // from its first frame — no runtime cross-fade, no reflow once the page is visible
    decodeEarthMask().catch(() => undefined).then((earthMask) => {
      if (cancelled) return

      S.mobile = isLowPower()
      S.reduced = prefersReduced()
      S.w = window.innerWidth
      S.h = window.innerHeight

      const f = new Field()
      field.current = f
      f.mount(el, earthMask)
      if (!f.supported) return
      f.onSatHover = onSatHover
      ;(window as any).__kawaField = f

      const acts = ACTS.map((id) => {
        const node = document.querySelector<HTMLElement>(`[data-act="${id}"]`)
        return node ? { id, el: node } : null
      }).filter(Boolean) as { id: string; el: HTMLElement }[]
      f.registerActs(acts)

      let rt = 0
      const onResize = () => {
        clearTimeout(rt)
        f.resize()
        rt = window.setTimeout(() => { f.measure(); ScrollTrigger.refresh() }, 180)
      }
      const onPointer = (e: PointerEvent) => {
        S.tmx = (e.clientX / window.innerWidth) * 2 - 1
        S.tmy = -((e.clientY / window.innerHeight) * 2 - 1)
      }
      const onLeave = () => { S.tmx = 0; S.tmy = 0 }
      const onVis = () => (document.hidden ? f.pause() : f.start())

      window.addEventListener('resize', onResize)
      window.addEventListener('orientationchange', onResize)
      window.addEventListener('pointermove', onPointer, { passive: true })
      document.addEventListener('pointerleave', onLeave)
      document.addEventListener('visibilitychange', onVis)
      const mo = new ResizeObserver(() => f.measure())
      mo.observe(document.body)

      cleanup = () => {
        window.removeEventListener('resize', onResize)
        window.removeEventListener('orientationchange', onResize)
        window.removeEventListener('pointermove', onPointer)
        document.removeEventListener('pointerleave', onLeave)
        document.removeEventListener('visibilitychange', onVis)
        mo.disconnect()
        f.dispose()
        field.current = null
      }
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  return (
    <>
      <div id="field" ref={host} aria-hidden="true" />
      <div className="atmos" aria-hidden="true" />
    </>
  )
}
