"use client";

import { AnimatePresence, motion, type Variants } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.35 } },
};

const fade: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 1.1, ease: EASE } },
};

// Lines rise out of a mask, like type set on a sheet of glass.
const line: Variants = {
  hidden: { y: "108%" },
  show: { y: "0%", transition: { duration: 1.4, ease: EASE } },
};

export function HeroContent({ show }: { show: boolean }) {
  return (
    <motion.section
      variants={container}
      initial="hidden"
      animate={show ? "show" : "hidden"}
      aria-labelledby="hero-title"
      className="pointer-events-none absolute inset-x-5 bottom-[92px] z-10 select-none wide:inset-x-auto wide:bottom-auto wide:left-10 wide:top-1/2 wide:-translate-y-1/2"
    >
      <motion.p variants={fade} className="label mb-5 flex items-center gap-3 wide:mb-8">
        <span className="h-px w-7 bg-faint" aria-hidden />
        Interactive 3D Experiment — 001
      </motion.p>

      <h1
        id="hero-title"
        className="headline text-[clamp(56px,16vw,104px)] leading-[0.92] wide:text-[clamp(56px,min(9vw,19vh),190px)] wide:leading-[0.88]"
      >
        <span className="block overflow-hidden pb-[0.06em]">
          <motion.span variants={line} className="headline-sheen inline-block">
            Liquid
          </motion.span>
        </span>
        <span className="block overflow-hidden pb-[0.08em] wide:pl-[0.55em]">
          <motion.span variants={line} className="headline-sheen inline-block">
            Glass.
          </motion.span>
        </span>
      </h1>

      <motion.p
        variants={fade}
        className="mt-5 max-w-[26ch] text-[15px] leading-[1.6] text-fg/65 wide:mt-9 wide:max-w-[24ch] wide:pl-[0.15em] wide:text-[16px]"
      >
        An exploration of light, fluidity and digital matter.
      </motion.p>
    </motion.section>
  );
}

type BottomBarProps = {
  show: boolean;
  interacted: boolean;
  onShowNotes: () => void;
};

export function BottomBar({ show, interacted, onShowNotes }: BottomBarProps) {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={show ? { opacity: 1 } : undefined}
      transition={{ duration: 1.4, delay: 0.9 }}
      className="label pointer-events-none absolute inset-x-0 bottom-0 z-20 grid grid-cols-2 items-end gap-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] wide:grid-cols-3 wide:px-10 wide:pb-8"
    >
      <span className="flex items-center gap-3">
        <span className="hidden h-px w-7 bg-faint wide:block" aria-hidden />
        Real-time interaction
      </span>
      <span className="hidden text-center wide:block">Built with React Three Fiber</span>

      <span className="relative flex justify-end">
        <AnimatePresence mode="wait" initial={false}>
          {!interacted ? (
            <motion.span
              key="explore"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="text-fg/85"
            >
              <span className="pointer-coarse:hidden">Move your cursor to explore</span>
              <span className="hidden pointer-coarse:inline">Touch to explore</span>
              <span className="ml-1.5 inline-block text-accent">↗</span>
            </motion.span>
          ) : (
            <motion.button
              key="notes"
              type="button"
              onClick={onShowNotes}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.4 }}
              className="label pointer-events-auto rounded-sm transition-colors hover:text-fg"
            >
              Notes on the experiment <span className="ml-1 inline-block">↓</span>
            </motion.button>
          )}
        </AnimatePresence>
      </span>
    </motion.footer>
  );
}
