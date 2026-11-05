"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";

import Backdrop from "./Backdrop";
import LiquidOrb from "./LiquidOrb";
import ParticleField from "./ParticleField";
import {
  CAMERA_FOV,
  CAMERA_Z,
  type Discovery,
  type Interaction,
  type OrbSettings,
  type Quality,
} from "@/lib/experience";

type OrbSceneProps = {
  settings: OrbSettings;
  quality: Quality;
  interaction: Interaction;
  reducedMotion: boolean;
  resetSignal: number;
  /** Intro may begin (loader has finished). */
  started: boolean;
  /** Render loop runs only while the hero is on screen. */
  active: boolean;
  customCursor: boolean;
  onDiscover: (d: Discovery) => void;
  onReady: () => void;
  onContextLost: () => void;
  onContextRestored: () => void;
};

function Effects({ bloom, multisampling }: { bloom: boolean; multisampling: number }) {
  // Separate trees instead of conditional children: the composer rebuilds its
  // passes cleanly when the key changes.
  if (bloom) {
    return (
      <EffectComposer key="full" multisampling={multisampling} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.7} luminanceSmoothing={0.2} radius={0.68} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.24} darkness={0.78} />
        <Noise opacity={0.03} blendFunction={BlendFunction.SOFT_LIGHT} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer key="lite" multisampling={0} enableNormalPass={false}>
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.24} darkness={0.78} />
    </EffectComposer>
  );
}

export default function OrbScene({
  settings,
  quality,
  interaction,
  reducedMotion,
  resetSignal,
  started,
  active,
  customCursor,
  onDiscover,
  onReady,
  onContextLost,
  onContextRestored,
}: OrbSceneProps) {
  // Adaptive quality: drop DPR first, then bloom, if the device struggles.
  const [dpr, setDpr] = useState(quality.dpr[1]);
  const [bloom, setBloom] = useState(quality.bloom);
  useEffect(() => {
    setDpr(Math.min(quality.dpr[1], window.devicePixelRatio));
    setBloom(quality.bloom);
  }, [quality]);

  const handleDecline = useCallback(() => {
    setDpr((d) => {
      const next = Math.max(quality.dpr[0], d - 0.35);
      if (next === d) setBloom(false);
      return next;
    });
  }, [quality.dpr]);

  const handleIncline = useCallback(() => {
    setDpr((d) => Math.min(quality.dpr[1], window.devicePixelRatio, d + 0.25));
  }, [quality.dpr]);

  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  return (
    <Canvas
      className="!absolute inset-0 touch-pan-y"
      dpr={dpr}
      flat
      frameloop={active ? "always" : "never"}
      gl={{
        antialias: false,
        alpha: false,
        stencil: false,
        powerPreference: "high-performance",
      }}
      camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV, near: 0.1, far: 50 }}
      onCreated={({ gl }) => {
        gl.setClearColor("#020308", 1);
        const canvas = gl.domElement;
        const lost = (e: Event) => {
          e.preventDefault(); // allow the browser to restore the context
          onContextLost();
        };
        const restored = () => onContextRestored();
        canvas.addEventListener("webglcontextlost", lost);
        canvas.addEventListener("webglcontextrestored", restored);
        cleanupRef.current = () => {
          canvas.removeEventListener("webglcontextlost", lost);
          canvas.removeEventListener("webglcontextrestored", restored);
        };
      }}
    >
      <PerformanceMonitor onDecline={handleDecline} onIncline={handleIncline} flipflops={3} />

      <Backdrop interaction={interaction} reducedMotion={reducedMotion} started={started} />
      <ParticleField
        count={quality.particleCount}
        enabled={settings.particles}
        reducedMotion={reducedMotion}
        interaction={interaction}
      />
      <LiquidOrb
        settings={settings}
        quality={quality}
        reducedMotion={reducedMotion}
        resetSignal={resetSignal}
        interaction={interaction}
        started={started}
        customCursor={customCursor}
        onDiscover={onDiscover}
        onReady={onReady}
      />

      <Effects bloom={bloom} multisampling={quality.multisampling} />
    </Canvas>
  );
}
