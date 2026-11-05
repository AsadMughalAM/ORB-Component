import * as THREE from "three";

export type OrbSettings = {
  /** Multiplier for the idle spin. 0 = still, 1 = default. */
  rotationSpeed: number;
  /** Multiplier for the organic surface deformation. */
  distortion: number;
  /** 0 = dense sapphire glass, 1 = perfectly clear glass. */
  transmission: number;
  /** Strength of the thin-film colour play on reflections (preset-driven). */
  iridescence: number;
  /** Spread between per-channel refraction indices (preset-driven). */
  dispersion: number;
  /** Visibility and speed of the liquid inside the shell (preset-driven). */
  liquid: number;
  particles: boolean;
};

export type NumericSetting = Exclude<keyof OrbSettings, "particles">;

export type PresetId = "crystal" | "aurora" | "liquid";

export type Preset = {
  id: PresetId;
  index: string;
  name: string;
  summary: string;
  values: Pick<OrbSettings, NumericSetting>;
};

export const PRESETS: Preset[] = [
  {
    id: "crystal",
    index: "01",
    name: "Crystal",
    summary: "Clear glass, quiet reflections",
    values: { rotationSpeed: 0.6, distortion: 0.5, transmission: 1, iridescence: 0.2, dispersion: 0.8, liquid: 0.45 },
  },
  {
    id: "aurora",
    index: "02",
    name: "Aurora",
    summary: "Cyan and violet colour play",
    values: { rotationSpeed: 0.9, distortion: 0.85, transmission: 0.9, iridescence: 1, dispersion: 1.7, liquid: 0.85 },
  },
  {
    id: "liquid",
    index: "03",
    name: "Liquid",
    summary: "Softer shape, more movement",
    values: { rotationSpeed: 0.75, distortion: 2, transmission: 0.82, iridescence: 0.45, dispersion: 1.1, liquid: 1.5 },
  },
];

export const DEFAULT_PRESET: PresetId = "crystal";

export const DEFAULT_SETTINGS: OrbSettings = {
  ...PRESETS[0].values,
  particles: true,
};

export type Quality = {
  /** Icosahedron subdivision level for the glass shell. */
  shellDetail: number;
  /** Resolution scale of the background refraction capture. */
  captureScale: number;
  /** Resolution scale of the inner-liquid capture. */
  coreScale: number;
  /** Cheaper glass shader: single refraction path, no micro-surface detail. */
  lowShader: boolean;
  particleCount: number;
  dpr: [number, number];
  bloom: boolean;
  multisampling: number;
};

export const QUALITY_HIGH: Quality = {
  shellDetail: 56,
  captureScale: 0.85,
  coreScale: 0.5,
  lowShader: false,
  particleCount: 180,
  dpr: [1, 2],
  bloom: true,
  multisampling: 4,
};

export const QUALITY_MOBILE: Quality = {
  shellDetail: 32,
  captureScale: 0.55,
  coreScale: 0.4,
  lowShader: true,
  particleCount: 80,
  dpr: [1, 1.5],
  bloom: true,
  multisampling: 2,
};

/** First-time discoveries that drive the contextual hints. */
export type Discovery = "move" | "click" | "double" | "drag";

/**
 * Mutable, per-frame interaction state shared between the scene and the DOM
 * (custom cursor). Lives in a ref so pointer movement never re-renders React.
 */
export type Interaction = {
  /** Raw pointer position in normalised device coordinates. */
  pointer: THREE.Vector2;
  /** Damped pointer position. */
  smoothed: THREE.Vector2;
  /** Whether a pointer is currently over the experience. */
  active: boolean;
  /** Damped 0..1 version of `active`. */
  presence: number;
  /** Cursor is over the orb. */
  hovered: boolean;
  /** User is drag-rotating the orb. */
  dragging: boolean;
  /** World-space centre + radius of the orb (written by LiquidOrb). */
  orbCenter: THREE.Vector3;
  orbRadius: number;
};

export function createInteraction(): Interaction {
  return {
    pointer: new THREE.Vector2(),
    smoothed: new THREE.Vector2(),
    active: false,
    presence: 0,
    hovered: false,
    dragging: false,
    orbCenter: new THREE.Vector3(),
    orbRadius: 1,
  };
}

export const PALETTE = {
  cyan: "#6be6ff",
  blue: "#2f6bff",
  sapphire: "#0e2a8c",
  violet: "#8c6bff",
  silver: "#e6ecf8",
  navy: "#070c22",
} as const;

export const CAMERA_Z = 6;
export const CAMERA_FOV = 35;
export const BACKDROP_Z = -4;
/** Render layer used for the inner liquid, which only exists in its own capture. */
export const CORE_LAYER = 1;
