import * as THREE from 'three'
import { S, ACTS, clamp, lerp, damp } from './state'
import {
  R, SAT_COUNT, makeStarfield, makeSensor, makeOrbitRings,
  makeSignalField, makeGlobe, makeConstellation, makeSurface, makeFusion,
  type Mod, type SignalField, type Globe, type Constellation, type Surface, type Fusion,
} from './modules'
import type { EarthMask } from './earthTexture'

/**
 * Camera keyframes, authored against narrative position rather than one per act,
 * so a single act can hold several moves (the domain traverse needs four).
 * `sx` slides the camera laterally after aiming — it pushes the subject off-centre
 * so display type always has clean ground to sit on.
 */
type Key = { np: number; r: number; th: number; ph: number; ty: number; fov: number; sx: number; pitch: number }
const KEYS: Key[] = [
  { np: 0.00, r: 7.60, th: 0.000, ph: 1.52, ty: 0.00, fov: 42, sx:  0.00, pitch: 0.00 }, // hero
  { np: 1.00, r: 10.4, th: 0.440, ph: 1.34, ty: 0.00, fov: 44, sx: -2.30, pitch: 0.00 }, // signal layer
  { np: 2.00, r: 9.80, th: 1.060, ph: 1.26, ty: 0.00, fov: 44, sx: -2.90, pitch: 0.00 }, // processing
  { np: 2.80, r: 8.20, th: 1.700, ph: 1.34, ty: 0.00, fov: 46, sx: -1.40, pitch: 0.16 }, // descent
  { np: 3.04, r: 3.30, th: 1.960, ph: 1.47, ty: 0.00, fov: 54, sx:  0.00, pitch: 0.80 }, // sea
  { np: 3.36, r: 3.24, th: 2.180, ph: 1.45, ty: 0.00, fov: 54, sx:  0.00, pitch: 0.80 }, // land
  { np: 3.64, r: 3.95, th: 2.480, ph: 1.38, ty: 0.00, fov: 50, sx:  0.00, pitch: 0.62 }, // air
  { np: 4.00, r: 8.80, th: 3.700, ph: 1.12, ty: 0.00, fov: 40, sx: -0.50, pitch: 0.00 }, // space
  { np: 5.00, r: 9.80, th: 4.620, ph: 1.06, ty: 0.00, fov: 40, sx: -0.90, pitch: 0.00 }, // constellation out
  { np: 5.60, r: 13.4, th: 5.020, ph: 1.02, ty: 0.00, fov: 38, sx:  2.10, pitch: 0.00 }, // operations
  { np: 6.10, r: 5.10, th: 5.350, ph: 1.44, ty:-0.52, fov: 46, sx:  0.30, pitch: 0.00 }, // fusion
  { np: 6.60, r: 5.80, th: 5.520, ph: 1.42, ty:-0.46, fov: 46, sx:  0.25, pitch: 0.00 }, // fusion hold
  { np: 7.10, r: 10.8, th: 5.960, ph: 1.28, ty: 0.00, fov: 40, sx:  2.20, pitch: 0.00 }, // mission
  { np: 8.00, r: 7.60, th: 6.283, ph: 1.52, ty: 0.00, fov: 42, sx:  0.00, pitch: 0.00 }, // final
]

/** piecewise-linear curve over narrative position */
type Pt = [number, number]
function curve(x: number, pts: Pt[]): number {
  if (x <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]
      const t = (x - x0) / (x1 - x0 || 1)
      return lerp(y0, y1, t * t * (3 - 2 * t))
    }
  }
  return pts[pts.length - 1][1]
}

const C_MORPH: Pt[] = [[0, 0], [1, 1], [2, 2], [5.2, 2], [6.15, 3], [6.9, 3], [7.4, 2], [8, 0]]
const C_RESOLVE: Pt[] = [[0, 0], [0.7, 0.06], [1.15, 0.3], [2, 0.78], [3.6, 0.86], [4.5, 0.96], [5.4, 0.86], [6.4, 1], [7.3, 0.7], [8, 0.32]]
const C_SIGOP: Pt[] = [[0, 0.95], [1, 0.85], [1.6, 0.7], [2.1, 0.34], [2.8, 0.4], [3.1, 0.62], [3.9, 0.7], [4.4, 0.85], [5.2, 0.5], [5.7, 0.16], [6.2, 0.62], [6.9, 0.5], [7.3, 0.26], [8, 0.85]]
const C_GLOBE: Pt[] = [[0, 0], [0.4, 0], [1.05, 0.85], [1.7, 0.85], [2.15, 0.34], [2.75, 0.42], [3.05, 1], [5.2, 1], [5.7, 0.30], [6.15, 0.75], [6.9, 0.7], [7.3, 0.42], [7.9, 0.08], [8, 0.04]]
const C_STARS: Pt[] = [[0, 1], [1.2, 0.7], [2.2, 0.5], [4, 0.55], [5.4, 0.8], [7.2, 0.95], [8, 1]]
const C_SENSOR: Pt[] = [[0, 1], [0.55, 1], [1.35, 0], [7.25, 0], [7.75, 1], [8, 1]]
const C_RINGS: Pt[] = [[0, 1], [0.5, 0.9], [1.2, 0], [7.35, 0], [7.9, 0.7], [8, 0.7]]
// zero-hold pushed well past Pipeline's pinned range (which can run to np~2.85) so a
// quick scroll past this threshold and back can't leave a damped-opacity residue in view there
const C_CONST: Pt[] = [[0, 0], [3.9, 0], [4.15, 1], [5.02, 1], [5.42, 0], [8, 0]]
const C_SURF: Pt[] = [[0, 0], [2.72, 0], [3.02, 1], [3.82, 1], [4.15, 0], [8, 0]]
const C_FUSE_OP: Pt[] = [[0, 0], [5.78, 0], [6.05, 1], [6.72, 1], [7.0, 0], [8, 0]]

export class Field {
  private renderer!: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private cam!: THREE.PerspectiveCamera
  private mods: Mod[] = []
  private sensor!: Mod
  private rings!: Mod
  private signals!: SignalField
  private globe!: Globe
  private constel!: Constellation
  private surface!: Surface
  private fusion!: Fusion
  private sensorGroup = new THREE.Group()
  private sensorHome = new THREE.Vector3(4.30, 0.80, -1.20)

  private raf = 0
  private clock = new THREE.Clock()
  private t = 0
  private np = 0
  private npTarget = 0
  private lastY = 0
  private acts: { id: string; el: HTMLElement; top: number }[] = []
  private running = false
  private dead = false
  private renderPending = true
  /** adaptive resolution — additive points are fill-bound, so trade pixels for frames */
  private dpr = 1
  private dprCap = 1.75
  private ftAvg = 16
  private ftHold = 0

  /** screen-space satellite positions for the DOM hover layer */
  public satScreen: { x: number; y: number; z: number; vis: boolean }[] =
    Array.from({ length: SAT_COUNT }, () => ({ x: 0, y: 0, z: 0, vis: false }))
  public onSatHover: ((i: number) => void) | null = null

  private _v3 = new THREE.Vector3()
  private _right = new THREE.Vector3()
  private _up = new THREE.Vector3()
  private _target = new THREE.Vector3()
  private _px = 0
  private _py = 0

  supported = true

  mount(host: HTMLElement, earthMask?: EarthMask) {
    let gl: THREE.WebGLRenderer
    try {
      gl = new THREE.WebGLRenderer({
        antialias: !S.mobile, alpha: false, powerPreference: 'high-performance',
        stencil: false, depth: true,
      })
    } catch {
      this.supported = false
      return
    }
    this.renderer = gl
    gl.setClearColor(0x050607, 1)
    this.dprCap = Math.min(window.devicePixelRatio || 1, S.mobile ? 1.6 : 1.75)
    this.dpr = this.dprCap
    gl.setPixelRatio(this.dpr)
    S.dpr = gl.getPixelRatio()
    host.appendChild(gl.domElement)
    gl.domElement.setAttribute('aria-hidden', 'true')

    this.cam = new THREE.PerspectiveCamera(42, 1, 0.05, 300)

    const lo = S.mobile
    if (lo) this.sensorHome.set(4.25, 1.00, 0.16)
    const stars = makeStarfield(lo ? 900 : 2600)
    this.globe = makeGlobe(lo ? 6000 : 22000, earthMask)
    this.signals = makeSignalField(lo ? 7000 : 26000)
    this.sensor = makeSensor()
    this.rings = makeOrbitRings()
    this.constel = makeConstellation()

    // domain patch and fusion AOI sit under their respective camera keys
    const dirAt = (np: number) => {
      const k: Key = { ...KEYS[0] }
      this.sampleKey(np, k)
      return new THREE.Vector3(
        Math.sin(k.ph) * Math.cos(k.th), Math.cos(k.ph), Math.sin(k.ph) * Math.sin(k.th))
    }
    const domainDir = dirAt(3.20)
    const fuseDir = dirAt(6.10)
    this.surface = makeSurface(lo ? 76 : 156, domainDir)
    this.fusion = makeFusion(fuseDir)

    // the spectrum waterfall formation lands on the fusion AOI
    const tu = new THREE.Vector3(0, 1, 0).cross(fuseDir).normalize()
    const tv = new THREE.Vector3().copy(fuseDir).cross(tu).normalize()
    this.signals.setTangent(fuseDir.clone().multiplyScalar(R + 0.62), tu, tv)

    // sensor + rings ride with the globe frame so hero framing never drifts
    this.sensorGroup.add(this.sensor.obj)
    this.sensor.obj.add(this.rings.obj)
    this.sensorGroup.position.copy(this.sensorHome)

    this.globe.group.add(this.sensorGroup, this.signals.obj, this.surface.obj, this.fusion.obj)
    this.scene.add(stars.obj, this.globe.group, this.constel.obj)
    this.mods = [stars, this.sensor, this.rings, this.signals, this.globe, this.constel, this.surface, this.fusion]

    gl.domElement.addEventListener('webglcontextlost', this.onLost)
    gl.domElement.addEventListener('webglcontextrestored', this.onRestored)

    this.resize()
    this.measure()
    this.start()
  }

  private onLost = (e: Event) => { e.preventDefault(); this.running = false }
  private onRestored = () => { this.renderPending = true; this.start() }

  registerActs(list: { id: string; el: HTMLElement }[]) {
    this.acts = list.map((a) => ({ ...a, top: 0 }))
    this.measure()
  }

  measure() {
    if (!this.acts.length) return
    const sy = window.scrollY || window.pageYOffset
    for (const a of this.acts) a.top = a.el.getBoundingClientRect().top + sy
    this.renderPending = true
  }

  resize() {
    if (!this.renderer) return
    S.w = window.innerWidth
    S.h = window.innerHeight
    this.dprCap = Math.min(window.devicePixelRatio || 1, S.mobile ? 1.6 : 1.75)
    this.dpr = Math.min(this.dpr, this.dprCap)
    this.renderer.setPixelRatio(this.dpr)
    S.dpr = this.renderer.getPixelRatio()
    this.renderer.setSize(S.w, S.h, false)
    this.cam.aspect = S.w / S.h
    this.cam.updateProjectionMatrix()
    this.renderPending = true
  }

  /**
   * Narrative position 0..8 — continuous and monotonic with scroll.
   * Measured from the viewport top so act N is reached exactly when section N
   * arrives at the top of the screen, and a cold load starts at 0.
   */
  private computeNp() {
    const y = window.scrollY || window.pageYOffset
    const a = this.acts
    if (!a.length || y <= a[0].top) return 0
    for (let i = 0; i < a.length - 1; i++) {
      if (y < a[i + 1].top) {
        const span = a[i + 1].top - a[i].top || 1
        return i + clamp((y - a[i].top) / span)
      }
    }
    const last = a.length - 1
    const docH = document.documentElement.scrollHeight
    const span = Math.max(1, docH - S.h - a[last].top)
    return last + clamp((y - a[last].top) / span)
  }

  private sampleKey(np: number, out: Key) {
    let i = 0
    while (i < KEYS.length - 2 && np >= KEYS[i + 1].np) i++
    const A = KEYS[i], B = KEYS[i + 1]
    const f = clamp((np - A.np) / (B.np - A.np || 1))
    const e = f * f * (3 - 2 * f)
    out.r = lerp(A.r, B.r, e); out.th = lerp(A.th, B.th, e)
    out.ph = lerp(A.ph, B.ph, e); out.ty = lerp(A.ty, B.ty, e)
    out.fov = lerp(A.fov, B.fov, e); out.sx = lerp(A.sx, B.sx, e)
    out.pitch = lerp(A.pitch, B.pitch, e)
  }

  private key: Key = { ...KEYS[0] }

  private frame = () => {
    if (this.dead) return
    this.raf = requestAnimationFrame(this.frame)
    if (!this.running) return

    const dt = Math.min(this.clock.getDelta(), 0.05)
    if (!S.reduced) this.t += dt

    // --- scroll ---------------------------------------------------------
    const y = window.scrollY || window.pageYOffset
    const rawVel = clamp((y - this.lastY) / Math.max(dt, 0.001) / 2600, -1, 1)
    this.lastY = y
    S.vel = damp(S.vel, rawVel, 6, dt)
    this.npTarget = this.computeNp()
    const prevNp = this.np
    this.np = damp(this.np, this.npTarget, S.reduced ? 40 : 6.5, dt)
    S.p = this.np / KEYS[KEYS.length - 1].np
    S.ps = S.p
    S.current = ACTS[clamp(Math.round(this.np), 0, ACTS.length - 1)]

    if (S.reduced && Math.abs(this.np - prevNp) < 0.0002 && Math.abs(S.vel) < 0.002 && !this.renderPending) return

    const np = this.np

    // --- pointer parallax ----------------------------------------------
    S.mx = damp(S.mx, S.tmx, 3.2, dt)
    S.my = damp(S.my, S.tmy, 3.2, dt)

    // --- camera ----------------------------------------------------------
    this.sampleKey(np, this.key)
    const spin = this.globe.group.rotation.y
    const th = this.key.th + spin
    const ph = this.key.ph
    const par = S.reduced ? 0 : (S.mobile ? 0.05 : 0.16)
    this._px = damp(this._px, S.mx * par, 3, dt)
    this._py = damp(this._py, S.my * par, 3, dt)

    const r = this.key.r * (1 + Math.sin(this.t * 0.11) * 0.006)
    this.cam.position.set(
      r * Math.sin(ph - this._py * 0.5) * Math.cos(th + this._px),
      r * Math.cos(ph - this._py * 0.5) + Math.sin(this.t * 0.17) * 0.02,
      r * Math.sin(ph - this._py * 0.5) * Math.sin(th + this._px)
    )
    this._target.set(0, this.key.ty, 0)
    this.cam.lookAt(this._target)
    // on the deck, tilt from nadir toward the limb so the horizon reads
    if (this.key.pitch > 0.001) this.cam.rotateX(this.key.pitch)
    // slide the subject off-centre so display type keeps clean ground
    if (!S.mobile) this.cam.translateX(this.key.sx)
    else this.cam.translateY(this.key.sx * 0.22)
    // a touch of roll keeps the horizon from feeling mechanical
    this.cam.rotateZ(Math.sin(this.t * 0.08) * 0.006 + this._px * 0.05)
    // portrait viewports need a wider field or the subject never fits the frame
    const fov = this.key.fov * (S.mobile ? 1.22 : 1)
    if (Math.abs(this.cam.fov - fov) > 0.01) {
      this.cam.fov = fov
      this.cam.updateProjectionMatrix()
    }

    // --- narrative → modules --------------------------------------------
    this.signals.setMorph(curve(np, C_MORPH))
    this.signals.setResolve(curve(np, C_RESOLVE))
    this.signals.setOpacity(curve(np, C_SIGOP))
    this.globe.setOpacity(curve(np, C_GLOBE))
    this.constel.setOpacity(curve(np, C_CONST))
    this.constel.setActive(clamp((np - 3.9) / 0.5))
    this.surface.setOpacity(curve(np, C_SURF))
    this.surface.setDomain(clamp((np - 3.04) * 3.4, 0, 3))
    this.fusion.setOpacity(curve(np, C_FUSE_OP))
    this.fusion.setFuse(clamp((np - 6.12) / 0.62))

    const sOp = curve(np, C_SENSOR)
    this.sensorGroup.visible = sOp > 0.01
    this.sensorGroup.scale.setScalar(lerp(0.16, 1, sOp) * (S.mobile ? 0.62 : 1))
    this.sensorGroup.position.copy(this.sensorHome).multiplyScalar(lerp(1.55, 1, sOp))
    this.rings.obj.scale.setScalar(lerp(3.4, 1, curve(np, C_RINGS)) * (S.mobile ? 0.62 : 1))
    ;(this.rings.obj as any).visible = curve(np, C_RINGS) > 0.02
    const starOp = curve(np, C_STARS)
    ;((this.mods[0].obj as THREE.Points).material as THREE.ShaderMaterial).uniforms.uOpacity.value = starOp

    for (const m of this.mods) m.update(dt, this.t, np)

    // --- satellite screen projection (hover targets) ---------------------
    if (!S.mobile && np > 3.5 && np < 6) {
      let best = -1, bestD = 0.06
      const R2 = R * R
      for (let i = 0; i < SAT_COUNT; i++) {
        const sp = this.constel.positions[i]
        this._v3.copy(sp).project(this.cam)
        const s = this.satScreen[i]
        s.x = (this._v3.x * 0.5 + 0.5) * S.w
        s.y = (-this._v3.y * 0.5 + 0.5) * S.h
        s.z = this._v3.z
        // horizon test: a point at radius >= R is above Earth's limb iff dot(P, C) >= R^2
        s.vis = this._v3.z < 1 && sp.dot(this.cam.position) >= R2
        if (!s.vis) continue
        const d = Math.hypot(this._v3.x - S.tmx, this._v3.y - S.tmy)
        if (d < bestD) { bestD = d; best = i }
      }
      if (best !== S.hoverSat) { S.hoverSat = best; this.onSatHover?.(best) }
    } else if (S.hoverSat !== -1) {
      S.hoverSat = -1; this.onSatHover?.(-1)
    }

    this.renderer.render(this.scene, this.cam)
    this.renderPending = false

    if (!S.reduced) {
      this.ftAvg = this.ftAvg * 0.92 + dt * 1000 * 0.08
      this.ftHold++
      if (this.ftHold > 25) {
        if (this.ftAvg > 23 && this.dpr > 0.75) {
          this.dpr = Math.max(0.75, this.dpr - 0.25)
          this.renderer.setPixelRatio(this.dpr); S.dpr = this.dpr; this.ftHold = 0
        } else if (this.ftAvg < 13 && this.dpr < this.dprCap) {
          this.dpr = Math.min(this.dprCap, this.dpr + 0.25)
          this.renderer.setPixelRatio(this.dpr); S.dpr = this.dpr; this.ftHold = 0
        }
      }
    }
  }

  start() {
    if (this.dead || this.running) return
    this.running = true
    this.clock.getDelta()
    if (!this.raf) this.raf = requestAnimationFrame(this.frame)
  }
  pause() { this.running = false }

  dispose() {
    this.dead = true
    cancelAnimationFrame(this.raf)
    this.mods.forEach((m) => m.dispose())
    if (this.renderer) {
      this.renderer.domElement.removeEventListener('webglcontextlost', this.onLost)
      this.renderer.domElement.removeEventListener('webglcontextrestored', this.onRestored)
      this.renderer.dispose()
      this.renderer.domElement.remove()
    }
  }
}
