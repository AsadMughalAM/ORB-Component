"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

import particleVertex from "@/shaders/particleVertex.glsl";
import particleFragment from "@/shaders/particleFragment.glsl";
import { PALETTE, type Interaction } from "@/lib/experience";

type ParticleFieldProps = {
  count: number;
  enabled: boolean;
  reducedMotion: boolean;
  interaction: Interaction;
};

// Deterministic PRNG so the field is identical across remounts.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Depth layers: [share of particles, z range, size range, drift speed]. */
const LAYERS = [
  { share: 0.62, z: [-4.2, -2.2], size: [0.35, 0.7], speed: [0.015, 0.035] }, // far specks
  { share: 0.3, z: [-2.0, 0.8], size: [0.55, 1.0], speed: [0.025, 0.05] }, // mid motes
  { share: 0.08, z: [1.4, 3.2], size: [3.5, 7.0], speed: [0.03, 0.06] }, // near bokeh
] as const;

export default function ParticleField({ count, enabled, reducedMotion, interaction }: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => {
    const rand = mulberry32(1337);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    const layers = new Float32Array(count);
    const lerp = (r: readonly [number, number]) => r[0] + rand() * (r[1] - r[0]);

    let i = 0;
    LAYERS.forEach((layer, li) => {
      const n = li === LAYERS.length - 1 ? count - i : Math.round(count * layer.share);
      for (let k = 0; k < n && i < count; k++, i++) {
        const z = lerp(layer.z);
        // Spread wider at depth so the field fills the frustum evenly.
        const spread = 6 + (6 - z) * 0.9;
        positions[i * 3] = (rand() - 0.5) * spread;
        positions[i * 3 + 1] = (rand() - 0.5) * 8;
        positions[i * 3 + 2] = z;
        sizes[i] = lerp(layer.size);
        phases[i] = rand() * Math.PI * 2;
        speeds[i] = lerp(layer.speed);
        layers[i] = li;
      }
    });

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
    g.setAttribute("aLayer", new THREE.BufferAttribute(layers, 1));
    // Particles drift, so give them a generous static bound and skip per-frame recompute.
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 14);
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: particleVertex,
        fragmentShader: particleFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uSize: { value: 24 },
          uParallax: { value: new THREE.Vector2() },
          uOpacity: { value: 0 },
          uColor: { value: new THREE.Color(PALETTE.silver).lerp(new THREE.Color(PALETTE.cyan), 0.3) },
        },
      }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, rawDelta) => {
    const points = pointsRef.current;
    if (!points) return;
    const dt = Math.min(rawDelta, 1 / 20);
    const u = material.uniforms;
    u.uTime.value += dt * (reducedMotion ? 0.3 : 1);
    u.uPixelRatio.value = dpr;
    u.uOpacity.value = THREE.MathUtils.damp(u.uOpacity.value, enabled ? 1 : 0, 2.5, dt);
    u.uParallax.value.copy(interaction.smoothed);
    points.visible = u.uOpacity.value > 0.003;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}
