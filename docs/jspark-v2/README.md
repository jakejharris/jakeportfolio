# JSPARK3 website

Numbered JSPARK3 releases are the main line, which runs GLM-5.3 Flash. Tempo (DeepSeek-V4.1 Flash) is a named JSPARK3 release: the DeepSeek experiment. Hub and GLM-page release copy lives in `app/(site)/jspark3/release-copy.ts`; GLM release facts live in `glm-release.json` (check with `node scripts/check-glm-release.mjs`).

- `/jspark3/` — project and releases.
- `/jspark3/deepseek/` — Tempo recipe, measurements and limitations.
- `/jspark3/glm/` — preserved Cadence page.
- `/jspark3deepseek` and `/jspark3glm` redirect to the canonical model pages. Original GLM section fragments on the hub retain compatibility.

## Release data

The recipe repository owns `release/summary.json` and `release/benchmarks.json`. Run `node scripts/sync-tempo-release.mjs PATH_TO_RECIPE/release` to validate and copy them; append `--check` for a read-only drift check. The page reads a committed snapshot, without fetching GitHub at runtime. Pending releases have an explicit local pending state until their real versioned destinations are available.

The data preserves cache conditions, sample counts, timing boundaries and limitations. Single-stream post-first-output rates, full HTTP short-answer aggregate rates and three-minute Work rates are separate measurements.

## Validation

The implementation passed TypeScript, scoped ESLint, diff checks, 16 viewport checks from 320 to 1440 pixels, 14 legacy fragment checks, keyboard controls, disclosure and reduced-motion checks. 41 Chromium screenshots were captured; desktop/mobile full pages and changed regions were inspected. The static renderer checks component markup and native interactions; a Vercel preview is still required to validate Next hydration, redirects and shared portfolio chrome.

Static preview tooling: `scripts/render-tempo.tsx`, `scripts/verify-tempo-browser.mjs`. The browser verifier expects a locally started static server and disposable Chromium CDP instance; it generates the social image as well as screenshots. Use the repository's permitted production-build workflow.

Internal design/session records and machine-specific receipts are retained in the private working archive, outside this public package. `PROVENANCE.json` records the publication data hashes.

Historical benchmark data retains its original measurement edition (`v2.0.0-rc.1`) as release packaging advances. The importer verifies the complete dataset hash and every selected value/condition against the current recipe summary; changing the release version does not relabel the historical measurements.
