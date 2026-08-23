/** Reusable GLSL. Kept small — every byte ships to the GPU and the wire. */

export const NOISE = /* glsl */ `
vec3 hash3(vec3 p){
  p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
  return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}
float snoise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p);
  vec3 u = f*f*(3.0-2.0*f);
  return mix(mix(mix(dot(hash3(i+vec3(0,0,0)),f-vec3(0,0,0)), dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
                 mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)), dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
             mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)), dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
                 mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)), dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);
}
float fbm(vec3 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<4;i++){ v += a*snoise(p); p *= 2.02; a *= 0.5; }
  return v;
}
`

/**
 * Frequency ramp — the site's colour grammar.
 * 0.0 = unresolved / low band (cobalt) → 0.5 = detected (amber) → 1.0 = resolved (bone)
 */
export const RAMP = /* glsl */ `
const vec3 C_COLD = vec3(0.247, 0.420, 0.847);
const vec3 C_SIG  = vec3(1.000, 0.416, 0.102);
const vec3 C_HOT  = vec3(1.000, 0.851, 0.659);
vec3 ramp(float t){
  t = clamp(t, 0.0, 1.0);
  return t < 0.5 ? mix(C_COLD, C_SIG, smoothstep(0.0, 0.5, t))
                 : mix(C_SIG,  C_HOT, smoothstep(0.5, 1.0, t));
}
`

/** soft round point sprite, no texture fetch */
export const DISC = /* glsl */ `
float disc(vec2 uv, float soft){
  float d = length(uv - 0.5) * 2.0;
  return 1.0 - smoothstep(1.0 - soft, 1.0, d);
}
`
