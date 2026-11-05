"use client";

import { AnimatePresence, motion } from "motion/react";

import type { Discovery } from "@/lib/experience";

type Hint = { id: Discovery; fine: string; coarse: string };

// Each hint points at the next thing the visitor hasn't tried yet.
const HINTS: Hint[] = [
  { id: "move", fine: "Move your cursor near the glass", coarse: "Touch the glass" },
  { id: "click", fine: "Click the glass", coarse: "Tap the glass" },
  { id: "double", fine: "Double-click to send a wave", coarse: "Double-tap to send a wave" },
  { id: "drag", fine: "Drag to turn it by hand", coarse: "Drag the orb to turn it" },
];

type InteractionHintProps = {
  discovered: ReadonlySet<Discovery>;
  show: boolean;
};

export default function InteractionHint({ discovered, show }: InteractionHintProps) {
  const next = HINTS.find((h) => !discovered.has(h.id));

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[58.5%] z-10 flex justify-center wide:top-[83%]"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {show && next && (
          <motion.div
            key={next.id}
            initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, delay: 1.1 } }}
            exit={{ opacity: 0, y: -4, filter: "blur(4px)", transition: { duration: 0.45 } }}
            className="flex items-center gap-3 whitespace-nowrap text-[12.5px] tracking-[0.01em] text-fg/60"
          >
            <span className="relative grid h-3.5 w-3.5 place-items-center" aria-hidden>
              <span className="absolute inset-0 animate-ping rounded-full border border-accent/40 [animation-duration:2.6s]" />
              <span className="h-1 w-1 rounded-full bg-accent" />
            </span>
            <span className="pointer-coarse:hidden">{next.fine}</span>
            <span className="hidden pointer-coarse:inline">{next.coarse}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
