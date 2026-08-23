# Kawa Space — Spectrum Intelligence

A single-page site for Kawa Space, built around one idea: **invisible signals becoming
visible intelligence.**

The whole page is one continuous move through space. A single persistent WebGL scene sits
behind every section, and scroll position drives a *narrative position* (`np`, 0 → 8) that
the camera, the particle formations and the DOM all read from. The camera completes exactly
one orbit of Earth between the hero and the final CTA, so the ending physically returns to
the opening.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # → dist/  (standard multi-file build)
npm run build:single   # → dist/index.html, everything inlined in one file
npm run preview
```

## Architecture

```
src/
  gl/
    state.ts      shared scroll/pointer state — GSAP writes, the render loop reads
    glsl.ts       reusable shader chunks: value noise, the frequency ramp, point sprites
    modules.ts    the seven visual modules
    Field.ts      renderer, camera rig, keyframes, narrative orchestration
  lib/
    env.ts        capability detection (low-power, coarse pointer, reduced motion)
    scroll.ts     Lenis + ScrollTrigger wiring
    useReveal.ts  scoped GSAP contexts and the two sanctioned reveal motions
  components/
    Boot, Nav, Chrome (frame / rail / reticle), FieldCanvas, Footer
    sections/     one component per act
```

### One canvas, seven modules

| Module | Role |
| --- | --- |
| `makeStarfield` | depth continuity; present in every act |
| `makeSensor` | the hero instrument — edges and thin lines, not a spaceship |
| `makeOrbitRings` | faint coordinate geometry that expands as the hero yields |
| `makeSignalField` | **the metaphor engine** — one particle system, four formations |
| `makeGlobe` | abstract Earth: graticule + a point shell tracing procedural landmass |
| `makeConstellation` | 18 spacecraft, 3 planes, collection cones, ground detections |
| `makeSurface` | one patch of Earth re-read four ways (sea / land / air / space) |
| `makeFusion` | RF, multispectral and SAR arriving misregistered, then agreeing |

`makeSignalField` carries the story. A single `uMorph` uniform blends between atmospheric
dust → signals in transit → emitters on the surface → a spectrum waterfall. Because it is
one buffer being reshaped rather than four systems being swapped, sections dissolve into
each other instead of cutting.

### Colour is a state machine

Chroma is earned, never decorative:

- **cobalt `#3F6BD8`** — raw, unresolved, low band
- **amber `#FF6A1A`** — detected, active emitter, the brand signal
- **bone `#FFD9A8`** — resolved intelligence, high band

Everything else is near-black, graphite and a warm off-white. About 26% of signal particles
are flagged significant; the rest stay grey dust, because most of the spectrum is noise.

### Narrative position

`Field.computeNp()` maps scroll to `np` against the cached tops of the nine act sections,
measured from the viewport top so act *N* lands exactly as section *N* reaches the top of
the screen. Camera keyframes are authored against `np` rather than one-per-act, which lets
a single act hold several moves — the domain traverse needs four.

## Performance

- One draw call per module; 24 draw calls on desktop, 41 at peak.
- Adaptive resolution: a rolling frame-time average steps the canvas pixel ratio between
  1.75 and 0.75 so weak GPUs trade pixels for frames automatically.
- Low-power devices get ~¼ the particles (7k vs 26k signal, 6k vs 22k globe shell).
- The render loop pauses on `visibilitychange`; the spectrum waterfall canvas runs only
  while it intersects the viewport.
- No post-processing — additive blending and a CSS vignette do the glow, which keeps the
  bundle and the fill cost down.

## Motion and access

- Lenis for inertia, GSAP ScrollTrigger for all scroll storytelling, pinned acts for the
  three transformation sequences.
- `prefers-reduced-motion` disables Lenis, skips every pin, and lays the pinned acts out as
  ordinary stacked sections showing their end state. Nothing is conveyed by animation alone.
- Semantic landmarks, one `h1`, labelled section headings, `role="img"` + `aria-label` on
  every meaningful SVG, a tablist with arrow-key support in Kawa Studio, visible focus
  rings, ≥38px interactive targets, and a skip link.
- The cursor reticle and satellite hover are progressive enhancements — hidden on coarse
  pointers, and the constellation exposes the same data as a scrollable register on mobile.

## Content

Positioning, terminology and technical specifics come from kawaspace.com: the constellation
(18 satellites, 0.5–18 GHz, tuneable on demand), Aura OS, Kawa Studio, MDA / SIGINT / ELINT,
RF GEOINT as a service, and the company's own principles. Numbers shown in the interface
mockups (task IDs, detection counts, coordinates) are illustrative.
