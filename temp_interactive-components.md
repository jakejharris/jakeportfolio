# Interactive Components — Context & Tasks

## System Architecture

**Registry:** `app/components/blog-components/InteractiveBlock.tsx`
- Maps string `componentName` → lazy-loaded React components via `next/dynamic` with `ssr: false`
- Post page (`app/(site)/posts/[slug]/page.tsx`, lines ~259-265) renders `interactiveComponent` Sanity blocks by passing `componentName` and `caption`
- Graceful fallback for missing component names

**Sanity Schema:** `sanity-schemas/post.ts` (lines 292-331)
- `interactiveComponent` is an object block in the post `content` array
- Fields: `componentName` (required dropdown, 6 options) + `caption` (optional string)

---

## Component Inventory

### 1. HeroCompression
- **File:** `app/components/blog-components/compression-intelligence/HeroCompression.tsx`
- **Lines:** 210
- **Type:** Canvas — 60 particles across 4 layers drift toward central convergence
- **Animation:** Sine oscillation + drift, `requestAnimationFrame`
- **Loops?** YES — continuous particle motion
- **Article placement:** Not currently used in article (registered but not placed)

### 2. AgentHierarchy
- **File:** `app/components/blog-components/compression-intelligence/AgentHierarchy.tsx`
- **Lines:** 505
- **Type:** Canvas — 4-tier node graph (Haiku→Sonnet→Opus→Human) with Bezier flow particles
- **Animation:** Particles spawn continuously on connections, compression threshold (3 haiku → 1 sonnet particle)
- **Loops?** YES — continuous spawning
- **Article placement:** After "What I Learned Running Three-Tier Agent Hierarchies" h2
- **Status:** OK, loops fine

### 3. CompressionPyramid
- **File:** `app/components/blog-components/compression-intelligence/CompressionPyramid.tsx`
- **Lines:** 408
- **Type:** Canvas — 220 particles fall through 5-layer tapering pyramid, survive boundaries probabilistically
- **Animation:** Particles have velocity, respawn when they exit bottom or get eliminated
- **Loops?** YES — particle pool recycles
- **Article placement:** After "The Architecture" h2
- **Status:** OK, loops fine

### 4. ScalingTable
- **File:** `app/components/blog-components/compression-intelligence/ScalingTable.tsx`
- **Lines:** 405
- **Type:** HTML table (not canvas) — 7 rows showing logarithmic layer scaling (800KB → 1EB)
- **Animation:** Staggered row reveal (160ms per row), counting number animation with easeOutCubic, punchline pulse on rows 4-5, final row glow
- **Key state:** `isVisible` (IntersectionObserver), `revealedRows` (0-7), `countedValues`, `punchlineActive`, `finalRowActive`, `prefersReducedMotion`
- **CSS animations used:** `st-row-enter` (slide-up + fade), `st-header-enter`, `st-punchline-pulse`, `st-final-glow`, `st-number-pop`
- **Loops?** NO — plays once on scroll-in, never resets
- **Article placement:** In "The Math That Should Have Killed the Idea" section
- **Status:** BUGGY
  - Scrollbar flickers briefly during animation
  - Final row (1 EB / highest data size) disappears after animation completes
  - Does not loop/replay

### 5. TokenCompression
- **File:** `app/components/blog-components/compression-intelligence/TokenCompression.tsx`
- **Lines:** 610
- **Type:** Canvas grid — 3-phase elimination animation (15,000 → 670 tokens, 95% compression)
- **Animation:** Multi-phase state machine: `idle → initial-hold → phase-0 → pause-0 → phase-1 → pause-1 → phase-2 → complete`
- **Phases:** Phase 0 (tree: 15k→4k), Phase 1 (rg: 4k→1.5k), Phase 2 (sed: 1.5k→670)
- **Key details:** Blocks eliminated edge-first (distance-from-center stagger), counter animates between phases, survivor glow at end
- **Loops?** NO — plays once, stops at `complete` state
- **Article placement:** In "The Hard Problems" section
- **Status:** NEEDS LOOPING — should reset and replay after completion pause

### 6. LossyDrift
- **File:** `app/components/blog-components/compression-intelligence/LossyDrift.tsx`
- **Lines:** 618
- **Type:** Canvas — signal vs noise particles flow through 8 sequential filters
- **Animation:** Particles flow L→R, noise caught at each filter and falls downward, signal passes through
- **Particle states:** `waiting → flowing → dissolving → arrived → gone`
- **Key details:** 40-100 particles (responsive), 1.2s per filter phase, 0.9s noise dissolution, seeded pseudo-random for reproducible positions
- **Loops?** NO — all particles eventually reach `arrived` or `gone` state, animation stops
- **Article placement:** After "Connection to RLM" h3
- **Status:** NEEDS LOOPING — should passively loop/restart after all particles settle

---

## Common Patterns Across All Components

- Canvas components use `requestAnimationFrame` with hand-coded easing (no external animation libs)
- All respect `prefers-reduced-motion` with static fallbacks
- IntersectionObserver gates animation to visible viewport
- Responsive canvas sizing with DPR scaling
- Consistent dark backgrounds (`#0a0a14` / `#0d0d1a` / `#0e0e1c`) with cyan/purple/blue accents
- Easing functions: `easeOutCubic`, `easeInQuad`, `lerp` — all hand-coded

---

## Tasks

### Task 1: Fix ScalingTable bugs + add looping
- Fix scrollbar flicker during animation
- Fix final row (1 EB) disappearing after animation completes
- Add infinite loop: after animation completes and a brief hold, reset state and replay
- File: `app/components/blog-components/compression-intelligence/ScalingTable.tsx`

### Task 2: Add looping to TokenCompression
- After reaching `complete` state, hold for a few seconds, then reset all blocks and replay the 3-phase elimination
- Should loop infinitely and passively
- File: `app/components/blog-components/compression-intelligence/TokenCompression.tsx`

### Task 3: Add looping to LossyDrift
- After all particles reach terminal state (`arrived`/`gone`), hold briefly, then reset particles to initial positions and replay
- Should loop passively and smoothly
- File: `app/components/blog-components/compression-intelligence/LossyDrift.tsx`

### Notes
- AgentHierarchy and CompressionPyramid already loop — no changes needed
- HeroCompression loops — no changes needed (also not placed in article currently)
- All changes should preserve `prefers-reduced-motion` behavior
- All changes should preserve IntersectionObserver gating (don't animate off-screen)
