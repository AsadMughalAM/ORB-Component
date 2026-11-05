"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

import noise from "@/shaders/noise.glsl";
import liquidVertex from "@/shaders/liquidVertex.glsl";
import liquidFragment from "@/shaders/liquidFragment.glsl";
import coreVertex from "@/shaders/coreVertex.glsl";
import coreFragment from "@/shaders/coreFragment.glsl";
import {
  BACKDROP_Z,
  CORE_LAYER,
  PALETTE,
  type Discovery,
  type Interaction,
  type OrbSettings,
  type Quality,
} from "@/lib/experience";

type LiquidOrbProps = {
  settings: OrbSettings;
  quality: Quality;
  reducedMotion: boolean;
  resetSignal: number;
  interaction: Interaction;
  /** Begin the intro animation (after the loader). */
  started: boolean;
  /** A custom DOM cursor is drawn, so hide the native one over the canvas. */
  customCursor: boolean;
  onDiscover: (d: Discovery) => void;
  onReady: () => void;
};

const TAU = Math.PI * 2;
const TAP_MAX_MS = 350;
const TAP_MAX_PX = 8;
const DRAG_START_PX = 6;
const DOUBLE_TAP_MS = 320;
const DRAG_RADIANS_PER_PX = 0.0065;

const { damp } = THREE.MathUtils;
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const IDENTITY = new THREE.Quaternion();

export default function LiquidOrb({
  settings,
  quality,
  reducedMotion,
  resetSignal,
  interaction,
  started,
  customCursor,
  onDiscover,
  onReady,
}: LiquidOrbProps) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);

  const rootRef = useRef<THREE.Group>(null);
  const dragRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  // Latest props, readable from the render loop and listeners without re-subscribing.
  const latest = useRef({ settings, reducedMotion, started, customCursor, onDiscover, onReady, resetSignal });
  latest.current = { settings, reducedMotion, started, customCursor, onDiscover, onReady, resetSignal };

  // ---- GPU resources ------------------------------------------------------
  const targets = useMemo(() => {
    const opts = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      stencilBuffer: false,
    } as const;
    return {
      scene: new THREE.WebGLRenderTarget(1, 1, { ...opts, depthBuffer: true }),
      core: new THREE.WebGLRenderTarget(1, 1, { ...opts, depthBuffer: false }),
    };
  }, []);

  const shellGeometry = useMemo(
    () => new THREE.IcosahedronGeometry(1, quality.shellDetail),
    [quality.shellDetail],
  );
  const coreGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 18), []);

  const colors = useMemo(
    () => ({
      uCyan: { value: new THREE.Color(PALETTE.cyan) },
      uBlue: { value: new THREE.Color(PALETTE.blue) },
      uSapphire: { value: new THREE.Color(PALETTE.sapphire) },
      uViolet: { value: new THREE.Color(PALETTE.violet) },
      uSilver: { value: new THREE.Color(PALETTE.silver) },
    }),
    [],
  );

  const shellMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: noise + liquidVertex,
        fragmentShader: noise + liquidFragment,
        defines: quality.lowShader ? { LOW_QUALITY: "" } : {},
        uniforms: {
          ...colors,
          uScene: { value: targets.scene.texture },
          uCore: { value: targets.core.texture },
          uTime: { value: 0 },
          uDistortion: { value: 1 },
          uPointerDir: { value: new THREE.Vector3(0, 0, 1) },
          uPointerForce: { value: 0 },
          uRipple: { value: 0 },
          uPulseOrigin: { value: new THREE.Vector3(0, 0, 1) },
          uPulseTime: { value: 100 },
          uPulseStrength: { value: 0 },
          uTransmission: { value: 1 },
          uIridescence: { value: 0.2 },
          uDispersion: { value: 1 },
          uLiquid: { value: 0.5 },
          uHover: { value: 0 },
          uIntro: { value: 0 },
          uFlash: { value: 0 },
          uOrbCenter: { value: new THREE.Vector3() },
          uOrbRadius: { value: 1 },
          uBackZ: { value: BACKDROP_Z },
          uKeyDir: { value: new THREE.Vector3(-0.45, 0.55, 0.7).normalize() },
        },
      }),
    [colors, targets, quality.lowShader],
  );

  const coreMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: noise + coreVertex,
        fragmentShader: coreFragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          ...colors,
          uFlow: { value: 0 },
          uDistortion: { value: 1 },
          uIntensity: { value: 0 },
          uPulse: { value: 0 },
          uPointerDir: { value: new THREE.Vector3(0, 0, 1) },
          uPointerForce: { value: 0 },
        },
      }),
    [colors],
  );

  useEffect(
    () => () => {
      targets.scene.dispose();
      targets.core.dispose();
    },
    [targets],
  );
  useEffect(() => () => shellMaterial.dispose(), [shellMaterial]);
  useEffect(() => () => coreMaterial.dispose(), [coreMaterial]);
  useEffect(() => () => shellGeometry.dispose(), [shellGeometry]);
  useEffect(() => () => coreGeometry.dispose(), [coreGeometry]);

  // The liquid only ever renders into its own capture.
  useEffect(() => {
    coreRef.current?.layers.set(CORE_LAYER);
  }, []);

  // ---- Simulation state (never touches React state) -----------------------
  const sim = useRef({
    time: 0,
    flow: 0,
    introT: 0,
    frames: 0,
    readySent: false,
    spin: 0,
    resetting: false,
    hover: 0,
    force: 0,
    ripple: 0,
    flash: 0,
    pulseTime: 100,
    pulseStrength: 0,
    pendingDrag: new THREE.Vector2(),
    dragVel: new THREE.Vector2(), // radians / second
    dragEnergy: 0,
    prevPointer: new THREE.Vector2(),
    pointerDir: new THREE.Vector3(0, 0, 1),
    targetDir: new THREE.Vector3(0, 0, 1),
    distortion: 1,
    transmission: 1,
    rotationSpeed: 1,
    iridescence: 0.2,
    dispersion: 1,
    liquid: 0.5,
    lastResetSignal: resetSignal,
  });

  // Scratch objects reused every frame.
  const scratch = useMemo(
    () => ({
      raycaster: new THREE.Raycaster(),
      sphere: new THREE.Sphere(),
      hit: new THREE.Vector3(),
      closest: new THREE.Vector3(),
      ndc: new THREE.Vector2(),
      buffer: new THREE.Vector2(),
      key: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      clear: new THREE.Color(),
    }),
    [],
  );

  /**
   * Analytic ray / sphere test against the orb's bounding sphere.
   * Returns proximity in 0..1 (1 = on the orb) and writes the object-space
   * direction toward the pointer into `outDir`.
   */
  const probe = useMemo(() => {
    return (ndc: THREE.Vector2, outDir: THREE.Vector3) => {
      const spin = spinRef.current;
      if (!spin) return 0;
      const { raycaster, sphere, hit, closest } = scratch;
      raycaster.setFromCamera(ndc, camera);
      sphere.set(interaction.orbCenter, interaction.orbRadius);

      let proximity: number;
      if (raycaster.ray.intersectSphere(sphere, hit)) {
        proximity = 1;
      } else {
        raycaster.ray.closestPointToPoint(sphere.center, closest);
        const miss = closest.distanceTo(sphere.center) - sphere.radius;
        proximity = Math.exp((-miss / sphere.radius) * 3.0);
        hit.copy(closest);
      }
      spin.worldToLocal(outDir.copy(hit)).normalize();
      return proximity;
    };
  }, [camera, interaction, scratch]);

  // ---- Pointer listeners --------------------------------------------------
  useEffect(() => {
    const canvas = gl.domElement;
    const s = sim.current;
    const found = new Set<Discovery>();
    let press: { x: number; y: number; lastX: number; lastY: number; t: number; id: number } | null = null;
    let lastTap = 0;

    const discover = (d: Discovery) => {
      if (found.has(d)) return;
      found.add(d);
      latest.current.onDiscover(d);
    };

    const toNdc = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      interaction.pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
    };

    const onOrb = () => {
      scratch.ndc.copy(interaction.pointer);
      return probe(scratch.ndc, scratch.dir) >= 1;
    };

    const onMove = (e: PointerEvent) => {
      toNdc(e);
      interaction.active = true;
      if (e.target === canvas) discover("move");

      if (press && press.id === e.pointerId) {
        const dx = e.clientX - press.lastX;
        const dy = e.clientY - press.lastY;
        press.lastX = e.clientX;
        press.lastY = e.clientY;
        if (!interaction.dragging && Math.hypot(e.clientX - press.x, e.clientY - press.y) > DRAG_START_PX) {
          interaction.dragging = true;
          discover("drag");
        }
        if (interaction.dragging) s.pendingDrag.add(scratch.ndc.set(dx, dy));
      }
    };

    const onDown = (e: PointerEvent) => {
      toNdc(e);
      interaction.active = true;
      if (e.target !== canvas || e.button > 0) return;
      discover("move");
      press = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, t: performance.now(), id: e.pointerId };
      s.dragVel.set(0, 0);
    };

    const triggerPulse = (strong: boolean) => {
      shellMaterial.uniforms.uPulseOrigin.value.copy(scratch.dir);
      s.pulseTime = 0;
      s.pulseStrength = strong ? 1.6 : 0.65;
      s.flash = strong ? 1 : 0.6;
    };

    const onUp = (e: PointerEvent) => {
      toNdc(e);
      const p = press;
      const wasDragging = interaction.dragging;
      press = null;
      interaction.dragging = false;
      if (e.pointerType !== "mouse") interaction.active = false;
      if (!p || p.id !== e.pointerId || wasDragging || e.target !== canvas) return;

      const now = performance.now();
      if (now - p.t > TAP_MAX_MS || Math.hypot(e.clientX - p.x, e.clientY - p.y) > TAP_MAX_PX) return;
      if (!onOrb()) return;

      if (now - lastTap < DOUBLE_TAP_MS) {
        triggerPulse(true);
        discover("double");
        lastTap = 0;
      } else {
        triggerPulse(false);
        discover("click");
        lastTap = now;
      }
    };

    const onCancel = () => {
      press = null;
      interaction.dragging = false;
      interaction.active = false;
    };
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) interaction.active = false;
    };

    // Touches that begin on the orb shouldn't scroll the page; others may.
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const rect = canvas.getBoundingClientRect();
      scratch.ndc.set(
        ((t.clientX - rect.left) / rect.width) * 2 - 1,
        -((t.clientY - rect.top) / rect.height) * 2 + 1,
      );
      if (probe(scratch.ndc, scratch.dir) >= 1) e.preventDefault();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
    document.addEventListener("mouseout", onOut);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
      document.removeEventListener("mouseout", onOut);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.style.cursor = "";
    };
  }, [gl, interaction, probe, scratch, shellMaterial]);

  // ---- Frame loop -----------------------------------------------------------
  useFrame((state, rawDelta) => {
    const root = rootRef.current;
    const dragGroup = dragRef.current;
    const spin = spinRef.current;
    const shell = shellRef.current;
    if (!root || !dragGroup || !spin || !shell) return;

    const s = sim.current;
    const { settings: cfg, reducedMotion: reduced, started: isStarted, customCursor: custom } = latest.current;
    const dt = Math.min(rawDelta, 1 / 20); // avoid jumps after tab switches
    const timeScale = reduced ? 0.35 : 1;

    s.time += dt * timeScale;
    // Intro runs on wall-clock time so it always lasts ~2.6s, even on slow devices.
    if (isStarted) s.introT = Math.min(s.introT + rawDelta / 2.6, 1);
    const intro = 1 - Math.pow(1 - s.introT, 3);

    // Reset request from the UI.
    if (latest.current.resetSignal !== s.lastResetSignal) {
      s.lastResetSignal = latest.current.resetSignal;
      s.resetting = true;
      s.pulseStrength = 0;
      s.ripple = 0;
      s.dragVel.set(0, 0);
      s.flash = 0.4;
    }

    // Smooth settings so presets and sliders glide rather than snap.
    s.distortion = damp(s.distortion, cfg.distortion, 4, dt);
    s.transmission = damp(s.transmission, cfg.transmission, 4, dt);
    s.rotationSpeed = damp(s.rotationSpeed, cfg.rotationSpeed, 3, dt);
    s.iridescence = damp(s.iridescence, cfg.iridescence, 3, dt);
    s.dispersion = damp(s.dispersion, cfg.dispersion, 3, dt);
    s.liquid = damp(s.liquid, cfg.liquid, 3, dt);

    // ---- Pointer smoothing & velocity ----
    const target = interaction.active ? interaction.pointer : scratch.ndc.set(0, 0);
    interaction.smoothed.x = damp(interaction.smoothed.x, target.x, 4.5, dt);
    interaction.smoothed.y = damp(interaction.smoothed.y, target.y, 4.5, dt);
    interaction.presence = damp(interaction.presence, interaction.active ? 1 : 0, 3, dt);

    const speed =
      dt > 0
        ? Math.hypot(interaction.pointer.x - s.prevPointer.x, interaction.pointer.y - s.prevPointer.y) / dt
        : 0;
    s.prevPointer.copy(interaction.pointer);
    // Fast movement excites ripples; slow movement just leans the surface.
    const excite =
      interaction.active && !reduced && !interaction.dragging ? THREE.MathUtils.smoothstep(speed, 1.2, 6) : 0;
    s.ripple = Math.max(s.ripple * Math.exp(-dt * 1.8), excite);

    // ---- Layout: radius & position from the viewport, in pixels ----
    const vp = state.viewport;
    const W = state.size.width;
    const H = state.size.height;
    const pxToWorld = vp.width / W;
    const portrait = W / H < 0.85;
    const radiusPx = portrait
      ? Math.min(H * 0.19, W * 0.37)
      : Math.max(H * 0.2, Math.min(H * 0.29, W / 2 - 340, W * 0.3));
    const baseRadius = radiusPx * pxToWorld;
    const baseY = (portrait ? H * 0.1 : H * 0.01) * pxToWorld;

    // ---- Hover / proximity ----
    const proximity = interaction.active ? probe(interaction.smoothed, s.targetDir) : 0;
    const hovered = interaction.active && proximity >= 1;
    interaction.hovered = hovered;
    const cursor = custom ? "none" : interaction.dragging ? "grabbing" : hovered ? "grab" : "";
    if (gl.domElement.style.cursor !== cursor) gl.domElement.style.cursor = cursor;

    s.hover = damp(s.hover, hovered || interaction.dragging ? 1 : 0, 5, dt);
    s.force = damp(s.force, proximity * interaction.presence, 4, dt);
    s.pointerDir.lerp(s.targetDir, 1 - Math.exp(-6 * dt)).normalize();

    // ---- Pulses ----
    s.pulseTime += dt;
    s.flash = damp(s.flash, 0, 2.2, dt);
    if (s.pulseTime > 6) s.pulseStrength = 0;

    // ---- Transform ----
    const float = reduced ? 0.25 : 1;
    const t = s.time;
    const followX = interaction.smoothed.x * vp.width * 0.02;
    const followY = interaction.smoothed.y * vp.height * 0.018;
    root.position.set(
      followX + Math.sin(t * 0.31) * 0.02 * float,
      baseY + followY + Math.sin(t * 0.62) * 0.045 * float * baseRadius,
      0,
    );

    const pulseScale = Math.exp(-s.pulseTime * 3) * Math.sin(s.pulseTime * 12) * 0.012 * s.pulseStrength;
    const scale = baseRadius * (0.86 + 0.14 * intro) * (1 + s.hover * 0.03 + pulseScale);
    root.scale.setScalar(scale);

    // Tilt toward the cursor.
    root.rotation.x = damp(root.rotation.x, -interaction.smoothed.y * 0.3, 3, dt);
    root.rotation.y = damp(root.rotation.y, interaction.smoothed.x * 0.4, 3, dt);

    // Manual drag rotation with inertia.
    if (interaction.dragging && dt > 0) {
      const vx = (s.pendingDrag.x * DRAG_RADIANS_PER_PX) / dt;
      const vy = (s.pendingDrag.y * DRAG_RADIANS_PER_PX) / dt;
      s.dragVel.x = damp(s.dragVel.x, vx, 18, dt);
      s.dragVel.y = damp(s.dragVel.y, vy, 18, dt);
    } else {
      s.dragVel.multiplyScalar(Math.exp(-dt * 2.4));
    }
    s.pendingDrag.set(0, 0);
    if (s.dragVel.lengthSq() > 1e-6) {
      dragGroup.quaternion.premultiply(scratch.q.setFromAxisAngle(AXIS_Y, s.dragVel.x * dt));
      dragGroup.quaternion.premultiply(scratch.q.setFromAxisAngle(AXIS_X, s.dragVel.y * dt));
    }
    s.dragEnergy = damp(s.dragEnergy, Math.min(s.dragVel.length() / 4, 1), 6, dt);

    // Idle spin.
    if (s.resetting) {
      const home = Math.round(s.spin / TAU) * TAU;
      s.spin = damp(s.spin, home, 3, dt);
      dragGroup.quaternion.slerp(IDENTITY, 1 - Math.exp(-3 * dt));
      if (Math.abs(s.spin - home) < 0.002 && dragGroup.quaternion.angleTo(IDENTITY) < 0.002) {
        s.spin = 0;
        dragGroup.quaternion.identity();
        s.resetting = false;
      }
    } else if (!interaction.dragging) {
      s.spin += dt * 0.16 * s.rotationSpeed * timeScale;
    }
    spin.rotation.set(Math.sin(t * 0.21) * 0.16 * float, s.spin, Math.cos(t * 0.17) * 0.09 * float);

    root.updateMatrixWorld();
    interaction.orbCenter.setFromMatrixPosition(root.matrixWorld);
    interaction.orbRadius = scale;

    // The liquid flows faster while the visitor plays with it.
    s.flow += dt * timeScale * (0.5 + s.liquid * 0.5) * (1 + s.ripple * 2 + s.dragEnergy * 3 + s.hover * 0.4 + s.flash * 2);

    // ---- Uniforms ----
    const u = shellMaterial.uniforms;
    u.uTime.value = t;
    u.uDistortion.value = s.distortion * (reduced ? 0.6 : 1);
    u.uPointerDir.value.copy(s.pointerDir);
    u.uPointerForce.value = s.force;
    u.uRipple.value = s.ripple;
    u.uPulseTime.value = s.pulseTime;
    u.uPulseStrength.value = s.pulseStrength;
    u.uTransmission.value = s.transmission;
    u.uIridescence.value = s.iridescence;
    u.uDispersion.value = s.dispersion;
    u.uLiquid.value = s.liquid;
    u.uHover.value = s.hover;
    u.uIntro.value = intro;
    u.uFlash.value = s.flash;
    u.uOrbCenter.value.copy(interaction.orbCenter);
    u.uOrbRadius.value = scale;
    // Key light swings with the cursor.
    scratch.key
      .set(-0.45 + interaction.smoothed.x * 0.9, 0.55 + interaction.smoothed.y * 0.6, 0.75)
      .normalize();
    u.uKeyDir.value.copy(scratch.key);

    const cu = coreMaterial.uniforms;
    cu.uFlow.value = s.flow;
    cu.uDistortion.value = s.distortion;
    cu.uIntensity.value = intro * s.liquid * (0.7 + 0.35 * s.hover) * (1.15 - s.transmission * 0.25);
    cu.uPulse.value = s.flash;
    cu.uPointerDir.value.copy(s.pointerDir);
    cu.uPointerForce.value = s.force;

    // ---- Captures ----
    gl.getDrawingBufferSize(scratch.buffer);
    const resize = (rt: THREE.WebGLRenderTarget, f: number) => {
      const w = Math.max(1, Math.floor(scratch.buffer.x * f));
      const h = Math.max(1, Math.floor(scratch.buffer.y * f));
      if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
    };
    resize(targets.scene, quality.captureScale);
    resize(targets.core, quality.coreScale);

    const prevTarget = gl.getRenderTarget();
    const cam = state.camera;
    gl.getClearColor(scratch.clear);
    const prevAlpha = gl.getClearAlpha();

    // 1. Backdrop + particles, without the shell.
    shell.visible = false;
    gl.setRenderTarget(targets.scene);
    gl.clear();
    gl.render(state.scene, cam);

    // 2. The inner liquid alone, on black.
    cam.layers.set(CORE_LAYER);
    gl.setRenderTarget(targets.core);
    gl.setClearColor(0x000000, 1);
    gl.clear();
    gl.render(state.scene, cam);
    cam.layers.set(0);

    gl.setClearColor(scratch.clear, prevAlpha);
    gl.setRenderTarget(prevTarget);
    shell.visible = true;

    // Tell the loader once the shaders have compiled and a few frames are out.
    if (!s.readySent && ++s.frames >= 3) {
      s.readySent = true;
      latest.current.onReady();
    }
  });

  return (
    <group ref={rootRef}>
      <group ref={dragRef}>
        <group ref={spinRef}>
          <mesh ref={coreRef} geometry={coreGeometry} material={coreMaterial} scale={0.58} frustumCulled={false} />
          <mesh ref={shellRef} geometry={shellGeometry} material={shellMaterial} />
        </group>
      </group>
    </group>
  );
}
