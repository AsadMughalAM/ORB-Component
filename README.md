# FORM / 001 — Liquid Glass

An interactive liquid-glass orb built with Next.js, React Three Fiber and custom GLSL.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build (deploys to Vercel as-is)
```

## How it works

- **Glass shell** (`shaders/liquidVertex.glsl`, `shaders/liquidFragment.glsl`): a high-subdivision icosphere displaced by simplex noise, with normals rebuilt per vertex. Each frame the scene is rendered *without* the shell into a half-float buffer, then the shell samples that buffer with per-channel refraction (chromatic dispersion). It also adds Fresnel reflections from a procedural studio environment, an iridescent rim and a cursor-driven key light.
- **Liquid core** (`shaders/core*.glsl`): an additive, noise-deformed inner volume rendered only into the refraction buffer, so it is only ever seen through the glass.
- **Backdrop** (`shaders/backdropFragment.glsl`): atmosphere, halo ring and cursor light live in the 3D scene, so the orb genuinely bends them.
- **Interaction** (`components/LiquidOrb.tsx`): an analytic ray/sphere probe drives hover, the bulge toward the cursor, velocity-based ripples, tap/double-tap waves and the hover cursor. All per-frame state lives in refs, and React only re-renders on control changes.

## Structure

```text
components/  Experience (shell, fallbacks) · OrbScene (Canvas, post, adaptive quality)
             LiquidOrb · Backdrop · ParticleField · OrbControls · Navigation · HeroContent · InteractionHint
shaders/     noise · liquid* · core* · backdropFragment · particle*
lib/         experience.ts — settings, quality tiers, palette, shared interaction type
```

GLSL files are imported as strings through a webpack `asset/source` rule in `next.config.ts`. `next dev --turbopack` would need an equivalent loader rule.
