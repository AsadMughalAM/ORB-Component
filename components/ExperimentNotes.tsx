"use client";

import { motion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

const NOTES = [
  {
    term: "Material",
    body: "Every pixel of the orb follows its ray of light into the sphere, out of the far side and on to the room behind it. It does this once for each colour channel, which is why the backdrop appears inverted and why the edges split into faint cyan and violet. Longer paths through the centre absorb a little red, leaving the deep sapphire at its core.",
  },
  {
    term: "Light",
    body: "A large soft key light follows your cursor. Two thin blue strip lights stand behind the orb to draw its rim, and a low violet fill lifts the shadow side. The small bright glint is a second, tighter light beside the key.",
  },
  {
    term: "Liquid",
    body: "Inside the glass is a separate body of liquid, rendered on its own and only ever seen through the front surface. It flows faster while you play with it and settles when you stop.",
  },
];

const GUIDE = [
  { action: "Move", result: "The orb leans toward you and the key light follows." },
  { action: "Click", result: "A soft pulse runs across the surface." },
  { action: "Double-click", result: "A stronger wave expands from where you clicked." },
  { action: "Drag", result: "Turn the orb by hand. Let go and it keeps some momentum." },
];

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-12% 0px" },
  transition: { duration: 1.1, ease: EASE },
} as const;

export default function ExperimentNotes({ onBackToTop }: { onBackToTop: () => void }) {
  return (
    <section
      id="notes"
      aria-labelledby="notes-title"
      className="relative overflow-hidden bg-bg px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-28 wide:px-10 wide:pt-40"
    >
      {/* Light spilling down from the hero above. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(14,42,140,0.22),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-[1180px]">
        <motion.h2
          {...reveal}
          id="notes-title"
          className="headline max-w-[17ch] text-[clamp(34px,6vw,72px)] leading-[1.02] text-fg"
        >
          A lens of glass, holding something that moves.
        </motion.h2>

        <motion.p
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.1 }}
          className="mt-8 max-w-[56ch] text-[16px] leading-[1.7] text-fg/65 wide:text-[17px]"
        >
          Experiment 001 asks how much of a scene a single object can carry. Nothing here is a video or a
          pre-rendered image: the orb is traced through glass, sixty times a second, while you watch.
        </motion.p>

        <dl className="mt-20 grid gap-x-16 border-t border-line wide:mt-28 wide:grid-cols-3">
          {NOTES.map((n, i) => (
            <motion.div
              key={n.term}
              {...reveal}
              transition={{ ...reveal.transition, delay: 0.08 * i }}
              className="border-b border-line py-8 wide:border-b-0 wide:pt-10"
            >
              <dt className="headline text-[26px] leading-none text-fg">{n.term}</dt>
              <dd className="mt-4 text-[14.5px] leading-[1.75] text-fg/60">{n.body}</dd>
            </motion.div>
          ))}
        </dl>

        <div className="mt-16 grid gap-12 wide:mt-28 wide:grid-cols-[1fr_1.4fr] wide:gap-16">
          <motion.div {...reveal}>
            <h3 className="headline text-[26px] leading-none text-fg">How to play</h3>
            <p className="mt-4 max-w-[32ch] text-[14.5px] leading-[1.75] text-fg/60">
              Each gesture changes the glass in a different way. On a phone, tap and drag the orb itself.
            </p>
          </motion.div>

          <motion.table {...reveal} className="w-full border-collapse text-left">
            <caption className="sr-only">Gestures and what they do</caption>
            <tbody>
              {GUIDE.map((g) => (
                <tr key={g.action} className="border-t border-line last:border-b">
                  <th scope="row" className="w-[34%] py-4 pr-6 align-top text-[14.5px] font-normal text-fg">
                    {g.action}
                  </th>
                  <td className="py-4 text-[14.5px] leading-[1.6] text-fg/60">{g.result}</td>
                </tr>
              ))}
            </tbody>
          </motion.table>
        </div>

        <motion.p {...reveal} className="mt-20 max-w-[62ch] text-[14.5px] leading-[1.75] text-fg/50 wide:mt-28">
          Built with Next.js, React Three Fiber and Three.js, with hand-written GLSL shaders for the glass,
          liquid and atmosphere, postprocessing for bloom and grain, and Motion for the interface.
        </motion.p>

        <div className="mt-20 flex items-center justify-between border-t border-line pt-6 wide:mt-28">
          <span className="font-mono text-[12px] tracking-[0.22em] text-fg/70">
            FORM <span className="text-faint">/</span> 001
          </span>
          <button
            type="button"
            onClick={onBackToTop}
            className="rounded-sm text-[13px] text-fg/60 transition-colors duration-300 hover:text-fg"
          >
            Back to the orb ↑
          </button>
        </div>
      </div>
    </section>
  );
}
