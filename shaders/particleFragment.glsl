uniform float uOpacity;
uniform vec3  uColor;

varying float vAlpha;
varying float vLayer;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a;
  if (vLayer > 1.5) {
    // Near bokeh: a soft disc with a slightly brighter rim.
    a = smoothstep(0.5, 0.38, d) * 0.7 + smoothstep(0.5, 0.0, d) * 0.3;
  } else {
    a = smoothstep(0.5, 0.0, d);
    a *= a;
  }
  a *= vAlpha * uOpacity;
  if (a < 0.002) discard;
  gl_FragColor = vec4(uColor * a, 1.0);
}
