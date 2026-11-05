"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

import backdropFragment from "@/shaders/backdropFragment.glsl";
import { BACKDROP_Z, CAMERA_Z, PALETTE, type Interaction } from "@/lib/experience";

const OVERSCAN = 1.12;

const backdropVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

type BackdropProps = {
  interaction: Interaction;
  reducedMotion: boolean;
  started: boolean;
};

/**
 * A plane behind the orb that carries the atmosphere. Because it is part of
 * the 3D scene, the glass genuinely refracts it.
 */
export default function Backdrop({ interaction, reducedMotion, started }: BackdropProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startedRef = useRef(started);
  startedRef.current = started;

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: backdropVertex,
        fragmentShader: backdropFragment,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uAspect: { value: 1 },
          uPointer: { value: new THREE.Vector2() },
          uPointerGlow: { value: 0 },
          uCenter: { value: new THREE.Vector2() },
          uRadius: { value: 0.2 },
          uIntro: { value: 0 },
          uNavy: { value: new THREE.Color(PALETTE.navy) },
          uSapphire: { value: new THREE.Color(PALETTE.sapphire) },
          uBlue: { value: new THREE.Color(PALETTE.blue) },
          uCyan: { value: new THREE.Color(PALETTE.cyan) },
          uViolet: { value: new THREE.Color(PALETTE.violet) },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, rawDelta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(rawDelta, 1 / 20);

    // Fill the frustum at the backdrop depth.
    const vp = state.viewport.getCurrentViewport(state.camera, [0, 0, BACKDROP_Z]);
    const w = vp.width * OVERSCAN;
    const h = vp.height * OVERSCAN;
    mesh.scale.set(w, h, 1);

    // World units at z=0, projected onto the backdrop plane.
    const k = (CAMERA_Z - BACKDROP_Z) / CAMERA_Z;
    const u = material.uniforms;
    u.uTime.value += dt * (reducedMotion ? 0.3 : 1);
    u.uAspect.value = w / h;
    if (startedRef.current) u.uIntro.value = Math.min(u.uIntro.value + rawDelta / 1.8, 1);
    u.uCenter.value.set((interaction.orbCenter.x * k) / h, (interaction.orbCenter.y * k) / h);
    u.uRadius.value = (interaction.orbRadius * k) / h;
    u.uPointer.value.set(
      (interaction.smoothed.x * vp.width) / 2 / h,
      (interaction.smoothed.y * vp.height) / 2 / h,
    );
    u.uPointerGlow.value = interaction.presence;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, BACKDROP_Z]} material={material} renderOrder={-1}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
