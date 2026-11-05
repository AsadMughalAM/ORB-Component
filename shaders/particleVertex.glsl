// Atmospheric dust in three depth layers: far specks, mid motes, near bokeh.

uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
uniform vec2  uParallax;

attribute float aSize;
attribute float aPhase;
attribute float aSpeed;
attribute float aLayer;

varying float vAlpha;
varying float vLayer;

void main() {
  vec3 p = position;
  float range = 8.0;
  p.y = mod(p.y + uTime * aSpeed + range * 0.5, range) - range * 0.5;
  p.x += sin(uTime * 0.12 + aPhase) * 0.14;
  p.z += cos(uTime * 0.1 + aPhase * 1.3) * 0.1;

  // Depth-based parallax: nearer layers drift further with the cursor.
  p.xy += uParallax * (p.z + 4.5) * 0.05;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * aSize * uPixelRatio * (1.0 / -mv.z);

  float twinkle = 0.6 + 0.4 * sin(uTime * (0.4 + aSpeed * 2.0) + aPhase * 6.0);
  float edges = smoothstep(range * 0.5, range * 0.32, abs(p.y));
  float layerAlpha = aLayer < 0.5 ? 0.38 : (aLayer < 1.5 ? 0.55 : 0.05);
  vAlpha = twinkle * edges * layerAlpha;
  vLayer = aLayer;
}
