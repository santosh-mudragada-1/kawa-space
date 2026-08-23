import * as THREE from 'three'
import { NOISE, RAMP, DISC } from './glsl'
import { S, clamp, lerp } from './state'
import { sampleMask, type EarthMask } from './earthTexture'

/** Earth radius in world units. Everything else is measured against this. */
export const R = 2.6
export const ORBIT_R = R * 1.33
export const SAT_COUNT = 18

export interface Mod {
  obj: THREE.Object3D
  update(dt: number, t: number, np: number): void
  dispose(): void
}

const disposeTree = (o: THREE.Object3D) => {
  o.traverse((c: any) => {
    if (c.geometry) c.geometry.dispose()
    if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m: any) => m.dispose())
  })
}

/* ============================================================
   STARFIELD — depth continuity. Present in every act.
   ============================================================ */
export function makeStarfield(count: number): Mod {
  const pos = new Float32Array(count * 3)
  const attr = new Float32Array(count * 2) // size, twinkle phase
  for (let i = 0; i < count; i++) {
    // shell between 40 and 120 units — far enough to feel infinite
    const r = 40 + Math.pow(Math.random(), 0.6) * 80
    const th = Math.random() * Math.PI * 2
    const ph = Math.acos(2 * Math.random() - 1)
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th)
    pos[i * 3 + 1] = r * Math.cos(ph)
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th)
    attr[i * 2] = Math.pow(Math.random(), 3) * 2.1 + 0.30
    attr[i * 2 + 1] = Math.random() * Math.PI * 2
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aData', new THREE.BufferAttribute(attr, 2))

  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDpr: { value: 1 }, uOpacity: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec2 aData;
      uniform float uTime, uDpr;
      varying float vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.72 + 0.28 * sin(uTime * 0.5 + aData.y);
        vA = tw;
        gl_PointSize = clamp(aData.x * uDpr * (110.0 / max(-mv.z, 1.0)), 0.0, 7.0 * uDpr);
      }`,
    fragmentShader: /* glsl */ `
      ${DISC}
      uniform float uOpacity;
      varying float vA;
      void main(){
        float a = disc(gl_PointCoord, 0.9);
        if (a < 0.01) discard;
        gl_FragColor = vec4(vec3(0.86, 0.88, 0.92), a * vA * 0.9 * uOpacity);
      }`,
  })

  const obj = new THREE.Points(g, mat)
  obj.frustumCulled = false
  obj.renderOrder = -10
  return {
    obj,
    update(_dt, t) {
      mat.uniforms.uTime.value = t
      mat.uniforms.uDpr.value = S.dpr
      obj.rotation.y = t * 0.0035
    },
    dispose() { disposeTree(obj) },
  }
}

/* ============================================================
   SENSOR — the abstract collection object. Hero + final act.
   Built from edges and thin lines: an instrument, not a spaceship.
   ============================================================ */
export function makeSensor(): Mod {
  const obj = new THREE.Group()
  const inner = new THREE.Group()
  obj.add(inner)

  const lineMat = (op: number, col = 0xe9e7e1) =>
    new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false })

  // spine: elongated hexagonal bus
  const bus = new THREE.CylinderGeometry(0.17, 0.17, 1.15, 6, 1, true)
  const busEdges = new THREE.LineSegments(new THREE.EdgesGeometry(bus, 1), lineMat(0.5))
  busEdges.rotation.z = Math.PI / 2
  inner.add(busEdges)
  bus.dispose()

  // ribs along the bus
  for (let i = -2; i <= 2; i++) {
    const ring = new THREE.RingGeometry(0.185, 0.19, 6)
    const m = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({
      color: 0xe9e7e1, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false,
    }))
    m.rotation.y = Math.PI / 2
    m.position.x = i * 0.26
    inner.add(m)
  }

  // deployable apertures (solar / antenna planes) — grid shader, no texture
  const panelGeo = new THREE.PlaneGeometry(1.34, 0.46, 1, 1)
  const panelMat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: { uOp: { value: 1 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; uniform float uOp, uTime;
      void main(){
        vec2 g = abs(fract(vUv * vec2(9.0, 3.0)) - 0.5);
        float line = 1.0 - smoothstep(0.0, 0.06, min(g.x, g.y));
        float edge = 1.0 - smoothstep(0.47, 0.5, max(abs(vUv.x-0.5), abs(vUv.y-0.5)));
        float scan = 0.6 + 0.4 * sin(vUv.x * 14.0 - uTime * 1.1);
        float a = line * 0.22 * scan + 0.022;
        gl_FragColor = vec4(vec3(0.80, 0.83, 0.87), a * uOp);
      }`,
  })
  const pL = new THREE.Mesh(panelGeo, panelMat); pL.position.x = -1.02
  const pR = new THREE.Mesh(panelGeo, panelMat); pR.position.x = 1.02
  inner.add(pL, pR)

  // panel outlines
  ;[-1.02, 1.02].forEach((x) => {
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(panelGeo), lineMat(0.4))
    e.position.x = x
    inner.add(e)
  })

  // collection aperture — parabolic dish, wireframe, aimed down
  const dish = new THREE.SphereGeometry(0.34, 22, 8, 0, Math.PI * 2, 0, Math.PI * 0.34)
  const dishWire = new THREE.LineSegments(new THREE.WireframeGeometry(dish), lineMat(0.24, 0xffd9a8))
  dishWire.rotation.x = Math.PI
  dishWire.position.y = -0.24
  inner.add(dishWire)
  dish.dispose()

  // boresight — where the instrument is looking
  const bore = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.24, 0), new THREE.Vector3(0, -3.4, 0)])
  const boreLine = new THREE.Line(bore, new THREE.LineBasicMaterial({
    color: 0xff6a1a, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending,
  }))
  inner.add(boreLine)

  // status beacons
  const bGeo = new THREE.BufferGeometry()
  bGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0.62, 0.0, 0.0, -0.62, 0.0, 0.0, 0.0, 0.2, 0.0,
  ]), 3))
  bGeo.setAttribute('aPh', new THREE.BufferAttribute(new Float32Array([0, 2.1, 4.2]), 1))
  const beaconMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uDpr: { value: 1 }, uOp: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aPh; uniform float uTime, uDpr; varying float vP;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_Position = projectionMatrix * mv;
        vP = 0.35 + 0.65 * pow(abs(sin(uTime*1.6 + aPh)), 6.0);
        gl_PointSize = clamp(uDpr * (11.0 / max(-mv.z,0.6)) * (1.0 + vP), 0.0, 9.0 * uDpr);
      }`,
    fragmentShader: /* glsl */ `
      ${DISC} uniform float uOp; varying float vP;
      void main(){ float a = disc(gl_PointCoord, 1.0); if(a<0.01) discard;
        gl_FragColor = vec4(vec3(1.0,0.42,0.10), a*vP*uOp); }`,
  })
  inner.add(new THREE.Points(bGeo, beaconMat))

  obj.scale.setScalar(0.34)

  return {
    obj,
    update(_dt, t) {
      panelMat.uniforms.uTime.value = t
      beaconMat.uniforms.uTime.value = t
      beaconMat.uniforms.uDpr.value = S.dpr
      // slow, deliberate attitude drift — never a spin
      inner.rotation.y = Math.sin(t * 0.13) * 0.42 + t * 0.045
      inner.rotation.x = Math.sin(t * 0.09) * 0.14
      inner.rotation.z = Math.cos(t * 0.07) * 0.09
    },
    dispose() { disposeTree(obj); panelMat.dispose(); beaconMat.dispose() },
  }
}

/* ============================================================
   ORBIT RINGS — faint coordinate geometry around the sensor.
   ============================================================ */
export function makeOrbitRings(): Mod {
  const obj = new THREE.Group()
  const mats: THREE.ShaderMaterial[] = []
  const cfg = [
    { r: 1.55, rx: 1.42, ry: 0.2, op: 1.0 },
    { r: 2.45, rx: 1.1, ry: -0.5, op: 0.72 },
    { r: 3.7, rx: 1.75, ry: 0.9, op: 0.46 },
  ]
  cfg.forEach(({ r, rx, ry, op }, i) => {
    const N = 220
    const p = new Float32Array(N * 3)
    const u = new Float32Array(N)
    for (let j = 0; j < N; j++) {
      const a = (j / N) * Math.PI * 2
      p[j * 3] = Math.cos(a) * r; p[j * 3 + 1] = 0; p[j * 3 + 2] = Math.sin(a) * r
      u[j] = j / N
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('aU', new THREE.BufferAttribute(u, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uOp: { value: op }, uSeed: { value: i * 1.7 } },
      vertexShader: `attribute float aU; varying float vU; void main(){ vU=aU; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        varying float vU; uniform float uTime, uOp, uSeed;
        void main(){
          float dash = step(0.45, fract(vU * 64.0));
          float sweep = pow(max(0.0, sin((vU - uTime*0.055 - uSeed) * 6.2831)), 14.0);
          vec3 c = mix(vec3(0.78,0.80,0.84), vec3(1.0,0.42,0.10), sweep);
          gl_FragColor = vec4(c, (dash * 0.30 + sweep * 1.0) * uOp);
        }`,
    })
    mats.push(m)
    const line = new THREE.LineLoop(g, m)
    line.rotation.x = rx; line.rotation.y = ry
    obj.add(line)
  })

  return {
    obj,
    update(_dt, t) {
      mats.forEach((m) => (m.uniforms.uTime.value = t))
      obj.rotation.y = t * 0.02
    },
    dispose() { disposeTree(obj); mats.forEach((m) => m.dispose()) },
  }
}

/* ============================================================
   SIGNAL FIELD — one particle system, four formations.
   Atmospheric dust → signals in transit → emitters on the surface
   → spectrum waterfall. The whole narrative runs through one
   uniform (uMorph), which is what makes the page feel continuous.
   ============================================================ */
export interface SignalField extends Mod {
  setMorph(v: number): void
  setResolve(v: number): void
  setOpacity(v: number): void
  setTangent(origin: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3): void
}

export function makeSignalField(count: number): SignalField {
  const f0 = new Float32Array(count * 3)   // dust shell
  const f2 = new Float32Array(count * 3)   // surface emitters
  const data = new Float32Array(count * 4) // seed, band, delay, size
  const grid = new Float32Array(count * 2) // waterfall cell

  const gw = Math.ceil(Math.sqrt(count))
  const GA = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i++) {
    // dust: hollow shell, denser near the sensor's working volume
    const dr = 2.0 + Math.pow(Math.random(), 0.75) * 15
    const dt = Math.random() * Math.PI * 2
    const dp = Math.acos(2 * Math.random() - 1)
    f0[i * 3] = dr * Math.sin(dp) * Math.cos(dt)
    f0[i * 3 + 1] = dr * Math.cos(dp) * 0.72
    f0[i * 3 + 2] = dr * Math.sin(dp) * Math.sin(dt)

    // emitters: fibonacci distribution, deterministic and even
    const y = 1 - (i / (count - 1)) * 2
    const rad = Math.sqrt(Math.max(0, 1 - y * y))
    const th = GA * i
    f2[i * 3] = Math.cos(th) * rad * R * 1.004
    f2[i * 3 + 1] = y * R * 1.004
    f2[i * 3 + 2] = Math.sin(th) * rad * R * 1.004

    data[i * 4] = Math.random()
    data[i * 4 + 1] = Math.random()                 // frequency band
    data[i * 4 + 2] = Math.random()                 // detection stagger
    data[i * 4 + 3] = 0.35 + Math.pow(Math.random(), 2.4) * 1.15

    grid[i * 2] = ((i % gw) / (gw - 1)) * 2 - 1
    grid[i * 2 + 1] = (Math.floor(i / gw) / (gw - 1)) * 2 - 1
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(f0, 3))
  g.setAttribute('aF2', new THREE.BufferAttribute(f2, 3))
  g.setAttribute('aData', new THREE.BufferAttribute(data, 4))
  g.setAttribute('aGrid', new THREE.BufferAttribute(grid, 2))
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40)

  const uniforms = {
    uTime: { value: 0 }, uDpr: { value: 1 },
    uMorph: { value: 0 }, uResolve: { value: 0 },
    uOpacity: { value: 1 }, uNoise: { value: 1 }, uVel: { value: 0 },
    uR: { value: R },
    uTanO: { value: new THREE.Vector3(0, 0, R * 1.25) },
    uTanU: { value: new THREE.Vector3(1, 0, 0) },
    uTanV: { value: new THREE.Vector3(0, 1, 0) },
  }

  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, depthTest: true,
    vertexShader: /* glsl */ `
      ${NOISE}
      attribute vec3 aF2; attribute vec4 aData; attribute vec2 aGrid;
      uniform float uTime, uDpr, uMorph, uResolve, uNoise, uVel, uR;
      uniform vec3 uTanO, uTanU, uTanV;
      varying float vBand, vRes, vPing, vFade, vFace, vSig;

      void main(){
        float seed = aData.x, band = aData.y, delay = aData.z, sz = aData.w;
        vec3 nrm = normalize(aF2);

        // F1 — signal in transit: lifted off the surface along its own normal
        float lift = 0.30 + seed * 2.9;
        vec3 f1 = nrm * (uR + lift);

        // F3 — spectrum waterfall on a plane tangent to the area of interest
        float rowT = fract(aGrid.y * 0.5 + 0.5 - uTime * 0.045);
        vec3 f3 = uTanO + uTanU * (aGrid.x * 1.85) + uTanV * ((rowT - 0.5) * 2.4)
                + nrm * (band * 0.22);

        vec3 p;
        float m = uMorph;
        if (m < 1.0)      p = mix(position, f1,  smoothstep(0.0, 1.0, m));
        else if (m < 2.0) p = mix(f1, aF2,       smoothstep(0.0, 1.0, m - 1.0));
        else              p = mix(aF2, f3,       smoothstep(0.0, 1.0, clamp(m - 2.0, 0.0, 1.0)));

        // travel: during the transit formation, signals fall toward the surface
        float transit = 1.0 - abs(clamp(m, 0.0, 2.0) - 1.0);
        float fall = fract(seed + uTime * (0.06 + band * 0.10));
        p -= nrm * transit * fall * lift * 0.92;

        // atmospheric noise — rises with scroll velocity. Motion means uncertainty.
        float jit = uNoise * (0.05 + abs(uVel) * 0.6);
        p += vec3(
          fbm(p * 0.34 + uTime * 0.06 + seed * 10.0),
          fbm(p * 0.34 + 31.7 - uTime * 0.05),
          fbm(p * 0.34 + 73.1 + uTime * 0.04)
        ) * jit;

        vec3 wp = (modelMatrix * vec4(p, 1.0)).xyz;
        vec3 wn = normalize(mat3(modelMatrix) * nrm);
        float onSurf = 1.0 - abs(clamp(m, 1.0, 3.0) - 2.0);
        vFace = mix(1.0, pow(clamp(dot(wn, normalize(cameraPosition - wp)), 0.0, 1.0), 0.5), onSurf * 0.92);

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;

        vSig = step(0.74, seed);          // ~26% are emitters; the rest stay noise
        vRes  = clamp((uResolve - delay * 0.55) / 0.45, 0.0, 1.0);
        vBand = band;
        vPing = pow(fract(uTime * 0.21 + delay + seed * 0.3), 22.0) * mix(0.30, 1.0, step(1.35, m));
        vFade = 1.0 - transit * fall * 0.55;

        float ps = sz * uDpr * (1.0 + vSig * 0.35 + vRes * 0.5 + vPing * 1.8) * (38.0 / max(-mv.z, 0.6));
        gl_PointSize = clamp(ps, 0.0, 11.0 * uDpr);
      }`,
    fragmentShader: /* glsl */ `
      ${RAMP} ${DISC}
      uniform float uOpacity;
      varying float vBand, vRes, vPing, vFade, vFace, vSig;
      void main(){
        float a = disc(gl_PointCoord, 0.85);
        if (a < 0.008) discard;
        vec3 c = ramp(mix(0.04, 0.52 + vBand * 0.46, vRes * vSig));
        // unresolved energy reads as dust, not as colour — chroma is earned
        c = mix(vec3(0.19, 0.22, 0.26), c, 0.18 + 0.82 * vRes * vSig);
        c = mix(c, vec3(1.0, 0.93, 0.84), vPing * (0.22 + 0.5 * vSig));
        float alpha = a * uOpacity * vFade * vFace
          * (0.075 + vRes * (0.10 + vSig * 0.42) + vPing * (0.16 + vSig * 0.45));
        gl_FragColor = vec4(c, alpha);
      }`,
  })

  const obj = new THREE.Points(g, mat)
  obj.frustumCulled = false
  obj.renderOrder = 4

  let morph = 0, resolve = 0, op = 1
  return {
    obj,
    setMorph(v) { morph = v },
    setResolve(v) { resolve = v },
    setOpacity(v) { op = v },
    setTangent(o, u, v) {
      uniforms.uTanO.value.copy(o); uniforms.uTanU.value.copy(u); uniforms.uTanV.value.copy(v)
    },
    update(dt, t) {
      const u = uniforms
      u.uTime.value = t
      u.uDpr.value = S.dpr
      u.uMorph.value = lerp(u.uMorph.value, morph, 1 - Math.exp(-4.5 * dt))
      u.uResolve.value = lerp(u.uResolve.value, resolve, 1 - Math.exp(-3.2 * dt))
      u.uOpacity.value = lerp(u.uOpacity.value, op, 1 - Math.exp(-5 * dt))
      u.uVel.value = lerp(u.uVel.value, S.vel, 1 - Math.exp(-6 * dt))
      obj.rotation.y = t * 0.008
    },
    dispose() { disposeTree(obj) },
  }
}

/* ============================================================
   GLOBE — abstract Earth. Graticule + a point shell whose density
   traces procedural landmass. No imagery, no textures.
   ============================================================ */
export interface Globe extends Mod {
  setOpacity(v: number): void
  group: THREE.Group
}

/**
 * Cheap layered-sine stand-in for real coastlines — only used if the mask image
 * fails to decode, so it just needs to look like *something*, not be accurate.
 */
function fallbackLand(x: number, y: number, z: number): number {
  const v = Math.sin(x * 1.7 + y * 2.3) * 0.5 + Math.sin(y * 2.1 - z * 1.9) * 0.35 + Math.sin(z * 3.1 + x * 1.3) * 0.4
  return clamp(v * 0.5 + 0.5, 0, 1)
}

/**
 * Point *placement*, not just point colour, has to trace the coastline — recolouring
 * a uniformly-distributed sphere reads as noise, not continents. So candidates are
 * drawn from an oversized Fibonacci lattice and rejection-sampled against the mask:
 * land keeps ~96% of candidates, ocean keeps a light ~5.5% dusting for sphere form.
 * That concentrates real point density onto landmass before any shading happens.
 */
function buildShell(shellCount: number, mask?: EarthMask) {
  const GA = Math.PI * (3 - Math.sqrt(5))
  const oversample = mask ? 6 : 1
  const N = shellCount * oversample
  const accepted: { x: number; y: number; z: number; land: number }[] = []
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2
    const rad = Math.sqrt(Math.max(0, 1 - y * y))
    const th = GA * i
    const x = Math.cos(th) * rad
    const z = Math.sin(th) * rad
    let land = 0.5
    if (mask) {
      const lon = Math.atan2(z, x)
      const lat = Math.asin(clamp(y, -1, 1))
      const u = 0.5 - lon / (Math.PI * 2)
      const v = 0.5 - lat / Math.PI
      land = sampleMask(mask, u, v)
      if (Math.random() >= (land > 0.5 ? 0.96 : 0.055)) continue
    } else {
      land = fallbackLand(x, y, z)
    }
    accepted.push({ x, y, z, land })
  }
  if (accepted.length <= shellCount) return accepted
  const out: typeof accepted = []
  const stride = accepted.length / shellCount
  for (let k = 0; k < shellCount; k++) out.push(accepted[Math.floor(k * stride)])
  return out
}

export function makeGlobe(shellCount: number, mask?: EarthMask): Globe {
  const group = new THREE.Group()

  // occluder — keeps the far hemisphere from bleeding through additive points
  const occ = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.985, 128, 96),
    new THREE.MeshBasicMaterial({ color: 0x040506 })
  )
  occ.renderOrder = 0
  occ.scale.setScalar(0.001)
  group.add(occ)

  // graticule — the instrument's coordinate frame
  const pts: THREE.Vector3[] = []
  const SEG = 96
  for (let lat = -60; lat <= 60; lat += 30) {
    const ph = THREE.MathUtils.degToRad(90 - lat)
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.sin(ph) * Math.cos(a0), Math.cos(ph), Math.sin(ph) * Math.sin(a0)).multiplyScalar(R * 1.001))
      pts.push(new THREE.Vector3(Math.sin(ph) * Math.cos(a1), Math.cos(ph), Math.sin(ph) * Math.sin(a1)).multiplyScalar(R * 1.001))
    }
  }
  for (let lon = 0; lon < 360; lon += 30) {
    const th = THREE.MathUtils.degToRad(lon)
    for (let i = 0; i < SEG / 2; i++) {
      const p0 = (i / (SEG / 2)) * Math.PI, p1 = ((i + 1) / (SEG / 2)) * Math.PI
      pts.push(new THREE.Vector3(Math.sin(p0) * Math.cos(th), Math.cos(p0), Math.sin(p0) * Math.sin(th)).multiplyScalar(R * 1.001))
      pts.push(new THREE.Vector3(Math.sin(p1) * Math.cos(th), Math.cos(p1), Math.sin(p1) * Math.sin(th)).multiplyScalar(R * 1.001))
    }
  }
  const gratMat = new THREE.LineBasicMaterial({ color: 0x9fb2bd, transparent: true, opacity: 0.06, depthWrite: false })
  const grat = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), gratMat)
  grat.renderOrder = 1
  group.add(grat)

  // shell — point placement itself traces the mask; shading only adds depth on top
  const shellPts = buildShell(shellCount, mask)
  const shN = shellPts.length
  const sp = new Float32Array(shN * 3)
  const sd = new Float32Array(shN)
  const sl = new Float32Array(shN)
  for (let i = 0; i < shN; i++) {
    const p = shellPts[i]
    sp[i * 3] = p.x * R
    sp[i * 3 + 1] = p.y * R
    sp[i * 3 + 2] = p.z * R
    sd[i] = Math.random()
    sl[i] = p.land
  }
  const sg = new THREE.BufferGeometry()
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3))
  sg.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1))
  sg.setAttribute('aLand', new THREE.BufferAttribute(sl, 1))

  const shellMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uDpr: { value: 1 }, uOp: { value: 0 },
      uSun: { value: new THREE.Vector3(0.62, 0.34, 0.71).normalize() } },
    vertexShader: /* glsl */ `
      attribute float aSeed, aLand; uniform float uTime, uDpr; uniform vec3 uSun;
      varying float vLand, vS, vFace, vLit;
      void main(){
        vLand = aLand;
        vS = aSeed;
        vec3 n = normalize(position);
        vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
        vec3 wn = normalize(mat3(modelMatrix) * n);
        // grazing points pile up at the limb — fade them so the sphere gains form
        vFace = pow(clamp(dot(wn, normalize(cameraPosition - wp)), 0.0, 1.0), 0.55);
        vLit = clamp(dot(wn, uSun) * 0.6 + 0.44, 0.0, 1.0);
        vec4 mv = modelViewMatrix * vec4(position * (1.0 + vLand * 0.004), 1.0);
        gl_Position = projectionMatrix * mv;
        float sizeBase = mix(0.85, 2.5, vLand);
        gl_PointSize = clamp(uDpr * sizeBase * (0.45 + 0.55 * vFace) * (26.0 / max(-mv.z, 0.6)), 0.0, mix(3.0, 9.0, vLand) * uDpr);
      }`,
    fragmentShader: /* glsl */ `
      ${DISC}
      uniform float uOp, uTime; varying float vLand, vS, vFace, vLit;
      void main(){
        float a = disc(gl_PointCoord, 1.0);
        if (a < 0.02) discard;
        vec3 water = vec3(0.09, 0.13, 0.20);
        vec3 land  = vec3(0.93, 0.90, 0.85);
        vec3 c = mix(water, land, vLand);
        float sh = 0.88 + 0.12 * sin(vS * 30.0 + uTime * 0.3);
        float alpha = a * uOp * mix(0.05, 0.80, vLand) * sh * vFace * (0.35 + 0.65 * vLit);
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(c, alpha);
      }`,
  })
  const shell = new THREE.Points(sg, shellMat)
  shell.renderOrder = 2
  group.add(shell)

  // limb — atmosphere read as a fresnel rim, not a glow sprite
  const limbMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { uOp: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN, vP;
      void main(){ vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz;
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      uniform float uOp; varying vec3 vN, vP;
      void main(){
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(-vP))), 2.7);
        vec3 c = mix(vec3(0.24,0.36,0.58), vec3(0.70,0.80,0.92), f);
        gl_FragColor = vec4(c, smoothstep(0.0, 1.0, f) * 0.5 * uOp);
      }`,
  })
  const limb = new THREE.Mesh(new THREE.SphereGeometry(R * 1.085, 128, 96), limbMat)
  limb.renderOrder = 3
  group.add(limb)

  let op = 0
  const obj = group
  return {
    obj, group,
    setOpacity(v) { op = v },
    update(dt, t) {
      const k = 1 - Math.exp(-4 * dt)
      shellMat.uniforms.uOp.value = lerp(shellMat.uniforms.uOp.value, op, k)
      shellMat.uniforms.uTime.value = t
      shellMat.uniforms.uDpr.value = S.dpr
      limbMat.uniforms.uOp.value = lerp(limbMat.uniforms.uOp.value, op, k)
      gratMat.opacity = lerp(gratMat.opacity, op * 0.075, k)
      const s = lerp(occ.scale.x, clamp(op * 3, 0.001, 1), k)
      occ.scale.setScalar(s)
      group.rotation.y = t * 0.0125
    },
    dispose() { disposeTree(group) },
  }
}

/* ============================================================
   CONSTELLATION — 18 spacecraft, three planes, live collection.
   ============================================================ */
export interface Constellation extends Mod {
  setOpacity(v: number): void
  setActive(v: number): void
  positions: THREE.Vector3[]
}

export function makeConstellation(): Constellation {
  const group = new THREE.Group()
  const PLANES = [
    { inc: 0.785, raan: 0.0, rate: 0.075 },
    { inc: 1.518, raan: 1.05, rate: -0.062 },
    { inc: 0.384, raan: 2.20, rate: 0.089 },
  ]
  const PER = SAT_COUNT / PLANES.length
  const planeMat = new THREE.Matrix4()
  const planeMats: THREE.Matrix4[] = PLANES.map(({ inc, raan }) =>
    new THREE.Matrix4().makeRotationY(raan).multiply(new THREE.Matrix4().makeRotationX(inc))
  )

  // orbital paths
  const pathMats: THREE.ShaderMaterial[] = []
  PLANES.forEach((_, i) => {
    const N = 200
    const p = new Float32Array(N * 3), u = new Float32Array(N)
    const v = new THREE.Vector3()
    for (let j = 0; j < N; j++) {
      const a = (j / N) * Math.PI * 2
      v.set(Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R).applyMatrix4(planeMats[i])
      p[j * 3] = v.x; p[j * 3 + 1] = v.y; p[j * 3 + 2] = v.z
      u[j] = j / N
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('aU', new THREE.BufferAttribute(u, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uOp: { value: 0 }, uTime: { value: 0 }, uSeed: { value: i * 2.3 } },
      vertexShader: `attribute float aU; varying float vU; void main(){ vU=aU; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        varying float vU; uniform float uOp, uTime, uSeed;
        void main(){
          float dash = step(0.42, fract(vU * 150.0));
          float head = pow(max(0.0, sin((vU * 6.2831) - uTime * 0.42 - uSeed)), 26.0);
          vec3 c = mix(vec3(0.62,0.68,0.76), vec3(1.0,0.42,0.10), head);
          gl_FragColor = vec4(c, (dash * 0.13 + head * 0.85) * uOp);
        }`,
    })
    pathMats.push(m)
    group.add(new THREE.LineLoop(g, m))
  })

  // spacecraft bodies
  const bodyGeo = new THREE.OctahedronGeometry(0.07, 0)
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0xe9e7e1, transparent: true, opacity: 0, wireframe: true, depthWrite: false })
  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, SAT_COUNT)
  bodies.frustumCulled = false
  group.add(bodies)

  // spacecraft beacons
  const glowPos = new Float32Array(SAT_COUNT * 3)
  const glowState = new Float32Array(SAT_COUNT) // 0 idle .. 1 collecting
  const gg = new THREE.BufferGeometry()
  gg.setAttribute('position', new THREE.BufferAttribute(glowPos, 3))
  gg.setAttribute('aState', new THREE.BufferAttribute(glowState, 1))
  gg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), ORBIT_R * 1.2)
  const glowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uDpr: { value: 1 }, uOp: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aState; uniform float uDpr, uTime; varying float vS;
      void main(){
        vS = aState;
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_Position = projectionMatrix * mv;
        float pulse = 1.0 + aState * 0.5 * (0.5 + 0.5*sin(uTime*3.2 + position.x*4.0));
        gl_PointSize = clamp(uDpr * (2.0 + aState * 2.8) * pulse * (30.0 / max(-mv.z, 0.6)), 0.0, 17.0 * uDpr);
      }`,
    fragmentShader: /* glsl */ `
      ${DISC} uniform float uOp; varying float vS;
      void main(){
        float a = disc(gl_PointCoord, 0.85); if(a<0.01) discard;
        vec3 c = mix(vec3(0.80,0.84,0.88), vec3(1.0,0.45,0.12), vS);
        gl_FragColor = vec4(c, a * uOp * (0.45 + vS * 0.55));
      }`,
  })
  const glow = new THREE.Points(gg, glowMat)
  glow.frustumCulled = false
  group.add(glow)

  // collection cones — where a spacecraft is actually looking
  const CONES = 4
  const coneH = ORBIT_R - R
  const coneGeo = new THREE.ConeGeometry(0.20, coneH, 22, 1, true)
  coneGeo.translate(0, coneH / 2, 0)
  const coneMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uOp: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; uniform float uOp, uTime;
      void main(){
        float base = pow(1.0 - vUv.y, 1.8);
        float band = pow(max(0.0, sin((vUv.y * 5.0 - uTime * 1.5) * 3.1416)), 8.0);
        float edge = pow(abs(sin(vUv.x * 3.1416 * 11.0)), 20.0) * 0.5;
        float a = (base * 0.13 + band * 0.19 + edge * base * 0.8) * uOp;
        gl_FragColor = vec4(mix(vec3(1.0,0.45,0.12), vec3(1.0,0.86,0.68), band), a);
      }`,
  })
  const cones: THREE.Mesh[] = []
  for (let i = 0; i < CONES; i++) {
    const c = new THREE.Mesh(coneGeo, coneMat)
    c.frustumCulled = false
    cones.push(c); group.add(c)
  }

  // ground detections — emitters resolving under the passes
  const DET = 64
  const dp = new Float32Array(DET * 3), dph = new Float32Array(DET)
  const GA = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < DET; i++) {
    const y = 1 - (i / (DET - 1)) * 2
    const rad = Math.sqrt(Math.max(0, 1 - y * y))
    const th = GA * i * 4.7
    dp[i * 3] = Math.cos(th) * rad * R * 1.008
    dp[i * 3 + 1] = y * R * 1.008
    dp[i * 3 + 2] = Math.sin(th) * rad * R * 1.008
    dph[i] = Math.random()
  }
  const dg = new THREE.BufferGeometry()
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3))
  dg.setAttribute('aPh', new THREE.BufferAttribute(dph, 1))
  const detMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uOp: { value: 0 }, uTime: { value: 0 }, uDpr: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aPh; uniform float uTime, uDpr; varying float vL;
      void main(){
        vL = fract(uTime * 0.16 + aPh);
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uDpr * (1.5 + vL * 16.0) * (22.0 / max(-mv.z, 0.6)), 0.0, 64.0 * uDpr);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOp; varying float vL;
      void main(){
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float ring = smoothstep(0.72, 0.9, d) * (1.0 - smoothstep(0.9, 1.0, d));
        float core = 1.0 - smoothstep(0.0, 0.22, d);
        float a = (ring * (1.0 - vL) + core * (1.0 - vL * 0.6)) * uOp;
        if (a < 0.008) discard;
        gl_FragColor = vec4(vec3(1.0, 0.55, 0.18), a * 0.85);
      }`,
  })
  const dets = new THREE.Points(dg, detMat)
  group.add(dets)

  const positions: THREE.Vector3[] = Array.from({ length: SAT_COUNT }, () => new THREE.Vector3())
  const dummy = new THREE.Object3D()
  const up = new THREE.Vector3(0, 1, 0)
  const dir = new THREE.Vector3()
  let op = 0, active = 0

  return {
    obj: group,
    positions,
    setOpacity(v) { op = v },
    setActive(v) { active = v },
    update(dt, t) {
      const k = 1 - Math.exp(-4 * dt)
      const cur = lerp(pathMats[0].uniforms.uOp.value, op, k)
      pathMats.forEach((m) => { m.uniforms.uOp.value = cur; m.uniforms.uTime.value = t })
      glowMat.uniforms.uOp.value = cur
      glowMat.uniforms.uTime.value = t
      glowMat.uniforms.uDpr.value = S.dpr
      bodyMat.opacity = cur * 0.26
      detMat.uniforms.uOp.value = cur * active
      detMat.uniforms.uTime.value = t
      detMat.uniforms.uDpr.value = S.dpr
      coneMat.uniforms.uTime.value = t
      coneMat.uniforms.uOp.value = cur * active
      group.visible = cur > 0.004

      const gp = gg.attributes.position.array as Float32Array
      const gs = gg.attributes.aState.array as Float32Array
      let n = 0
      for (let pi = 0; pi < PLANES.length; pi++) {
        planeMat.copy(planeMats[pi])
        for (let j = 0; j < PER; j++, n++) {
          const a = (j / PER) * Math.PI * 2 + t * PLANES[pi].rate + pi * 0.4
          positions[n].set(Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R).applyMatrix4(planeMat)
          gp[n * 3] = positions[n].x; gp[n * 3 + 1] = positions[n].y; gp[n * 3 + 2] = positions[n].z
          // a rolling subset is collecting at any moment
          const coll = Math.pow(Math.max(0, Math.sin(t * 0.35 + n * 1.13)), 6)
          gs[n] = Math.max(coll, S.hoverSat === n ? 1 : 0)
          dummy.position.copy(positions[n])
          dummy.rotation.set(t * 0.4 + n, t * 0.3 + n * 2, 0)
          dummy.updateMatrix()
          bodies.setMatrixAt(n, dummy.matrix)
        }
      }
      gg.attributes.position.needsUpdate = true
      gg.attributes.aState.needsUpdate = true
      bodies.instanceMatrix.needsUpdate = true

      // point the collection cones at the strongest current collectors
      for (let i = 0; i < CONES; i++) {
        const idx = (Math.floor(t * 0.22) * 5 + i * 4) % SAT_COUNT
        const p = positions[S.hoverSat >= 0 && i === 0 ? S.hoverSat : idx]
        dir.copy(p).normalize()
        cones[i].position.copy(dir).multiplyScalar(R)
        cones[i].quaternion.setFromUnitVectors(up, dir)
      }
    },
    dispose() { disposeTree(group); coneGeo.dispose(); bodyGeo.dispose() },
  }
}

/* ============================================================
   SURFACE TILE — one patch of Earth, re-read four ways.
   uDomain 0 = sea, 1 = land, 2 = air, 3 = space.
   ============================================================ */
export interface Surface extends Mod {
  setOpacity(v: number): void
  setDomain(v: number): void
}

export function makeSurface(gridN: number, center: THREE.Vector3): Surface {
  const group = new THREE.Group()
  const tanU = new THREE.Vector3(), tanV = new THREE.Vector3()
  const c = center.clone().normalize()
  tanU.set(0, 1, 0).cross(c).normalize()
  tanV.copy(c).cross(tanU).normalize()

  const HALF = 0.62
  const N = gridN
  const count = N * N
  const pos = new Float32Array(count * 3)
  const uvA = new Float32Array(count * 2)
  const meta = new Float32Array(count * 2) // seed, kind
  const d = new THREE.Vector3()

  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const k = j * N + i
      const u = (i / (N - 1)) * 2 - 1
      const v = (j / (N - 1)) * 2 - 1
      d.copy(c)
        .addScaledVector(tanU, Math.tan(u * HALF))
        .addScaledVector(tanV, Math.tan(v * HALF))
        .normalize()
      pos[k * 3] = d.x * R; pos[k * 3 + 1] = d.y * R; pos[k * 3 + 2] = d.z * R
      uvA[k * 2] = u; uvA[k * 2 + 1] = v
      const r = Math.random()
      meta[k * 2] = r
      // sparse: vessels, emitters, air tracks. Everything else is terrain.
      meta[k * 2 + 1] = r > 0.9955 ? 1 : r > 0.991 ? 2 : r > 0.9885 ? 3 : 0
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aUV', new THREE.BufferAttribute(uvA, 2))
  g.setAttribute('aMeta', new THREE.BufferAttribute(meta, 2))
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 1.6)

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uDpr: { value: 1 }, uOp: { value: 0 }, uDomain: { value: 0 }, uR: { value: R } },
    vertexShader: /* glsl */ `
      ${NOISE}
      attribute vec2 aUV; attribute vec2 aMeta;
      uniform float uTime, uDpr, uDomain, uR;
      varying float vK, vVis, vTone, vSeed;

      void main(){
        float seed = aMeta.x, kind = aMeta.y;
        vec3 n = normalize(position);
        float dSea  = 1.0 - smoothstep(0.0, 1.0, uDomain);
        float dLand = (1.0 - abs(clamp(uDomain,0.0,2.0) - 1.0));
        float dAir  = (1.0 - abs(clamp(uDomain,1.0,3.0) - 2.0));
        float dSpc  = smoothstep(2.0, 3.0, uDomain);

        // sea state
        float sea = 0.010 * sin(aUV.x * 26.0 + uTime * 1.25)
                  + 0.008 * cos(aUV.y * 21.0 - uTime * 0.95)
                  + 0.006 * fbm(vec3(aUV * 7.0, uTime * 0.14));
        // relief
        float rg = fbm(vec3(aUV * 2.6, 11.0));
        float land = (1.0 - abs(rg)) * 0.115 + fbm(vec3(aUV * 8.0, 3.0)) * 0.018;

        float h = mix(sea, land, smoothstep(0.0, 1.0, clamp(uDomain, 0.0, 1.0)));
        vTone = mix(0.13, 0.58, smoothstep(0.0, 1.0, clamp(uDomain,0.0,1.0)) * (0.35 + max(0.0, rg)));

        vec3 p = n * (uR + h);

        // markers ride above the surface
        if (kind > 0.5) {
          float drift = fract(seed + uTime * (kind < 1.5 ? 0.012 : 0.045));
          if (kind < 1.5) {            // vessel — a slow track across the water
            p = normalize(mix(n, normalize(n + vec3(0.06,0.0,0.0)), drift)) * (uR + 0.006);
            vTone = 0.55; vVis = dSea + dLand * 0.25;
          } else if (kind < 2.5) {     // ground emitter
            p = n * (uR + max(h, 0.0) + 0.004);
            vTone = 0.62; vVis = dLand;
          } else {                      // airborne track
            p = normalize(mix(n, normalize(n + vec3(0.0,0.05,0.05)), drift)) * (uR + 0.16 + seed * 0.13);
            vTone = 0.78; vVis = dAir;
          }
          vK = kind;
        } else {
          vK = 0.0;
          vVis = (1.0 - dSpc) * (0.35 + 0.65 * (dSea + dLand)) * (1.0 - dAir * 0.45);
        }

        vSeed = seed;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float base = (kind > 0.5) ? 4.2 : 1.05;
        gl_PointSize = clamp(uDpr * base * (3.4 / max(-mv.z, 0.22)), 0.0, 18.0 * uDpr);
      }`,
    fragmentShader: /* glsl */ `
      ${RAMP} ${DISC}
      uniform float uOp, uTime;
      varying float vK, vVis, vTone, vSeed;
      void main(){
        float dst = length(gl_PointCoord - 0.5) * 2.0;
        float a; vec3 col;
        if (vK > 0.5) {
          float ring = smoothstep(0.55, 0.8, dst) * (1.0 - smoothstep(0.85, 1.0, dst));
          float core = 1.0 - smoothstep(0.0, 0.3, dst);
          float ping = pow(fract(uTime * 0.3 + vSeed), 10.0);
          a = core * 0.9 + ring * (0.3 + ping * 0.7);
          col = ramp(vTone);
        } else {
          a = disc(gl_PointCoord, 1.0) * 0.9;
          col = ramp(vTone) * 0.95;
        }
        a *= uOp * vVis;
        if (a < 0.006) discard;
        gl_FragColor = vec4(col, a);
      }`,
  })

  const pts = new THREE.Points(g, mat)
  pts.frustumCulled = false
  pts.renderOrder = 5
  group.add(pts)

  let op = 0, dom = 0
  return {
    obj: group,
    setOpacity(v) { op = v },
    setDomain(v) { dom = v },
    update(dt, t) {
      const k = 1 - Math.exp(-4 * dt)
      mat.uniforms.uOp.value = lerp(mat.uniforms.uOp.value, op, k)
      mat.uniforms.uDomain.value = lerp(mat.uniforms.uDomain.value, dom, 1 - Math.exp(-3 * dt))
      mat.uniforms.uTime.value = t
      mat.uniforms.uDpr.value = S.dpr
      group.visible = mat.uniforms.uOp.value > 0.004
    },
    dispose() { disposeTree(group) },
  }
}

/* ============================================================
   FUSION — RF, multispectral and SAR arriving as three separate
   reads of one place, then registering into a single picture.
   ============================================================ */
export interface Fusion extends Mod {
  setOpacity(v: number): void
  setFuse(v: number): void
}

export function makeFusion(center: THREE.Vector3): Fusion {
  const group = new THREE.Group()
  const c = center.clone().normalize()
  const tanU = new THREE.Vector3(0, 1, 0).cross(c).normalize()
  const tanV = new THREE.Vector3().copy(c).cross(tanU).normalize()

  // local frame: x = tanU, y = tanV, z = outward normal
  const orient = new THREE.Group()
  orient.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tanU, tanV, c))
  group.add(orient)

  const geo = new THREE.PlaneGeometry(2.5, 1.62, 1, 1)
  const mats: THREE.ShaderMaterial[] = []
  const meshes: THREE.Mesh[] = []

  for (let i = 0; i < 3; i++) {
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uOp: { value: 0 }, uFuse: { value: 0 }, uKind: { value: i } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        ${NOISE} ${RAMP}
        varying vec2 vUv; uniform float uTime, uOp, uFuse, uKind;
        void main(){
          vec2 uv = vUv;
          float frame = 1.0 - smoothstep(0.487, 0.5, max(abs(uv.x-0.5), abs(uv.y-0.5)));
          float border = (1.0 - frame) * 0.55;
          float a = 0.0; vec3 col = vec3(0.0);

          if (uKind < 0.5) {                        // RF — spectrum waterfall
            float row = floor(uv.y * 46.0);
            float e = fbm(vec3(row * 0.35, uv.x * 9.0, uTime * 0.22));
            float band = smoothstep(0.12, 0.55, e);
            float peak = pow(band, 3.0);
            a = band * 0.30 + peak * 0.55;
            col = ramp(0.42 + peak * 0.35);
          } else if (uKind < 1.5) {                 // multispectral — smooth radiometry
            float n = fbm(vec3(uv * 3.4, 7.0)) * 0.5 + 0.5;
            float t = smoothstep(0.35, 0.75, n);
            a = 0.10 + t * 0.34;
            col = mix(vec3(0.30,0.36,0.42), vec3(0.92,0.90,0.86), t);
          } else {                                   // SAR — speckle and look direction
            float sp = fract(sin(dot(floor(uv*260.0), vec2(12.99,78.23))) * 43758.5);
            float st = fbm(vec3(uv * vec2(2.0, 7.0), 3.0));
            float s = sp * 0.55 + smoothstep(0.0, 0.5, st) * 0.55;
            a = s * 0.30;
            col = mix(vec3(0.20,0.30,0.52), vec3(0.72,0.80,0.92), s);
          }

          // registration marks appear once the layers agree
          vec2 gq = abs(fract(uv * 8.0) - 0.5);
          float tick = (1.0 - smoothstep(0.0, 0.02, min(gq.x, gq.y))) * step(1.5, uKind);
          a += tick * uFuse * 0.22;

          // the resolved target — only legible after fusion
          float dTgt = length((uv - vec2(0.615, 0.44)) * vec2(1.55, 1.0));
          float lock = (1.0 - smoothstep(0.016, 0.026, abs(dTgt - 0.052)))
                     * smoothstep(0.55, 1.0, uFuse);
          a += lock * 0.9;
          col = mix(col, vec3(1.0, 0.45, 0.12), lock);

          a = a * 1.65 * uOp + border * uOp * 0.28;
          if (a < 0.004) discard;
          gl_FragColor = vec4(col, a);
        }`,
    })
    mats.push(m)
    const mesh = new THREE.Mesh(geo, m)
    mesh.frustumCulled = false
    meshes.push(mesh)
    orient.add(mesh)
  }

  let op = 0, fuse = 0
  return {
    obj: group,
    setOpacity(v) { op = v },
    setFuse(v) { fuse = v },
    update(dt, t) {
      const k = 1 - Math.exp(-4 * dt)
      const f = lerp(mats[0].uniforms.uFuse.value, fuse, 1 - Math.exp(-3 * dt))
      const o = lerp(mats[0].uniforms.uOp.value, op, k)
      mats.forEach((m) => { m.uniforms.uTime.value = t; m.uniforms.uFuse.value = f; m.uniforms.uOp.value = o })
      group.visible = o > 0.02
      // three reads of one place drifting into register
      for (let i = 0; i < 3; i++) {
        const spread = (1 - f)
        const alt = R + 0.30 + (2 - i) * 0.44 * spread + i * 0.012
        const lat = (i - 1) * 0.30 * spread
        meshes[i].position.set(lat, lat * 0.42, alt)
        const wob = (1 - f) * 0.045
        meshes[i].rotation.z = Math.sin(t * 0.4 + i * 2.1) * wob + (i - 1) * 0.03 * spread
      }
    },
    dispose() { disposeTree(group); geo.dispose() },
  }
}
