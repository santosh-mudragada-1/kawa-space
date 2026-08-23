import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from './scroll'
import { prefersReduced } from './env'

/**
 * Scoped GSAP context. Every section uses this so cleanup is automatic
 * and ScrollTriggers never leak across React remounts.
 */
export function useScene<T extends HTMLElement = HTMLElement>(
  setup: (ctx: { root: T; reduced: boolean }) => void,
  deps: unknown[] = []
) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const reduced = prefersReduced()
    const ctx = gsap.context(() => setup({ root, reduced }), root)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

/** line-masked headline reveal — the one motion the type is allowed */
export function revealLines(scope: HTMLElement, selector = '.line-inner', opts: gsap.TweenVars = {}) {
  const els = scope.querySelectorAll<HTMLElement>(selector)
  if (!els.length) return
  return gsap.from(els, {
    yPercent: 116,
    duration: 1.15,
    ease: 'expo.out',
    stagger: 0.075,
    scrollTrigger: { trigger: scope, start: 'top 78%', once: true },
    ...opts,
  })
}

/** quiet reveal for supporting copy */
export function revealSoft(targets: gsap.DOMTarget, scope: HTMLElement, delay = 0.1) {
  return gsap.from(targets, {
    opacity: 0, y: 18, duration: 1, ease: 'power2.out', delay, stagger: 0.06,
    scrollTrigger: { trigger: scope, start: 'top 74%', once: true },
  })
}

export { ScrollTrigger, gsap }
