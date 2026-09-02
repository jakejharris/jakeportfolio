/**
 * Copy and figures for the /jspark3 page.
 *
 * Every number, name, commit hash, revision, license name and qualifier below is
 * transcribed verbatim from the JSpark3 v1.0.0 public site block. Nothing here is
 * rounded, recomputed, ranked, or derived: the only percentages are the internal
 * ablation deltas that the source block already prints.
 */

/** A run of copy that may carry inline code or emphasis, kept as data so the strings stay verbatim. */
export type RichPart = string | { code: string } | { strong: string };

export const HERO = {
  eyebrow: "A serving recipe for three NVIDIA DGX Sparks · release v1.0.0",
  title: "JSpark3",
  tagline: "One endpoint, three Sparks, every byte pinned.",
  lede:
    "JSpark3 runs GLM-5.3 Flash across three DGX Sparks as a single OpenAI-compatible endpoint: tensor parallel 3 and expert parallel 3 over a RoCE-v2 triangle, a DFlash2 speculative draft, an FP8 KV cache, and a selective INT8 overlay for the model trunk. It pins every input, refuses to start anything it did not measure, and publishes its numbers with the misses left in.",
} as const;

/** The three repositories are not published yet; every link keeps its NOT YET LIVE badge. */
export const HERO_LINKS: ReadonlyArray<{
  label: string;
  href: string;
  primary?: boolean;
}> = [
  { label: "GitHub repository", href: "https://github.com/jakejharris/jspark3", primary: true },
  { label: "Release v1.0.0", href: "https://github.com/jakejharris/jspark3/releases/tag/v1.0.0" },
  { label: "Hugging Face: card and weights", href: "https://huggingface.co/jakejh/jspark3" },
];

export const NOT_YET_LIVE = "not yet live";

export const HERO_FACTS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "3", label: "DGX Sparks serving as one endpoint, TP3 + EP3" },
  {
    value: "4.46 GiB",
    label: "weight memory freed across the cluster: 1,595,392,320 bytes per rank",
  },
  { value: "1,000,000", label: "tokens of configured context, FP8 KV cache, prefix caching" },
  {
    value: "120 shards",
    label: "of the pinned target checkpoint, each verified by hash before a token is served",
  },
];

/** Section ids required by the route, with the site block's original anchor ids kept as aliases. */
export const SECTIONS: ReadonlyArray<{ id: string; legacyId: string; label: string }> = [
  { id: "scope", legacyId: "js3-scope", label: "Scope" },
  { id: "architecture", legacyId: "js3-architecture", label: "Architecture" },
  { id: "evidence", legacyId: "js3-evidence", label: "Evidence" },
  { id: "reproducibility", legacyId: "js3-reproducibility", label: "Reproducibility" },
  { id: "provenance", legacyId: "js3-provenance", label: "Pinned inputs" },
  { id: "licensing", legacyId: "js3-licensing", label: "Licensing" },
  { id: "credits", legacyId: "js3-credits", label: "Credits" },
];

/* ---------------------------------------------------------------- scope --- */

export const SCOPE_IS: ReadonlyArray<string> = [
  "A reproducible serving and runtime recipe: 39 files an operator copies to three Sparks.",
  "A fail-closed lifecycle controller. Preflight, start, health, verify, stop, each with a dry run.",
  "A measured operating envelope: 32 sequences, 8,192 batched tokens, CUDA graphs at 8/16/24/32/48, GPU memory utilization 0.83.",
  "A selective W8A16 Marlin overlay for the BF16 trunk, applied at load, with the routed experts left in EXL3.",
  "Machine-readable evidence with receipts, including the regressions and the two internal gates it missed.",
  "A public comparison table: author-reported figures for the recipes that came before it, with the fields needed to read them.",
];

export const SCOPE_IS_NOT: ReadonlyArray<string> = [
  "A new model, a fine-tune, or a new quantization. Nothing was trained or quantized here.",
  "A new checkpoint. The weights are Brandon Music's EXL3/TR3 4-bpw quantization as re-hosted by Mia-AiLab, pinned by revision and hash. The Hugging Face repository re-hosts that exact revision byte for byte, under its own license, so nobody assembles the checkpoint by hand.",
  "A patched vLLM. Five hash-gated transforms are applied inside the pinned container at start and verified by hash.",
  "Unrestricted open source or commercial-ready as an assembled stack. The draft is non-commercial and the checkpoint is attribution-required.",
  "Independently reproduced yet. Evidence comes from one project-operated fleet.",
];

/* --------------------------------------------------------- architecture --- */

export const ARCHITECTURE_LEDE =
  "Each Spark holds one tensor-parallel shard and one third of the routed experts. The three fabric legs form a triangle so every rank reaches each peer directly.";

export const ARCHITECTURE_CAPTION =
  "The shipped architecture diagram. Rank 0 exposes the API; ranks 1 and 2 are headless peers. Scrolls sideways on narrow screens.";

export const ARCHITECTURE_CARDS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Topology",
    body: "Tensor parallel 3 and expert parallel 3. Every rank holds a shard of attention, KDA, the shared expert and the LM head, plus 96 of the 288 routed experts. The DFlash2 draft is built over all three ranks; the profile's draft TP 1 setting is ignored by this loader, so the diagram shows what is actually loaded.",
  },
  {
    title: "Fabric",
    body: "Three RoCE-v2 legs, each on its own network at MTU 9000. Every Spark owns two fabric interfaces. Preflight checks the GID, MTU and routes on each rank before anything starts.",
  },
  {
    title: "Overlay",
    body: "The BF16 trunk is converted to INT8 Marlin at load: 169 modules, 225 tensors, group ladder 128/64/32. The 34 KDA f/g modules are excluded. It frees 1,595,392,320 bytes per rank.",
  },
  {
    title: "Lifecycle",
    body: "Start order 2, then 1, then 0, bound to a hash-checked release manifest. The entrypoint refuses on cgroup, NCCL, overlay or loader drift. Verify confirms shards, graphs and a focused witness.",
  },
];

/* ------------------------------------------------------------- evidence --- */

export const EVIDENCE_LEDE =
  "The public comparison is against recipes that were publicly available before JSpark3. Their numbers are author-reported; ours come from our own fleet. Prompts, instruments, and envelopes differ, and the node count is on every row, so read the table as context, not a ranking. No percentage is computed between rows.";

/**
 * Results measured on the upstream authors' own benchmark scripts. Every value, and the
 * five ratios, are printed exactly as supplied; nothing here is derived on the page.
 */
export const AUTHOR_BENCHMARKS = {
  title: "On their own benchmarks",
  subtitle:
    "The authors' pinned benchmark scripts, run unchanged against the JSpark3 release build except for the endpoint address and model name. Author values are the numbers they published.",
  flycockpit: {
    heading: "FlyCockpit's benchmark, the same three Sparks",
    unit: "Decode, tok/s (mean of three runs)",
    rows: [
      {
        metric: "Hello (17-token stop)",
        ours: {
          label: "JSpark3 v1",
          sparks: "3",
          value: "46.110",
          runs: "46.106 / 46.405 / 45.820",
        },
        other: {
          label: "FlyCockpit TP3",
          sparks: "3",
          value: "37.367",
          runs: "37.9 / 36.9 / 37.3",
        },
        ratio: "1.23x",
      },
      {
        metric: "Structured count 1 to 200",
        ours: {
          label: "JSpark3 v1",
          sparks: "3",
          value: "84.243",
          runs: "83.988 / 84.580 / 84.161",
        },
        other: {
          label: "FlyCockpit TP3",
          sparks: "3",
          value: "69.567",
          runs: "69.0 / 68.5 / 71.2",
        },
        ratio: "1.21x",
      },
      {
        metric: "is_prime code",
        ours: {
          label: "JSpark3 v1",
          sparks: "3",
          value: "66.543",
          runs: "65.840 / 68.246 / 65.544",
        },
        other: {
          label: "FlyCockpit TP3",
          sparks: "3",
          value: "56.400",
          runs: "52.3 / 58.7 / 58.2",
        },
        ratio: "1.18x",
      },
    ],
    note: "Draft acceptance 0.8324 against FlyCockpit's 0.815. FlyCockpit's runs were first-serve at GPU memory utilization 0.87; these were warm-server runs at 0.83, the release envelope.",
  },
  mia: {
    heading: "Mia's bench_decode, their two Sparks against our three",
    unit: "Median of five 400-token runs, tok/s",
    rows: [
      {
        metric: "Structured count 1 to 200",
        ours: { label: "JSpark3 v1", sparks: "3", value: "88.17" },
        other: { label: "Mia TP2", sparks: "2", value: "65.1" },
        ratio: "1.35x",
      },
      {
        metric: "Prose hash-map",
        ours: { label: "JSpark3 v1", sparks: "3", value: "36.78" },
        other: { label: "Mia TP2", sparks: "2", value: "27.1" },
        ratio: "1.36x",
      },
    ],
    note: "Accepted-per-draft ratios match theirs almost exactly: 0.9533 against 0.959 on structured, 0.3357 against 0.341 on prose. The draft behaves the same; the engine is faster.",
  },
  sparkdash: {
    heading: "Mia's sparkDash decode protocol",
    /** The two JSpark3 columns carry a node-count chip; the Mia column names its own. */
    columns: [
      { label: "Concurrency" },
      { label: "Estimator" },
      { label: "Mia TP2, 2 Sparks" },
      { label: "JSpark3, structured count", sparks: "3" },
      { label: "JSpark3, clamp code", sparks: "3" },
    ],
    rows: [
      { concurrency: "C1", estimator: "per-stream decode tok/s", mia: "62.9", structured: "86.56", clamp: "84.47" },
      { concurrency: "C1", estimator: "time to first token", mia: "719 ms", structured: "461 ms", clamp: "391 ms" },
      { concurrency: "C2", estimator: "per-stream decode tok/s", mia: "51.7", structured: "79.26", clamp: "70.56" },
      { concurrency: "C2", estimator: "aggregate decode tok/s", mia: "103.3", structured: "76.95", clamp: "139.77" },
      { concurrency: "C4", estimator: "per-stream decode tok/s", mia: "37.1", structured: "50.08", clamp: "62.80" },
      { concurrency: "C4", estimator: "aggregate decode tok/s", mia: "146.5", structured: "200.29", clamp: "251.13" },
    ],
    notes: [
      "Mia publishes one value for its high-accept prompt family without saying which prompt, so both of ours are shown.",
      "At two streams the structured aggregate falls below Mia's published figure: the release build serializes low-concurrency work below its eight-sequence graph floor, the same artifact the internal ablation shows at three streams.",
    ],
  },
  condition:
    "Measured on 2026-09-02 against the release build held immutable, three Sparks, warm server. FlyCockpit T0 script at commit 9093765c; Mia tests/bench_decode.py at commit c190db1a; sparkDash release 1.8.5 at commit e93fc87d.",
} as const;

/**
 * Headline comparison: the same frozen screen, run on this fleet, three Sparks against two.
 * The three ratios are the only computed figures on the page; they are printed exactly as
 * supplied and nothing else here is derived.
 */
export const SCREEN_COMPARISON = {
  title: "Same screen, two Sparks against three",
  unit: "Single-stream decode, tok/s",
  rows: [
    {
      metric: "Structured count",
      ours: { label: "JSpark3 v1", sparks: "3", value: "81.962" },
      other: { label: "Mia TP2, current recipe", sparks: "2", flag: "compatibility adapted", value: "57.970" },
      ratio: "1.41x",
    },
    {
      metric: "Code",
      ours: { label: "JSpark3 v1", sparks: "3", value: "66.257" },
      other: { label: "Mia TP2, current recipe", sparks: "2", flag: "compatibility adapted", value: "44.563" },
      ratio: "1.49x",
    },
    {
      metric: "Prose",
      ours: { label: "JSpark3 v1", sparks: "3", value: "29.049" },
      other: { label: "Mia TP2, current recipe", sparks: "2", flag: "compatibility adapted", value: "20.039" },
      ratio: "1.45x",
    },
  ],
  condition:
    "Same frozen 24-request screen on the same fleet, thinking off, temperature 0, 400 max tokens. The Mia recipe is the current two-Spark release at commit c190db1a, run here with one compatibility repair.",
} as const;

/** The same agent prompt, four independent runs. Node counts are in every label; no percentages. */
export const SAME_TASK = {
  title: "Same task, same prompt",
  unit: "Aggregate decode, tok/s",
  rows: [
    { label: "JSpark3 v1", sparks: "3", value: "44.583", ours: true },
    { label: "FlyCockpit-derived build", sparks: "3", value: "29.042" },
    { label: "Mia TP2, historical recipe", sparks: "2", value: "24.913" },
    { label: "Mia TP2, current recipe", sparks: "2", value: "24.728" },
  ],
  note: "One agent prompt, independent runs; each agent chose its own path.",
} as const;

/** Evidence class one: the published reference recipes, quoted as their authors reported them. */
export interface ReferenceRow {
  recipe: string;
  ours?: boolean;
  sparks: string;
  lane: string;
  context: string;
  /** Either a single reported string, or the labelled medians that are set in bold on our own row. */
  decode: string | ReadonlyArray<{ label: string; value: string }>;
  basis: string;
}

export const REFERENCE_ROWS: ReadonlyArray<ReferenceRow> = [
  {
    recipe: "JSpark3 v1",
    ours: true,
    sparks: "3",
    lane: "EXL3/TR3 4-bpw · DFlash2 k=7 · W8A16 trunk overlay · vLLM, TP3/EP3 over a RoCE-v2 triangle",
    context: "1,000,000",
    decode: [
      { label: "structured count", value: "81.962" },
      { label: "code", value: "66.257" },
      { label: "prose", value: "29.049" },
    ],
    basis:
      "Local. Frozen 24-request screen, thinking off, temperature 0, 400 max tokens, warm server; medians of three batteries; per-stream estimator",
  },
  {
    recipe: "FlyCockpit TP3",
    sparks: "3",
    lane: "EXL3/TR3 4-bpw, same target revision · DFlash2 k=7 · vLLM, TP3/EP3 over a mesh",
    context: "1,000,000",
    decode:
      'structured count 69.0 / 68.5 / 71.2 · code 52.3 / 58.7 / 58.2 · "hello" 37.9 / 36.9 / 37.3',
    basis:
      'Author-reported first-serve runs at commit 9093765c; thinking off, temperature 0, 200-token stops (17 for "hello"); GPU memory utilization 0.87 with cgroup swap recorded; no prose row',
  },
  {
    recipe: "Mia TP2",
    sparks: "2",
    lane: "EXL3/TR3 4-bpw, same target revision · DFlash2 k=7 · vLLM, TP2",
    context: "1,000,000",
    decode:
      "62.9 on high-accept prompts (sparkDash, single stream) · structured 65.1 / prose 27.1 (bench_decode, four streams, median of 5×400)",
    basis:
      "Author-reported at commit c190db1a; two instruments of their own, neither is our screen; two Sparks, not three",
  },
  {
    recipe: "jetnet TP3",
    sparks: "3",
    lane: "NVFP4 · MTP-4 or DFlash2 · eager, Marlin W4A16, TP3",
    context: "512K",
    decode: "35.2 (range 32.1 to 39.0) with MTP-4 · 47.2 with DFlash2, thinking on",
    basis:
      "Author-reported at commits bfc820ec and 4fdba004 and the author's NVIDIA forum post; clock-capped at 1500 MHz; the model always thinks; a different quantization lane",
  },
];

export const REFERENCE_SCROLL_HINT = "Scroll sideways for the full table.";

export const REFERENCE_NOTE =
  "Every row states hardware count, quantization and speculation, context, workload, and source. Sources are pinned commits, listed with full URLs on the repository's benchmarks page.";

/** Evidence class two: this fleet running published recipes, each with its adaptation flag. */
export const LOCAL_RUNS_METHOD =
  "Two Mia TP2 lineages and one FlyCockpit-derived build were run on this fleet with disclosed adaptations, and each was given the same agent prompt as JSpark3. Same prompt, independent trajectories: product evidence, not an engine-rate comparison.";

export const LOCAL_RUNS: ReadonlyArray<{
  title: string;
  flag: string;
  /** Node count, as stated by the recipe's own lane in the reference table above. */
  sparks: string;
  ours?: boolean;
  body: ReadonlyArray<RichPart>;
}> = [
  {
    title: "JSpark3 v1",
    flag: "local · this release",
    sparks: "3",
    ours: true,
    body: [
      "44.583 tok/s aggregate decode over 132 requests and 32,618 generated tokens; mean time to first token 3.704 s.",
    ],
  },
  {
    title: "Mia TP2, historical recipe",
    flag: "site and safety adapted",
    sparks: "2",
    body: [
      "Commit 0e2e78f, run locally with site, storage, API, and safety adaptations. 24.913 tok/s aggregate decode over 43 requests and 105,198 generated tokens.",
    ],
  },
  {
    title: "Mia TP2, current recipe",
    flag: "compatibility adapted",
    sparks: "2",
    body: [
      "Commit c190db1a, runnable at full context only with the ",
      { code: "GLM53_INDEXER_WORKSPACE=rightsize" },
      " repair: an adapted reproduction, not an exact one. 24.728 tok/s aggregate decode over 24 requests and 76,540 generated tokens.",
    ],
  },
  {
    title: "FlyCockpit-derived build",
    flag: "minimal-correctness adapted",
    sparks: "3",
    body: [
      "Commit 9093765c with minimal correctness and safety adaptations, not the literal upstream launcher. 29.042 tok/s aggregate decode over 58 requests and 130,971 generated tokens.",
    ],
  },
];

/** Evidence class three: the internal ablation, against the matched three-Spark control. */
export const ABLATION_CONTROL: ReadonlyArray<RichPart> = [
  { strong: "The control is JSpark3 itself with one switch off." },
  " Same three Sparks, same pinned checkpoint and DFlash2 draft, same container image, same TP3/EP3 topology and serving envelope, same request sets and estimator. The only change is that the selective W8A16/Marlin trunk overlay is disabled, so the trunk serves in BF16 as it came from upstream. That build is unreleased internal development evidence, not a product and not a market comparison; it exists to isolate what the overlay alone changed.",
];

export const ABLATION_READING =
  "Every bar below is JSpark3 measured against that control. Two single-stream rows are shown: the campaign medians against the control's earlier battery, and a strict same-day pair (candidate battery r3 against control battery r6). Green went up, red went down, one scale.";

export const ABLATION_FIGURE_LABEL =
  "Throughput deltas of JSpark3 against the matched three-Spark control: the same recipe with the overlay disabled";

/** Throughput deltas versus the matched three-Spark control, from results.json. One scale for all bars. */
export const ABLATION_GROUPS: ReadonlyArray<{
  name: string;
  rows: ReadonlyArray<{ label: string; value: number }>;
}> = [
  {
    name: "Single-stream decode · campaign medians vs the control's earlier battery",
    rows: [
      { label: "Code", value: 3.75 },
      { label: "Structured count", value: 5.74 },
      { label: "Prose", value: 2.62 },
    ],
  },
  {
    name: "Single-stream decode · same-day pair, candidate r3 vs control r6",
    rows: [
      { label: "Code", value: 7.27 },
      { label: "Structured count", value: 6.63 },
      { label: "Prose", value: 8.35 },
      { label: "C3 per-stream median", value: -21.2 },
      { label: "C6 per-stream median", value: 2.91 },
    ],
  },
  {
    name: "Matched concurrency waves · aggregate service throughput",
    rows: [
      { label: "C12", value: 0.16 },
      { label: "C24", value: 1.21 },
      { label: "C48", value: 3.47 },
    ],
  },
  {
    name: "Matched long prefill · 113,908 tokens",
    rows: [{ label: "Prefill proxy", value: -3.38 }],
  },
];

/** One scale for every bar, exactly as the source block draws it. */
export const ABLATION_SCALE = { min: -25, max: 10 } as const;

/** Minor ticks are hidden on narrow screens, as in the source block. */
export const ABLATION_TICKS: ReadonlyArray<{ value: number; minor: boolean }> = [
  { value: -25, minor: true },
  { value: -20, minor: false },
  { value: -15, minor: true },
  { value: -10, minor: false },
  { value: -5, minor: true },
  { value: 0, minor: false },
  { value: 5, minor: true },
  { value: 10, minor: false },
];

export const ABLATION_NOTES: ReadonlyArray<{
  tone: "good" | "bad";
  body: ReadonlyArray<RichPart>;
}> = [
  {
    tone: "good",
    body: [
      { strong: "What the overlay improved." },
      " Single-stream decode medians: code +3.75%, structured count +5.74%, prose +2.62% against the control's earlier battery; +7.27%, +6.63% and +8.35% in the strict same-day pair. Token pacing: median inter-token interval 98.645 to 91.912 ms (−6.83%), p99 −10.27%, worst interval 364.416 to 148.344 ms (−59.29%). Aggregate throughput at 48 streams +3.47%. 1,595,392,320 bytes of weight memory freed per rank.",
    ],
  },
  {
    tone: "bad",
    body: [
      { strong: "What it cost, and what was missed." },
      " Long prefill −3.38% with time to first token +3.50% on 113,908 tokens. The three-stream wave was variable and lost its strict pairing at −21.20%. Fairness did not improve. Time to first token at 48 streams reached a p90 of 96.722 s. Two internal promotion gates were missed: a code median of 66.257 against a 67.0 floor, and a demonstration pacing run of 14 against a limit below 5.",
    ],
  },
];

export const EVIDENCE_GRADE =
  "Evidence grade: engineering evidence. One fleet, operated by the project, with no third-party reproduction yet. No correctness, stability, or safety failure was observed in any run. Estimators, sample sizes, receipts, and the three evidence classes are on the repository's benchmarks page.";

/* ------------------------------------------------------ reproducibility --- */

export const REPRODUCIBILITY_LEDE =
  "The construction is exact or the recipe does not start. The measurements are fully specified but the numbers are not guaranteed; your fleet will differ, the bytes will not.";

export const REFUSE_CARDS: ReadonlyArray<{ title: string; body: ReadonlyArray<RichPart> }> = [
  {
    title: "Inputs",
    body: [
      "Any checkpoint revision, draft revision, image digest, or transform source that is not the pinned one.",
    ],
  },
  {
    title: "Environment",
    body: [
      "A cgroup other than 64 GiB with swap off; any ",
      { code: "NCCL_PROTO" },
      ", ",
      { code: "NCCL_ALGO" },
      ", or ",
      { code: "NCCL_IB_ADDR_RANGE" },
      " override; overlay or KDA environment drift.",
    ],
  },
  {
    title: "Identity",
    body: [
      "A preflight row that differs from the expected row, a preflight checksum mismatch, a missing or unbound image receipt, or an existing container with the release name.",
    ],
  },
  {
    title: "Bytes",
    body: [
      "Overlay, loader-hook, and transform before/after hash drift; a missing or duplicated seam. Every rank validates every serving byte before start.",
    ],
  },
];

export const INSTALL_COMMANDS = `cp .env.example .env
./scripts/clean-room-setup.sh --env-file .env --output preflight.json
preflight_sha=$(sha256sum preflight.json | cut -d' ' -f1)
./scripts/start.sh --env-file .env \\
  --preflight preflight.json --preflight-sha256 "$preflight_sha" \\
  --confirm START-JSPARK3
./scripts/health.sh --env-file .env --manifest jspark3-release-manifest.json
./scripts/verify.sh --env-file .env --manifest jspark3-release-manifest.json \\
  --output verify.json --log-output verify-rank0.log`;

export const INSTALL_NOTE: ReadonlyArray<RichPart> = [
  "Every command has ",
  { code: "--dry-run" },
  ". Confirmation tokens are typed, never defaulted. The full nine-step installation, from bare Docker hosts to a verified endpoint, is in the repository's install page.",
];

/* ----------------------------------------------------------- provenance --- */

export const PROVENANCE_LEDE =
  "Nothing here is a floating tag. The recipe checks each of these before it serves a token.";

export const PINNED_INPUTS: ReadonlyArray<{ label: string; value: ReadonlyArray<RichPart> }> = [
  {
    label: "Target checkpoint",
    value: [
      { code: "Mia-AiLab/GLM-5.3-Flash-EXL3-TR3-4bpw" },
      " at revision ",
      { code: "25a44fdbf16862a46b7cc9921142c6c81350af2f" },
      ", itself byte-identical to ",
      { code: "brandonmusic/GLM-5.3-Flash-tr3-4bpw" },
      " at ",
      { code: "5ab363a8dcf6405955fd5f99671e01a1c9fb124b" },
      ". The JSpark3 Hugging Face repository re-hosts this revision shard for shard with the same hashes; the preflight accepts either source because the bytes are identical",
    ],
  },
  {
    label: "Draft checkpoint",
    value: [
      { code: "incoai/GLM-5.3-Flash-DFlash2" },
      " at revision ",
      { code: "dc77ff1c99eeb2df044ee3d4f0094eb033fee410" },
      ", k=7",
    ],
  },
  {
    label: "Container image",
    value: [
      { code: "ghcr.io/miaai-lab/glm-5.3-flash-2x-dgx-sparks" },
      " at digest ",
      { code: "sha256:9bb1557a4234fce63d59599e44d10747eabd742beb337eebf9e7070be8a0fd58" },
      ", launched by digest, not redistributed",
    ],
  },
  {
    label: "Serving engine",
    value: [
      "vLLM build ",
      { code: "487ecf187" },
      " as shipped inside the pinned image; five hash-gated runtime transforms are applied at start",
    ],
  },
  {
    label: "Transform sources",
    value: [
      "FlyCockpit ",
      { code: "GLM-5.3-Flash-EXL3-3x-DGX-Sparks" },
      " at ",
      { code: "9093765c757bd1976372196e44af84a67cf86bad" },
      "; vcruz305 ",
      { code: "GLM-5.3-Flash-EXL3-K2-DGX-Spark-recipe" },
      " at ",
      { code: "622cb878d66f703c597bd6baaa2423caa1786f99" },
    ],
  },
  {
    label: "Runtime envelope",
    value: [
      "Configured context 1,000,000 tokens · 32 sequences · 8,192 batched tokens · GPU memory utilization 0.83 · FP8 KV cache · prefix caching · served as ",
      { code: "glm-5.3-flash" },
    ],
  },
];

/* ------------------------------------------------------------ licensing --- */

export const LICENSING_LEDE =
  "The recipe is ours to license. The model bytes it loads are not. Read this before deploying for anything commercial.";

export const LICENSES: ReadonlyArray<{ kind: string; name: string; body: string }> = [
  {
    kind: "Recipe code",
    name: "Apache-2.0",
    body: "The scripts, overlays, transforms, tooling, and documentation, with third-party notices. Use, modify, redistribute.",
  },
  {
    kind: "Target checkpoint",
    name: "ShapleyMcg License 1.0",
    body: "Source-available and attribution-required; not OSI open source. Brandon M. Music created the EXL3/TR3 checkpoint, Mia-AiLab re-hosts it, and JSpark3 re-hosts that revision in turn under the same license, with the required attribution reproduced verbatim. Downstream copies stay under this license.",
  },
  {
    kind: "DFlash2 draft",
    name: "CC BY-NC-ND 4.0",
    body: "Research and evaluation only. Commercial use of the draft requires a license from Inco. Without the draft the recipe still serves, without speculative decoding.",
  },
];

export const LICENSING_NOTE =
  "The assembled endpoint is therefore neither unrestricted open source nor commercial-ready. The repository's licensing page lists every term and its practical effect, and the ownership statements the project does not make.";

/* -------------------------------------------------------------- credits --- */

export const CREDITS_INTRO =
  "JSpark3 did not train, fine-tune, or quantize anything. The contribution is the three-Spark architecture, the runtime adaptation, the operating envelope, the experimental campaign, and the reproducible serving recipe.";

export const CREDITS_ROLL: ReadonlyArray<RichPart> = [
  { strong: "Brandon M. Music" },
  " for the ShapleyMcg EXL3/TR3 4-bpw checkpoint that every rank loads. ",
  { strong: "MiaAI-Lab" },
  " for the two-Spark EXL3 recipe, the pinned container image, and the checkpoint re-host that JSpark3 mirrors in turn. ",
  { strong: "FlyCockpit" },
  " for the three-Spark EXL3 lineage the TP3 overlay transform is reconstructed from. ",
  { strong: "vcruz305" },
  " for the K-pool tail correction. ",
  { strong: "tonyd2wild" },
  " for scheduler and concurrency benchmarking context. ",
  { strong: "sfxnz" },
  " for DGX Spark serving context. ",
  { strong: "Inco AI" },
  " for DFlash2. ",
  { strong: "Z.AI" },
  " for GLM-5.3 Flash. The ",
  { strong: "vLLM" },
  " project for the engine.",
];

export const CREDITS_NOTE =
  "Every upstream author is credited by name, repository, and pinned commit or revision in the repository's third-party notices.";

export const CITE = {
  title: "Cite it",
  body: [
    "The repository ships ",
    { code: "CITATION.cff" },
    " and ",
    { code: "CITATION.bib" },
    ". Cite the release by name, version, and repository.",
  ] as ReadonlyArray<RichPart>,
  citation: `JSpark3 v1, version 1.0.0 (2026)
https://github.com/jakejharris/jspark3`,
};

export const BLOCK_FOOTER: ReadonlyArray<string> = [
  "JSpark3 · release v1.0.0 · Apache-2.0 recipe code, upstream terms apply to the model bytes",
  "Built and measured on three NVIDIA DGX Sparks, 2026",
];
