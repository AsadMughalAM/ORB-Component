// Liquid glass shell - fragment stage.
// noise.glsl is prepended at build time (used for caustics).
//
// Each pixel traces its view ray *through* an ideal sphere: refract in at the
// surface, travel to the exit point, refract out, then look up what lies
// behind (captured backdrop) and around (procedural studio). This yields the
// inverted, magnified lens image of real glass. Done per colour channel for
// dispersion. The liquid core lives in its own capture and is sampled at the
// refracted mid-point of the internal path.

// three.js only declares this in the vertex stage; it still uploads it for us.
uniform mat4 projectionMatrix;

uniform sampler2D uScene;      // backdrop + particles (no shell, no core)
uniform sampler2D uCore;       // inner liquid only, on black
uniform float uTime;
uniform float uTransmission;   // 0 = dense sapphire ... 1 = clear
uniform float uIridescence;
uniform float uDispersion;
uniform float uLiquid;
uniform float uHover;
uniform float uIntro;
uniform float uFlash;
uniform vec3  uOrbCenter;      // world
uniform float uOrbRadius;      // world
uniform float uBackZ;          // world z of the backdrop plane
uniform vec3  uKeyDir;         // world, follows the cursor
uniform vec3  uCyan;
uniform vec3  uBlue;
uniform vec3  uSapphire;
uniform vec3  uViolet;
uniform vec3  uSilver;

varying vec3  vWorldPos;
varying vec3  vWorldNormal;
varying vec3  vObjPos;
varying vec4  vClip;
varying float vDisp;

// ---------------------------------------------------------------------------
// Studio environment built from area-light shapes. Crisp shapes in the
// reflections are what make glass read as glass.
// ---------------------------------------------------------------------------
float rectLight(vec3 d, vec3 dir, vec2 halfSize, float soft) {
  float c = dot(d, dir);
  if (c <= 0.0) return 0.0;
  vec3 ax = normalize(cross(abs(dir.y) > 0.95 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0), dir));
  vec3 ay = cross(dir, ax);
  vec2 p = vec2(dot(d, ax), dot(d, ay)) / c;
  vec2 q = abs(p) - halfSize + soft;
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - soft;
  return 1.0 - smoothstep(-soft * 0.6, soft * 0.6, sd);
}

const vec3 RIM_L  = vec3(-0.9138, 0.1785, -0.3647);  // normalize(-0.92, 0.18, -0.38)
const vec3 RIM_R  = vec3(0.9510, -0.0500, -0.3047);  // normalize(0.95, -0.05, -0.3)
const vec3 FILL   = vec3(0.6025, -0.5523, 0.5523);   // normalize(0.6, -0.55, 0.55)

vec3 studio(vec3 d) {
  vec3 col = vec3(0.0);
  // Large soft key light (follows the cursor).
  col += rectLight(d, uKeyDir, vec2(0.48, 0.34), 0.2) * vec3(1.0, 0.99, 1.03) * 3.6;
  // Cool blue rim strips behind the orb.
  col += rectLight(d, RIM_L, vec2(0.07, 0.95), 0.05) * mix(uBlue, uCyan, 0.35) * 3.2;
  col += rectLight(d, RIM_R, vec2(0.045, 0.7), 0.035) * uCyan * 1.8;
  // Subtle violet fill.
  col += pow(max(dot(d, FILL), 0.0), 3.0) * uViolet * 0.32;
  // Overhead bounce and sapphire ambience.
  col += smoothstep(0.35, 1.0, d.y) * uSilver * 0.05;
  col += uSapphire * (0.035 + 0.025 * d.y);
  // A tiny, intense glint beside the key light.
  col += pow(max(dot(d, normalize(uKeyDir + vec3(0.14, 0.1, 0.0))), 0.0), 2400.0) * 18.0;
  return col;
}

vec2 toScreen(vec3 w) {
  vec4 c = projectionMatrix * viewMatrix * vec4(w, 1.0);
  return c.xy / c.w * 0.5 + 0.5;
}

// Trace through the sphere. Returns background + environment seen through it.
vec3 throughGlass(vec3 P, vec3 V, vec3 N, float ior, out float len, out vec3 T1) {
  T1 = refract(-V, N, 1.0 / ior);
  float t = max(-2.0 * dot(P, T1), 0.0);
  vec3 Q = P + T1 * t;
  vec3 Nq = normalize(Q);
  vec3 T2 = refract(T1, -Nq, ior);
  if (dot(T2, T2) < 1e-4) T2 = reflect(T1, -Nq); // total internal reflection
  len = t;

  vec3 Qw = uOrbCenter + Q;
  float tb = (uBackZ - Qw.z) / min(T2.z, -0.08);
  vec2 uv = toScreen(Qw + T2 * tb);
  vec2 uvc = clamp(uv, 0.002, 0.998);
  float onScreen = 1.0 - smoothstep(0.0, 0.1, length(uv - uvc));
  vec3 bg = texture2D(uScene, uvc).rgb * onScreen;
  // Light sources seen through the glass stay dim: the lens image, not a second reflection.
  return bg + studio(T2) * 0.06;
}

void main() {
  vec3 N = normalize(vWorldNormal);

#ifndef LOW_QUALITY
  // Subtle surface imperfections: a faint, irregular ripple in the normal.
  vec3 q = vObjPos * 11.0;
  N = normalize(N + 0.009 * vec3(sin(q.y * 1.7 + q.z), sin(q.z * 2.3 + q.x), sin(q.x * 1.9 + q.y)));
#endif

  vec3 V = normalize(cameraPosition - vWorldPos);
  float NdV  = clamp(dot(N, V), 0.0, 1.0);
  float edge = 1.0 - NdV;
  float F = 0.04 + 0.96 * pow(edge, 5.0);

  // ---- Reflection, with thin-film iridescence ----
  vec3 R = reflect(-V, N);
  vec3 refl = studio(R);
  float film = edge * 1.5 + vDisp * 7.0 + uTime * 0.02;
  vec3 irid = 0.5 + 0.5 * cos(6.28318 * (film + vec3(0.0, 0.33, 0.67)));
  irid *= vec3(0.75, 0.9, 1.2);
  refl *= mix(vec3(1.0), 0.35 + irid * 1.3, uIridescence * (0.3 + 0.7 * edge));

  // ---- Transmission ----
  vec3 P = vWorldPos - uOrbCenter;
  float ior = 1.34;
  float spread = 0.02 * uDispersion * (1.0 + uHover * 0.5);
  float len;
  vec3 T1;
  vec3 trans;

#ifdef LOW_QUALITY
  vec3 tg = throughGlass(P, V, N, ior, len, T1);
  trans = tg;
#else
  float lr; float lb; vec3 t1r; vec3 t1b;
  trans.r = throughGlass(P, V, N, ior - spread, lr, t1r).r;
  trans.g = throughGlass(P, V, N, ior, len, T1).g;
  trans.b = throughGlass(P, V, N, ior + spread, lb, t1b).b;
#endif

  // The liquid core, refracted by the front surface.
  vec3 mid = P + T1 * len * 0.5;
  vec3 core = texture2D(uCore, toScreen(uOrbCenter + mid)).rgb;

  // Soft internal caustics, gathered on the side away from the key light.
  vec3 cp = mid / uOrbRadius;
#ifdef LOW_QUALITY
  float caustic = pow(0.5 + 0.5 * sin(cp.x * 6.0 + uTime * 0.5) * sin(cp.y * 5.0 - uTime * 0.4 + cp.z * 3.0), 7.0);
#else
  float cn = snoise(cp * 2.3 + vec3(0.0, uTime * 0.16, uTime * 0.1));
  float caustic = pow(1.0 - abs(cn), 9.0);
#endif
  float focus = smoothstep(-0.25, 0.85, dot(normalize(cp + 1e-4), -uKeyDir));
  vec3 causticCol = mix(uCyan, uViolet, 0.5 + 0.5 * cp.y) * caustic * focus * (0.06 + 0.12 * uLiquid);

  // Beer-Lambert absorption: longer paths through the centre pick up sapphire.
  float pathN = len / uOrbRadius;
  float density = mix(1.5, 0.14, uTransmission);
  vec3 absorb = exp(-vec3(0.85, 0.42, 0.1) * density * pathN);

  vec3 transmitted = (trans + core + causticCol) * absorb;
  vec3 scatter = mix(uSapphire, uBlue, 0.25 + 0.25 * NdV) * (0.06 + 0.1 * NdV);
  transmitted = mix(scatter + transmitted * 0.25, transmitted, smoothstep(0.0, 1.0, uTransmission));

  vec3 col = transmitted * (1.0 - F) + refl * F * (1.0 + 0.45 * uHover + 0.6 * uFlash);

  // Direct specular from the key light: small and intense.
  vec3 H = normalize(uKeyDir + V);
  float NdH = max(dot(N, H), 0.0);
  col += (pow(NdH, 700.0) * 3.0 + pow(NdH, 90.0) * 0.12) * (1.0 + uHover * 0.8);

  // Thin luminous edge with a controlled iridescent tint.
  vec3 edgeTint = mix(uSilver, irid * mix(uCyan, uViolet, 0.5) * 1.4, uIridescence * 0.7);
  col += edgeTint * smoothstep(0.8, 1.0, edge) * (0.22 + 0.15 * uHover);

  col *= uIntro;
  gl_FragColor = vec4(col, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
