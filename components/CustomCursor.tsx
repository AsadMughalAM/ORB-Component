"use client";

import { useEffect, useRef } from "react";

import type { Interaction } from "@/lib/experience";

type CustomCursorProps = {
  interaction: Interaction;
  reducedMotion: boolean;
};

/**
 * A ring that trails the pointer over the 3D scene. It grows and offers
 * "Drag" over the orb, tightens while dragging, and steps aside over UI
 * controls so the native cursor is used there. Driven by rAF + refs only.
 */
export default function CustomCursor({ interaction, reducedMotion }: CustomCursorProps) {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    const dot = dotRef.current;
    const label = labelRef.current;
    if (!ring || !dot || !label) return;

    let x = -100;
    let y = -100;
    let rx = x;
    let ry = y;
    let size = 30;
    let opacity = 0;
    let overScene = false;
    let raf = 0;
    let last = performance.now();

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      overScene = e.target instanceof HTMLCanvasElement;
    };
    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) overScene = false;
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const follow = reducedMotion ? 1 : 1 - Math.exp(-dt * 22);
      rx += (x - rx) * follow;
      ry += (y - ry) * follow;

      const targetSize = interaction.dragging ? 42 : interaction.hovered ? 72 : 30;
      size += (targetSize - size) * (1 - Math.exp(-dt * 12));
      const targetOpacity = overScene ? 1 : 0;
      opacity += (targetOpacity - opacity) * (1 - Math.exp(-dt * 14));

      ring.style.transform = `translate3d(${rx - size / 2}px, ${ry - size / 2}px, 0)`;
      ring.style.width = ring.style.height = `${size}px`;
      ring.style.opacity = String(opacity);
      ring.style.backgroundColor = interaction.dragging ? "rgba(233,238,248,0.08)" : "transparent";
      dot.style.transform = `translate3d(${x - 2}px, ${y - 2}px, 0)`;
      const labelled = interaction.hovered && !interaction.dragging;
      dot.style.opacity = labelled ? "0" : String(opacity);
      label.style.opacity = labelled ? "1" : "0";

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseout", onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [interaction, reducedMotion]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40">
      <div
        ref={ringRef}
        className="absolute left-0 top-0 grid place-items-center rounded-full border border-white/35 opacity-0 backdrop-blur-[1px]"
        style={{ width: 30, height: 30 }}
      >
        <span
          ref={labelRef}
          className="font-mono text-[9px] uppercase tracking-[0.2em] text-fg/80 opacity-0 transition-opacity duration-300"
        >
          Drag
        </span>
      </div>
      <div ref={dotRef} className="absolute left-0 top-0 h-1 w-1 rounded-full bg-fg opacity-0" />
    </div>
  );
}
