import { useEffect, useRef } from 'react'
import { prefersReduced } from '../../lib/env'

/**
 * Live spectrum waterfall. Drawn at low resolution and scaled up — a real
 * receiver display looks like this, and it costs almost nothing per frame.
 */
export default function Waterfall() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const W = 190, H = 112
    cv.width = W; cv.height = H
    const ctx = cv.getContext('2d', { alpha: false })
    if (!ctx) return

    let raf = 0, running = false, t = 0
    const reduced = prefersReduced()

    // three persistent carriers plus wandering noise
    const carriers = [
      { x: 0.22, w: 0.02, a: 0.9 },
      { x: 0.54, w: 0.045, a: 0.72 },
      { x: 0.79, w: 0.012, a: 1.0 },
    ]

    const row = () => {
      const img = ctx.createImageData(W, 1)
      for (let i = 0; i < W; i++) {
        const u = i / W
        let v = 0.10 + Math.random() * 0.11
        for (const c of carriers) {
          const d = Math.abs(u - (c.x + Math.sin(t * 0.008 + c.x * 9) * 0.012))
          if (d < c.w) v += c.a * (1 - d / c.w) * (0.72 + Math.random() * 0.28)
        }
        // an intermittent burst — the thing an analyst is actually waiting for
        if (u > 0.36 && u < 0.40 && Math.sin(t * 0.03) > 0.86) v += 0.85
        v = Math.min(1, v)
        // cobalt → amber → bone: the site's frequency ramp, in a receiver
        const r = v < 0.5 ? 63 + (255 - 63) * (v / 0.5) : 255
        const g = v < 0.5 ? 107 - 1 * v : 106 + (217 - 106) * ((v - 0.5) / 0.5)
        const b = v < 0.5 ? 216 - (216 - 26) * (v / 0.5) : 26 + (168 - 26) * ((v - 0.5) / 0.5)
        const k = i * 4
        img.data[k] = r * (0.35 + v * 0.65)
        img.data[k + 1] = g * (0.35 + v * 0.65)
        img.data[k + 2] = b * (0.35 + v * 0.65)
        img.data[k + 3] = 255
      }
      ctx.drawImage(cv, 0, 0, W, H - 1, 0, 1, W, H - 1)
      ctx.putImageData(img, 0, 0)
      t++
    }

    ctx.fillStyle = '#070909'
    ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < H; i++) row()
    if (reduced) return

    let acc = 0, last = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!running) return
      acc += now - (last || now); last = now
      if (acc < 55) return       // ~18 rows/sec, the cadence of a real display
      acc = 0
      row()
    }

    const io = new IntersectionObserver(([e]) => { running = e.isIntersecting; last = 0 }, { threshold: 0.05 })
    io.observe(cv)
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); io.disconnect() }
  }, [])

  return <canvas className="wf" ref={ref} role="img" aria-label="Live spectrum waterfall showing three persistent carriers and an intermittent burst." />
}
