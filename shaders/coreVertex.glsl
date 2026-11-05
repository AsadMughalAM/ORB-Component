// Inner liquid - vertex stage. Rendered only into its own capture buffer,
// then sampled by the glass shader through the refracted internal path.
// noise.glsl is prepended at build time.

uniform float uFlow;          // flow clock; runs faster when the visitor interacts
uniform float uDistortion;
uniform float uPulse;         // 0..1 decaying click energy
uniform vec3  uPointerDir;    // object-space direction toward the cursor
uniform float uPointerForce;

varying vec3 vNormalW;
varying vec3 vWorldPos;
varying vec3 vObj;

void main() {
  vec3 dir = normalize(position);
  float t = uFlow;

  float n = snoise(dir * 1.5 + vec3(t * 0.45, -t * 0.3, t * 0.22)) * 0.7
          + snoise(dir * 3.1 - vec3(0.0, t * 0.5, t * 0.35)) * 0.3;
  float d = n * (0.1 + 0.07 * uDistortion);

  // The liquid leans toward the cursor and shivers on clicks.
  float pd = distance(dir, uPointerDir);
  d += exp(-pd * pd * 3.0) * uPointerForce * 0.12;
  d += uPulse * 0.07 * sin(t * 9.0 + dir.y * 6.0);

  vec3 p = position + normal * d;
  vec4 world = modelMatrix * vec4(p, 1.0);

  vWorldPos = world.xyz;
  vNormalW  = normalize(mat3(modelMatrix) * normal);
  vObj      = p;

  gl_Position = projectionMatrix * viewMatrix * world;
}
