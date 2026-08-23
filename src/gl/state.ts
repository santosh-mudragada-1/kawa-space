/**
 * Shared scroll / pointer state.
 * GSAP ScrollTrigger writes here; the WebGL loop reads. One source of truth
 * keeps the DOM narrative and the spatial narrative locked together.
 */

export type ActId =
  | 'hero' | 'signal' | 'pipeline' | 'domains'
  | 'constellation' | 'studio' | 'fusion' | 'mission' | 'final'

export const ACTS: ActId[] = [
  'hero', 'signal', 'pipeline', 'domains',
  'constellation', 'studio', 'fusion', 'mission', 'final',
]

export const S = {
  /** global page progress 0..1 (raw) */
  p: 0,
  /** smoothed page progress — what the camera actually follows */
  ps: 0,
  /** per-act local progress 0..1 */
  act: Object.fromEntries(ACTS.map((a) => [a, 0])) as Record<ActId, number>,
  /** which act currently owns the viewport */
  current: 'hero' as ActId,
  /** normalised scroll velocity, -1..1, smoothed */
  vel: 0,
  /** pointer in NDC, smoothed */
  mx: 0, my: 0,
  /** raw pointer target */
  tmx: 0, tmy: 0,
  /** viewport */
  w: 1, h: 1, dpr: 1,
  /** capability flags */
  mobile: false,
  reduced: false,
  /** 0..1 hero intro reveal */
  intro: 0,
  /** hovered satellite index, -1 = none */
  hoverSat: -1,
}

export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
/** frame-rate independent damping */
export const damp = (a: number, b: number, lambda: number, dt: number) =>
  lerp(a, b, 1 - Math.exp(-lambda * dt))

/** map v from [a,b] to 0..1, clamped */
export const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a))
