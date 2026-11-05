"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";

export type SceneStatus = "loading" | "live" | "paused" | "offline";

const EASE = [0.22, 1, 0.36, 1] as const;

const STATUS_COPY: Record<SceneStatus, string> = {
  loading: "Initializing",
  live: "Live Experiment",
  paused: "Paused",
  offline: "Static Preview",
};

/**
 * Status pill: reports what the scene is doing. Hover or focus reveals the
 * measured frame rate while it runs.
 */
function StatusIndicator({ status }: { status: SceneStatus }) {
  const fpsRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (status !== "live") return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      frames++;
      if (now - last >= 500) {
        const fps = Math.round((frames * 1000) / (now - last));
        if (fpsRef.current) fpsRef.current.textContent = `${fps} FPS`;
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status]);

  const dot =
    status === "live" ? "bg-accent live-dot" : status === "loading" ? "bg-fg/60 animate-pulse" : "bg-fg/30";

  return (
    <button
      type="button"
      tabIndex={0}
      aria-label={`Scene status: ${STATUS_COPY[status]}`}
      className="group label pointer-events-auto hidden cursor-default items-center gap-2.5 rounded-full py-1 pl-1 pr-1 text-fg/70 transition-colors hover:text-fg sm:flex"
    >
      <span className={`relative block h-[5px] w-[5px] rounded-full ${dot}`} aria-hidden />
      <span>{STATUS_COPY[status]}</span>
      {status === "live" && (
        <span
          ref={fpsRef}
          className="w-0 overflow-hidden whitespace-nowrap text-faint opacity-0 transition-all duration-500 group-hover:w-[52px] group-hover:opacity-100 group-focus-visible:w-[52px] group-focus-visible:opacity-100"
        >
          — FPS
        </span>
      )}
    </button>
  );
}

export default function Navigation({ status, show }: { status: SceneStatus; show: boolean }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={show ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 1.1, delay: 0.1, ease: EASE }}
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] wide:px-10 wide:pt-8"
    >
      <a
        href="#top"
        className="pointer-events-auto flex items-baseline gap-5 rounded-sm"
        aria-label="FORM / 001, Creative Experiments"
      >
        <span className="font-mono text-[12.5px] tracking-[0.22em] text-fg">
          FORM <span className="text-faint">/</span> 001
        </span>
        <span className="label hidden transition-colors duration-300 hover:text-fg/80 sm:inline">
          Creative Experiments
        </span>
      </a>

      <div className="flex items-center gap-5 wide:gap-8">
        <StatusIndicator status={status} />
        <span className="font-mono text-[12.5px] tracking-[0.22em] text-fg" aria-label="Experiment 1 of 10">
          01 <span className="text-faint">/ 010</span>
        </span>
      </div>
    </motion.header>
  );
}
