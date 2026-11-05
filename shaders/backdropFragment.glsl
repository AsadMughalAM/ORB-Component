// Cinematic backdrop: black into midnight navy, layered radial light, slow
// volumetric shafts falling toward the orb, a soft glow behind it and a light
// that follows the cursor. It lives in the 3D scene, so the glass bends it.

uniform float uTime;
uniform float uAspect;
uniform vec2  uPointer;      // backdrop-space cursor position
uniform float uPointerGlow;  // 0..1
uniform vec2  uCenter;       // backdrop-space orb centre
uniform float uRadius;       // backdrop-space orb radius
uniform float uIntro;
uniform vec3  uNavy;
uniform vec3  uSapphire;
uniform vec3  uBlue;
uniform vec3  uCyan;
uniform vec3  uViolet;

varying vec2 vUv;

// Volumetric light shafts fanning from `src` toward `target`.
float shafts(vec2 p, vec2 src, vec2 target, float width, float seed) {
  vec2 sv = p - src;
  float dist = length(sv);
  vec2 axis = normalize(target - src);
  vec2 dir = sv / max(dist, 1e-4);
  float da = atan(dir.x * axis.y - dir.y * axis.x, dot(dir, axis));
  float cone = exp(-da * da / (width * width));
  float rays = 0.55 + 0.45 * sin(da * 41.0 + sin(da * 13.0 + uTime * 0.06 + seed) * 1.6 + uTime * 0.04);
  rays *= 0.65 + 0.35 * sin(da * 17.0 - uTime * 0.035 + seed * 2.0);
  float fall = exp(-dist * 0.9) * smoothstep(0.0, 0.35, dist);
  return cone * rays * fall;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  vec2 q = p - uCenter;
  float r = length(q);

  // Base: near-black, lifting into midnight navy around the composition.
  float lift = smoothstep(1.15, 0.0, length((p - vec2(0.0, -0.08)) * vec2(0.75, 1.0)));
  vec3 col = mix(vec3(0.0015, 0.0018, 0.004), uNavy, lift);

  // Layered radial light around the orb.
  float R = max(uRadius, 0.05);
  col += uSapphire * 0.04 * exp(-r * r / (R * R * 5.0));
  col += uBlue * 0.022 * exp(-pow((r - R * 1.02) / (R * 0.38), 2.0));    // glow hugging the silhouette
  col += uViolet * 0.018 * exp(-dot(q - vec2(R * 0.9, -R * 0.7), q - vec2(R * 0.9, -R * 0.7)) / (R * R * 1.4));

  // Soft volumetric shafts from the upper left, a fainter violet one from the right.
  vec2 srcA = vec2(-0.42 * uAspect, 0.68);
  vec2 srcB = vec2(0.5 * uAspect, 0.75);
  col += mix(uBlue, uCyan, 0.3) * shafts(p, srcA, uCenter, 0.24, 0.0) * 0.05;
  col += uViolet * shafts(p, srcB, uCenter + vec2(0.0, -0.1), 0.14, 3.0) * 0.03;

  // Cursor-following light.
  vec2 pd = p - uPointer;
  col += mix(uCyan, uBlue, 0.55) * exp(-dot(pd, pd) * 12.0) * 0.03 * uPointerGlow;

  // Cinematic vignette.
  col *= smoothstep(1.3, 0.18, length(p * vec2(0.82, 1.0)));

  // Dither against banding in the dark gradients.
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  col += dither / 255.0;

  gl_FragColor = vec4(col * uIntro, 1.0);
}
