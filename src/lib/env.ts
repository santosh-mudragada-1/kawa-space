export const isBrowser = typeof window !== 'undefined'

export const prefersReduced = () =>
  isBrowser && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const isCoarse = () =>
  isBrowser && window.matchMedia('(hover: none), (pointer: coarse)').matches

/**
 * "Mobile" here means "budget the GPU down", not "small screen".
 * Narrow viewport, coarse pointer, or few cores all qualify.
 */
export const isLowPower = () => {
  if (!isBrowser) return false
  const narrow = window.innerWidth < 820
  const cores = (navigator as any).hardwareConcurrency ?? 8
  const mem = (navigator as any).deviceMemory ?? 8
  return narrow || isCoarse() || cores <= 4 || mem <= 4
}
