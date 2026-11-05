"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, animate, motion, type AnimationPlaybackControls } from "motion/react";

import Navigation, { type SceneStatus } from "./Navigation";
import { BottomBar, HeroContent } from "./HeroContent";
import OrbControls from "./OrbControls";
import InteractionHint from "./InteractionHint";
import Loader from "./Loader";
import CustomCursor from "./CustomCursor";
import ExperimentNotes from "./ExperimentNotes";
import {
  DEFAULT_PRESET,
  DEFAULT_SETTINGS,
  PRESETS,
  QUALITY_HIGH,
  QUALITY_MOBILE,
  createInteraction,
  type Discovery,
  type Interaction,
  type NumericSetting,
  type OrbSettings,
  type PresetId,
} from "@/lib/experience";

const OrbScene = dynamic(() => import("./OrbScene"), { ssr: false });

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

type GLStatus = "checking" | "ok" | "unsupported";

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const ok = !!ctx;
    (ctx as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

const NUMERIC_KEYS: NumericSetting[] = [
  "rotationSpeed",
  "distortion",
  "transmission",
  "iridescence",
  "dispersion",
  "liquid",
];

export default function Experience() {
  const [settings, setSettings] = useState<OrbSettings>(DEFAULT_SETTINGS);
  const [activePreset, setActivePreset] = useState<PresetId | null>(DEFAULT_PRESET);
  const [resetSignal, setResetSignal] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [glStatus, setGlStatus] = useState<GLStatus>("checking");
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [discovered, setDiscovered] = useState<ReadonlySet<Discovery>>(() => new Set());
  const [heroVisible, setHeroVisible] = useState(true);

  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const compact = useMediaQuery("(max-width: 767px), (pointer: coarse)");
  const finePointer = useMediaQuery("(pointer: fine)");
  const quality = compact ? QUALITY_MOBILE : QUALITY_HIGH;

  const interactionRef = useRef<Interaction>(null);
  if (!interactionRef.current) interactionRef.current = createInteraction();
  const interaction = interactionRef.current;

  const heroRef = useRef<HTMLElement>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const tweenRef = useRef<AnimationPlaybackControls | null>(null);

  useEffect(() => {
    const ok = detectWebGL();
    setGlStatus(ok ? "ok" : "unsupported");
    if (!ok) setSceneReady(true);
    // Controls start open on wide landscape screens, tucked away elsewhere.
    setPanelOpen(window.matchMedia("(min-width: 768px) and (orientation: landscape)").matches);
  }, []);

  // Pause rendering when the hero scrolls out of view.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), { threshold: 0.02 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => () => tweenRef.current?.stop(), []);

  /** Glide every numeric parameter to `target`, so sliders visibly travel. */
  const tweenTo = useCallback(
    (target: Pick<OrbSettings, NumericSetting>) => {
      tweenRef.current?.stop();
      const from = { ...settingsRef.current };
      tweenRef.current = animate(0, 1, {
        duration: reducedMotion ? 0 : 0.9,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (p) =>
          setSettings((s) => {
            const next = { ...s };
            for (const k of NUMERIC_KEYS) next[k] = from[k] + (target[k] - from[k]) * p;
            return next;
          }),
      });
    },
    [reducedMotion],
  );

  const handlePreset = useCallback(
    (id: PresetId) => {
      const preset = PRESETS.find((p) => p.id === id);
      if (!preset) return;
      setActivePreset(id);
      tweenTo(preset.values);
    },
    [tweenTo],
  );

  const handleSetting = useCallback((key: NumericSetting, value: number) => {
    tweenRef.current?.stop();
    setActivePreset(null);
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  const handleParticles = useCallback((on: boolean) => setSettings((s) => ({ ...s, particles: on })), []);

  const handleReset = useCallback(() => {
    setActivePreset(DEFAULT_PRESET);
    setSettings((s) => ({ ...s, particles: true }));
    tweenTo(DEFAULT_SETTINGS);
    setResetSignal((n) => n + 1);
  }, [tweenTo]);

  const handleDiscover = useCallback((d: Discovery) => {
    setDiscovered((prev) => {
      if (prev.has(d)) return prev;
      const next = new Set(prev);
      next.add(d);
      return next;
    });
  }, []);

  const handleReady = useCallback(() => setSceneReady(true), []);
  const handleLoaded = useCallback(() => setLoaded(true), []);
  const handleContextLost = useCallback(() => setContextLost(true), []);
  const rebuildScene = useCallback(() => {
    setContextLost(false);
    setCanvasKey((k) => k + 1);
  }, []);

  // If the browser doesn't restore a lost context on its own, rebuild the canvas.
  useEffect(() => {
    if (!contextLost) return;
    const id = window.setTimeout(rebuildScene, 2500);
    return () => window.clearTimeout(id);
  }, [contextLost, rebuildScene]);

  const scrollToNotes = useCallback(() => {
    document.getElementById("notes")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  }, [reducedMotion]);
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }, [reducedMotion]);

  const status: SceneStatus =
    glStatus === "unsupported"
      ? "offline"
      : !loaded
        ? "loading"
        : contextLost || !heroVisible
          ? "paused"
          : "live";

  const showFallback = glStatus === "unsupported" || contextLost;
  const sceneOn = glStatus === "ok";

  return (
    <div id="top">
      <Loader ready={sceneReady} reducedMotion={reducedMotion} onDone={handleLoaded} />

      <main>
        <section ref={heroRef} aria-label="Liquid Glass experiment" className="relative h-dvh w-full overflow-hidden bg-bg">
          {sceneOn && (
            <div className={`absolute inset-0 transition-opacity duration-500 ${contextLost ? "opacity-0" : ""}`}>
              <OrbScene
                key={canvasKey}
                settings={settings}
                quality={quality}
                interaction={interaction}
                reducedMotion={reducedMotion}
                resetSignal={resetSignal}
                started={loaded}
                active={heroVisible}
                customCursor={finePointer}
                onDiscover={handleDiscover}
                onReady={handleReady}
                onContextLost={handleContextLost}
                onContextRestored={rebuildScene}
              />
            </div>
          )}

          <AnimatePresence>
            {showFallback && <FallbackStage lost={contextLost} onRestore={contextLost ? rebuildScene : undefined} />}
          </AnimatePresence>

          <Navigation status={status} show={loaded} />
          <HeroContent show={loaded} />
          <BottomBar show={loaded} interacted={discovered.size > 0} onShowNotes={scrollToNotes} />

          {sceneOn && !contextLost && (
            <>
              <InteractionHint discovered={discovered} show={loaded} />
              <OrbControls
                settings={settings}
                activePreset={activePreset}
                open={panelOpen}
                show={loaded}
                onOpenChange={setPanelOpen}
                onSetting={handleSetting}
                onParticles={handleParticles}
                onPreset={handlePreset}
                onReset={handleReset}
              />
            </>
          )}
        </section>

        <ExperimentNotes onBackToTop={scrollToTop} />
      </main>

      {sceneOn && finePointer && <CustomCursor interaction={interaction} reducedMotion={reducedMotion} />}
    </div>
  );
}

function FallbackStage({ lost, onRestore }: { lost: boolean; onRestore?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0 grid place-items-center"
    >
      <div className="flex -translate-y-[8vh] flex-col items-center gap-8 wide:translate-y-0">
        <div className="fallback-orb h-[min(50vh,72vw)] w-[min(50vh,72vw)]" aria-hidden />
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-[13px] text-fg/60">
            {lost
              ? "The graphics context was interrupted. Restoring the scene."
              : "This browser can't run WebGL, so you're seeing a still preview."}
          </p>
          {onRestore && (
            <button
              type="button"
              onClick={onRestore}
              className="rounded-full border border-line px-4 py-2 text-[12.5px] text-fg/75 transition-colors hover:border-white/20 hover:text-fg"
            >
              Reload scene
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
