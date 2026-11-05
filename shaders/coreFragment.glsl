// Inner liquid - fragment stage. Mostly transparent, with luminous filaments.

uniform float uFlow;
uniform float uIntensity;
uniform float uPulse;
uniform vec3  uCyan;
uniform vec3  uBlue;
uniform vec3  uSapphire;
uniform vec3  uViolet;
uniform vec3  uSilver;

varying vec3 vNormalW;
varying vec3 vWorldPos;
varying vec3 vObj;

void main() {
  vec3 V = normalize(cameraPosition - vWorldPos);
  float NdV = clamp(abs(dot(normalize(vNormalW), V)), 0.0, 1.0);
  vec3 d = normalize(vObj);
  float t = uFlow;

  float b1 = sin(d.y * 3.0 + d.x * 2.0 - t * 0.7 + sin(d.z * 3.0 + t * 0.3) * 1.2);
  float b2 = sin(d.z * 4.0 - d.y * 1.7 + t * 0.5);
  float filament = pow(1.0 - abs(b1), 9.0) + 0.5 * pow(1.0 - abs(b2), 12.0);

  // Body: deep sapphire into electric blue, catching cyan toward the top.
  vec3 body = mix(uSapphire, uBlue, 0.5 + 0.5 * b2);
  body = mix(body, uCyan, smoothstep(0.2, 1.0, d.y * 0.5 + 0.5) * 0.45);

  vec3 fil = mix(uCyan, uViolet, 0.5 + 0.5 * sin(d.x * 2.0 + t * 0.2));
  fil = mix(fil, uSilver, 0.3);

  float facing = pow(NdV, 2.0);
  vec3 col = body * facing * 0.2 + fil * filament * facing * 0.32;
  col *= uIntensity * (1.0 + uPulse * 1.6);

  gl_FragColor = vec4(col, 1.0);
}
