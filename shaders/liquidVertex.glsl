// Liquid glass shell - vertex stage.
// noise.glsl is prepended at build time (provides snoise).

uniform float uTime;
uniform float uDistortion;     // global organic deformation amount
uniform vec3  uPointerDir;     // unit vector (object space) toward the cursor
uniform float uPointerForce;   // 0..1 proximity of the cursor to the surface
uniform float uRipple;         // 0..1 energy from fast pointer movement
uniform vec3  uPulseOrigin;    // unit vector (object space) of the last click
uniform float uPulseTime;      // seconds since the last click
uniform float uPulseStrength;  // amplitude of the click wave

varying vec3  vWorldPos;
varying vec3  vWorldNormal;
varying vec3  vObjPos;
varying vec4  vClip;
varying float vDisp;

float displacement(vec3 p) {
  vec3 dir = normalize(p);
  float t = uTime;

  // Slow, layered organic morph. Low frequency keeps the silhouette spherical.
  float n  = snoise(dir * 1.25 + vec3(0.0, t * 0.22, t * 0.13)) * 0.75;
  n       += snoise(dir * 2.40 - vec3(t * 0.17, 0.0, t * 0.09)) * 0.15;
  float d  = n * 0.032 * uDistortion;

  // Soft bulge toward the cursor.
  float pd = distance(dir, uPointerDir);
  d += exp(-pd * pd * 5.0) * uPointerForce * 0.045 * (0.6 + 0.4 * uDistortion);

  // Ripples radiating from the cursor on fast movement.
  d += sin(pd * 22.0 - t * 10.0) * exp(-pd * 3.2) * uRipple * 0.022;

  // Click / double-click wave travelling across the sphere.
  float ang   = acos(clamp(dot(dir, uPulseOrigin), -1.0, 1.0));
  float front = uPulseTime * 2.2;
  float env   = exp(-abs(ang - front) * 3.5) * exp(-uPulseTime * 1.15);
  d += sin((ang - front) * 10.0) * env * uPulseStrength * 0.05;
  // A small global "breath" at the moment of impact.
  d += exp(-uPulseTime * 3.0) * uPulseStrength * 0.02 * sin(uPulseTime * 14.0);

  return d;
}

vec3 orthogonal(vec3 v) {
  return normalize(abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0) : vec3(0.0, -v.z, v.y));
}

void main() {
  vec3 n = normalize(normal);
  vec3 t = orthogonal(n);
  vec3 b = normalize(cross(n, t));

  // Displace along the normal and rebuild the normal from two neighbours.
  const float eps = 0.008;
  vec3 p0 = position;
  vec3 p1 = position + t * eps;
  vec3 p2 = position + b * eps;

  float d0 = displacement(p0);
  vec3 dp0 = p0 + n * d0;
  vec3 dp1 = p1 + normalize(p1) * displacement(p1);
  vec3 dp2 = p2 + normalize(p2) * displacement(p2);
  vec3 dn  = normalize(cross(dp1 - dp0, dp2 - dp0));

  vec4 world   = modelMatrix * vec4(dp0, 1.0);
  vWorldPos    = world.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * dn);
  vObjPos      = dp0;
  vDisp        = d0;

  gl_Position = projectionMatrix * viewMatrix * world;
  vClip = gl_Position;
}
