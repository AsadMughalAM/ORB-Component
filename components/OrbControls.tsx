"use client";

import { useId } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, RotateCcw, SlidersHorizontal } from "lucide-react";

import { PRESETS, type NumericSetting, type OrbSettings, type PresetId } from "@/lib/experience";

type OrbControlsProps = {
  settings: OrbSettings;
  activePreset: PresetId | null;
  open: boolean;
  show: boolean;
  onOpenChange: (open: boolean) => void;
  onSetting: (key: NumericSetting, value: number) => void;
  onParticles: (on: boolean) => void;
  onPreset: (id: PresetId) => void;
  onReset: () => void;
};

const EASE = [0.22, 1, 0.36, 1] as const;

export default function OrbControls({
  settings,
  activePreset,
  open,
  show,
  onOpenChange,
  onSetting,
  onParticles,
  onPreset,
  onReset,
}: OrbControlsProps) {
  const preset = PRESETS.find((p) => p.id === activePreset);

  return (
    <motion.div
      // Opacity only: a transform here would trap the mobile sheet's `position: fixed`.
      initial={{ opacity: 0 }}
      animate={show ? { opacity: 1 } : undefined}
      transition={{ duration: 1.1, delay: 0.7, ease: EASE }}
      className="absolute right-4 top-[64px] z-30 wide:right-10 wide:top-1/2 wide:-translate-y-1/2"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {open ? (
          <motion.div
            key="panel"
            id="orb-controls"
            role="region"
            aria-label="Experience controls"
            initial={{ opacity: 0, scale: 0.97, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.97, filter: "blur(6px)" }}
            transition={{ duration: 0.4, ease: EASE }}
            style={{ transformOrigin: "top right" }}
            className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] max-h-[78dvh] overflow-y-auto rounded-[18px] border border-white/[0.08] bg-[rgba(6,8,16,0.72)] shadow-[0_30px_80px_-24px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl backdrop-saturate-150 wide:static wide:max-h-[calc(100dvh-140px)] wide:w-[288px] wide:bg-[rgba(6,8,16,0.5)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-1 pt-4 short:pt-2.5">
              <span className="label text-fg/80">Parameters</span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Collapse controls"
                aria-controls="orb-controls"
                aria-expanded
                className="-mr-2 grid h-8 w-8 place-items-center rounded-full text-muted transition-colors duration-300 hover:bg-white/[0.06] hover:text-fg active:scale-95"
              >
                <Minus size={14} strokeWidth={1.5} />
              </button>
            </div>

            {/* Presets */}
            <div className="px-5 pt-3 short:pt-2">
              <div role="radiogroup" aria-label="Presets" className="grid grid-cols-3 gap-1.5 short:[&>button]:py-1.5">
                {PRESETS.map((p) => {
                  const active = p.id === activePreset;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onPreset(p.id)}
                      className={`group relative flex flex-col items-start gap-1 overflow-hidden rounded-[10px] border px-2.5 py-2 text-left transition-all duration-300 active:scale-[0.97] ${
                        active
                          ? "border-white/[0.16] bg-white/[0.06]"
                          : "border-transparent bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.04]"
                      }`}
                    >
                      <span
                        className={`font-mono text-[9.5px] tracking-[0.14em] transition-colors ${
                          active ? "text-accent" : "text-faint group-hover:text-muted"
                        }`}
                      >
                        {p.index}
                      </span>
                      <span className={`text-[12.5px] transition-colors ${active ? "text-fg" : "text-fg/65 group-hover:text-fg/85"}`}>
                        {p.name}
                      </span>
                      {active && (
                        <motion.span
                          layoutId="preset-glow"
                          className="absolute inset-x-2 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/80 to-transparent"
                          transition={{ duration: 0.5, ease: EASE }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2.5 h-4 text-[11.5px] text-faint short:hidden" aria-live="polite">
                {preset ? preset.summary : "Custom settings"}
              </p>
            </div>

            <div className="mx-5 my-4 h-px bg-line short:my-3" />

            {/* Sliders */}
            <div className="space-y-4 px-5 short:space-y-2">
              <Slider
                label="Rotation"
                value={settings.rotationSpeed}
                min={0}
                max={2.5}
                step={0.01}
                format={(v) => `${v.toFixed(2)}×`}
                onChange={(v) => onSetting("rotationSpeed", v)}
              />
              <Slider
                label="Distortion"
                value={settings.distortion}
                min={0}
                max={2.5}
                step={0.01}
                format={(v) => `${v.toFixed(2)}×`}
                onChange={(v) => onSetting("distortion", v)}
              />
              <Slider
                label="Transmission"
                value={settings.transmission}
                min={0}
                max={1}
                step={0.01}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => onSetting("transmission", v)}
              />
            </div>

            <div className="mx-5 my-4 h-px bg-line short:my-3" />

            <div className="px-5">
              <Toggle label="Ambient particles" checked={settings.particles} onChange={onParticles} />
            </div>

            <div className="px-5 pb-5 pt-4 short:pb-3.5 short:pt-3">
              <button
                type="button"
                onClick={onReset}
                className="group flex w-full items-center justify-center gap-2 rounded-full border border-white/[0.08] py-2.5 text-[12.5px] text-fg/70 transition-all duration-300 hover:border-white/[0.18] hover:bg-white/[0.04] hover:text-fg active:scale-[0.98]"
              >
                <RotateCcw
                  size={12}
                  strokeWidth={1.6}
                  className="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-[220deg]"
                />
                Reset experience
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="toggle"
            type="button"
            onClick={() => onOpenChange(true)}
            aria-label="Show controls"
            aria-controls="orb-controls"
            aria-expanded={false}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="group flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-[rgba(6,8,16,0.5)] py-2 pl-3 pr-3.5 text-fg/75 backdrop-blur-xl transition-colors duration-300 hover:border-white/[0.18] hover:text-fg active:scale-95"
          >
            <SlidersHorizontal size={12} strokeWidth={1.6} />
            <span className="label text-inherit">Parameters</span>
            {preset && <span className="text-[12px] text-faint transition-colors group-hover:text-muted">{preset.name}</span>}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
};

function Slider({ label, value, min, max, step, format, onChange }: SliderProps) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label htmlFor={id} className="text-[12.5px] text-fg/70">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-[11px] tabular-nums text-fg/90">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
      />
    </div>
  );
}

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
};

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between rounded-md py-1"
    >
      <span className="text-[12.5px] text-fg/70 transition-colors group-hover:text-fg/90">{label}</span>
      <span
        className={`relative h-[18px] w-[32px] rounded-full border transition-colors duration-500 ${
          checked ? "border-accent/40 bg-accent/[0.12]" : "border-white/[0.12] bg-white/[0.02]"
        }`}
      >
        <span
          className={`absolute top-1/2 h-[10px] w-[10px] -translate-y-1/2 rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            checked ? "left-[17px] bg-fg shadow-[0_0_12px_rgba(107,230,255,0.7)]" : "left-[3px] bg-white/35"
          }`}
        />
      </span>
    </button>
  );
}
