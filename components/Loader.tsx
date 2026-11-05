"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type LoaderProps = {
  /** The scene has compiled and rendered its first frames. */
  ready: boolean;
  reducedMotion: boolean;
  onDone: () => void;
};

const EASE = [0.22, 1, 0.36, 1] as const;
const MIN_VISIBLE_MS = 1100;

/**
 * A short initialisation sequence. Progress creeps toward 90% while the
 * scene compiles, then completes as soon as the first frames are out.
 */
export default function Loader({ ready, reducedMotion, onDone }: LoaderProps) {
  const [visible, setVisible] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    document.body.dataset.loading = "true";
    const start = performance.now();
    let shown = 0;
    let raf = 0;
    let finished = false;

    const tick = (now: number) => {
      const elapsed = now - start;
      const target = readyRef.current ? 100 : 90 * (1 - Math.exp(-elapsed / 900));
      shown += (target - shown) * (readyRef.current ? 0.14 : 0.06);
      if (barRef.current) barRef.current.style.transform = `scaleX(${shown / 100})`;
      if (pctRef.current) pctRef.current.textContent = String(Math.round(shown)).padStart(3, "0");

      const minTime = reducedMotion ? 300 : MIN_VISIBLE_MS;
      if (!finished && readyRef.current && shown > 99.5 && elapsed > minTime) {
        finished = true;
        setVisible(false);
        delete document.body.dataset.loading;
        doneRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      delete document.body.dataset.loading;
    };
  }, [reducedMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loader"
          role="status"
          aria-live="polite"
          aria-label="Loading the experience"
          className="fixed inset-0 z-50 flex flex-col justify-between bg-bg px-5 py-[max(1.25rem,env(safe-area-inset-top))] wide:px-10 wide:py-8"
          exit={{ opacity: 0, transition: { duration: reducedMotion ? 0.2 : 1, ease: EASE, delay: 0.15 } }}
        >
          <motion.span
            className="font-mono text-[12.5px] tracking-[0.2em] text-fg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.6 }}
          >
            FORM <span className="text-faint">/</span> 001
          </motion.span>

          <motion.div
            className="mx-auto w-full max-w-[340px]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <p className="label text-fg/85">Initializing experience</p>
            <div className="mt-5 h-px w-full overflow-hidden bg-line">
              <div
                ref={barRef}
                className="h-full w-full origin-left bg-gradient-to-r from-accent via-[#9fb4ff] to-accent-2"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <p className="label">Loading 3D environment…</p>
              <span ref={pctRef} className="font-mono text-[11px] tabular-nums text-fg/70">
                000
              </span>
            </div>
          </motion.div>

          <span className="label text-faint">Experiment 01 of 10</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
