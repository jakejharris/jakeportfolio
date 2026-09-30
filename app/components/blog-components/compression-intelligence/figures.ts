// What the compression post's figures draw. Every number here is the post's
// own, or arithmetic on it; the logs, files and replies are illustrations of
// the same bug, followed from figure to figure.

import { seeded, shuffled } from './lattice';

// ─── Context is the bottleneck: a pasted log and the lines that matter ───

export const LOG_LENGTH = 500;

export interface LogLine {
  /** 1-based line number in the log. */
  n: number;
  level: string;
  text: string;
  /** One of the lines that explains the bug. */
  relevant: boolean;
  /** Drawn in the accent once the lines are read: the cause and the error. */
  key?: boolean;
}

const RELEVANT: Omit<LogLine, 'relevant'>[] = [
  { n: 12, level: 'INFO', text: 'deploy v2.14.0 started' },
  { n: 13, level: 'INFO', text: 'migration 0042: users.id renamed to user_id', key: true },
  { n: 14, level: 'INFO', text: 'deploy v2.14.0 done' },
  { n: 309, level: 'INFO', text: 'POST /api/users' },
  { n: 310, level: 'DEBUG', text: 'payload {"email": "sam@example.com"}' },
  { n: 311, level: 'ERROR', text: 'POST /api/users failed with 500' },
  { n: 312, level: '', text: 'Traceback (most recent call last):' },
  { n: 313, level: '', text: '  File "api/routes.py", line 88, in create' },
  { n: 314, level: '', text: '    user = process_data(payload)' },
  { n: 315, level: '', text: '  File "models/user.py", line 147, in process_data' },
  { n: 316, level: '', text: '    uid = input_data["id"]', key: true },
  { n: 317, level: '', text: "KeyError: 'id'", key: true },
  { n: 402, level: 'WARN', text: 'retry 1 of 3: POST /api/users' },
  { n: 403, level: 'ERROR', text: 'POST /api/users failed with 500' },
  { n: 404, level: '', text: "KeyError: 'id'", key: true },
];

const NOISE_TEMPLATES: Array<[string, (r: () => number) => string]> = [
  ['INFO', (r) => `GET /health 200 ${1 + Math.floor(r() * 4)}ms`],
  [
    'INFO',
    (r) => `GET /api/items?page=${1 + Math.floor(r() * 40)} 200 ${8 + Math.floor(r() * 60)}ms`,
  ],
  ['DEBUG', (r) => `cache hit items:${Math.floor(r() * 900)}`],
  ['DEBUG', (r) => `cache miss user:${1000 + Math.floor(r() * 9000)}`],
  [
    'INFO',
    (r) =>
      `GET /static/${['app.js', 'app.css', 'logo.svg', 'font.woff2'][Math.floor(r() * 4)]} 304`,
  ],
  ['INFO', (r) => `worker-${1 + Math.floor(r() * 8)} heartbeat`],
  ['DEBUG', (r) => `pool size=12 idle=${Math.floor(r() * 12)}`],
  ['INFO', (r) => `POST /api/events 202 ${3 + Math.floor(r() * 30)}ms`],
  [
    'INFO',
    (r) => `GET /api/users/${1000 + Math.floor(r() * 9000)} 200 ${9 + Math.floor(r() * 40)}ms`,
  ],
  ['DEBUG', (r) => `session refreshed for ${1000 + Math.floor(r() * 9000)}`],
  ['INFO', () => 'scheduler tick'],
  ['WARN', (r) => `slow query ${300 + Math.floor(r() * 900)}ms on items`],
];

export function buildLog(): LogLine[] {
  const random = seeded(500);
  const relevant = new Map(RELEVANT.map((line) => [line.n, line]));
  const lines: LogLine[] = [];
  for (let n = 1; n <= LOG_LENGTH; n++) {
    const hit = relevant.get(n);
    if (hit) {
      lines.push({ ...hit, relevant: true });
      continue;
    }
    // Health checks and cache chatter make up most of a real log.
    const pick = random();
    const template =
      pick < 0.3
        ? NOISE_TEMPLATES[0]
        : NOISE_TEMPLATES[Math.floor(random() * NOISE_TEMPLATES.length)];
    lines.push({ n, level: template[0], text: template[1](random), relevant: false });
  }
  return lines;
}

export const RELEVANT_COUNT = RELEVANT.length;

/** The share of the context that matters, as a whole percent. */
export const signalShare = (linesInContext: number) =>
  Math.round((RELEVANT_COUNT / linesInContext) * 100);

// ─── Three tiers: every tier compresses for the tier above it ───

export const TOKENS_PER_CELL = 100;
export const HAIKU_READS = 4000;
export const HAIKU_RETURNS = 300;
export const HAIKU_PER_SONNET = 5;
export const SONNETS = 2;
export const SONNET_READS = HAIKU_PER_SONNET * HAIKU_RETURNS;

export const TIER_EXAMPLES = {
  haiku: 'src/models/user.py:142: def process_data(input_data)',
  sonnet: 'Plan: process_data still reads "id", which migration 0042 renamed. Read user_id.',
  opus: 'Decision: fix process_data, then add a test for the renamed field.',
} as const;

// ─── Graduated reading: tree, then rg, then sed -n ───

export const FULL_READ_TOKENS = 15000;
export const GRADUATED_TOKENS = 670;
export const TOKENS_PER_READ_CELL = 25;

export interface RepoFile {
  path: string;
  cells: number;
}

// The relevant files, about 15,000 tokens between them.
export const REPO: RepoFile[] = [
  { path: 'src/models/user.py', cells: 160 },
  { path: 'src/api/routes.py', cells: 120 },
  { path: 'src/services/billing.py', cells: 100 },
  { path: 'src/db/session.py', cells: 80 },
  { path: 'tests/test_user.py', cells: 80 },
  { path: 'src/utils/validate.py', cells: 60 },
];

export type StepId = 'tree' | 'rg' | 'sed';

export interface ReadStep {
  id: StepId;
  command: string;
  what: string;
  /** Cells of context this step reads, drawn where they come from. */
  cells: number;
}

// 27 cells, about 670 tokens.
export const STEPS: ReadStep[] = [
  { id: 'tree', command: 'tree -L 2 src tests', what: 'the map: every file by name', cells: 10 },
  {
    id: 'rg',
    command: 'rg -n "process_data" src tests',
    what: 'five matches, as file:line',
    cells: 5,
  },
  {
    id: 'sed',
    command: "sed -n '138,160p' src/models/user.py",
    what: 'only the lines around 142',
    cells: 12,
  },
];

/** Two lines of code to a cell. */
export const LINES_PER_CELL = 2;

/** The cell of a file that holds `line`. */
export const cellOfLine = (line: number) => Math.floor((line - 1) / LINES_PER_CELL);

/** rg's hits, as [file index, line]: user.py:142 is the definition. */
export const MATCHES: Array<[number, number]> = [
  [0, 142],
  [0, 176],
  [1, 88],
  [4, 18],
  [4, 104],
];

/** The lines sed prints from user.py. */
export const SED_LINES: [number, number] = [138, 160];

export const savedShare = () => Math.floor((1 - GRADUATED_TOKENS / FULL_READ_TOKENS) * 100);

// ─── The architecture: ten to one per layer, every layer kept ───

export interface PyramidShape {
  cols: number;
  rows: number;
  /** The block of this layer's cells that compresses into one cell above. */
  group: [cols: number, rows: number];
}

/**
 * A thousand chunks of corpus, then three layers of ten-to-one compression
 * down to one cell. Each group of ten sits under the cell it becomes.
 */
export const PYRAMID_SHAPES: PyramidShape[] = [
  { cols: 50, rows: 20, group: [5, 2] },
  { cols: 10, rows: 10, group: [1, 10] },
  { cols: 10, rows: 1, group: [10, 1] },
  { cols: 1, rows: 1, group: [1, 1] },
];

/** What each layer keeps, in the post's words. */
export const PYRAMID_LAYERS = [
  { name: 'Raw corpus', keeps: 'the text itself' },
  { name: 'Early', keeps: 'facts and entities' },
  { name: 'Middle', keeps: 'relationships and causal chains' },
  { name: 'Deep', keeps: 'reasoning patterns and structural insights' },
] as const;

/** The cell of the next layer up that a cell is compressed into. */
export function parentOf(shape: PyramidShape, col: number, row: number) {
  return { col: Math.floor(col / shape.group[0]), row: Math.floor(row / shape.group[1]) };
}

/** A cell's ancestor `levels` layers up. */
export function ancestorOf(
  shapes: PyramidShape[],
  layer: number,
  col: number,
  row: number,
  levels: number
) {
  let cell = { col, row };
  for (let l = layer; l < layer + levels; l++) cell = parentOf(shapes[l], cell.col, cell.row);
  return cell;
}

// ─── The math: log₁₀ of the corpus over the context window ───

/** 200K tokens at about four bytes each. */
export const CONTEXT_BYTES = 800e3;
export const RATIO_PER_LAYER = 10;

export interface ScaleRow {
  size: string;
  bytes: number;
  what: string;
}

export const SCALE_ROWS: ScaleRow[] = [
  { size: '800 KB', bytes: 800e3, what: "Claude's context window" },
  { size: '1 GB', bytes: 1e9, what: 'A large codebase' },
  { size: '20 GB', bytes: 20e9, what: 'All of English Wikipedia' },
  { size: '1 TB', bytes: 1e12, what: 'Estimated GPT-4 training data' },
  { size: '15 TB', bytes: 15e12, what: 'Library of Congress (text)' },
  { size: '50 TB', bytes: 50e12, what: 'All books ever written' },
  { size: '150 ZB', bytes: 150e21, what: 'All data created in a year' },
];

/** Layers of ten-to-one compression until `bytes` fits the context window. */
export function layersFor(bytes: number) {
  let layers = 0;
  let size = bytes;
  while (size > CONTEXT_BYTES * (1 + 1e-9)) {
    size /= RATIO_PER_LAYER;
    layers++;
  }
  return layers;
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB'];

export function formatBytes(bytes: number) {
  let unit = 0;
  let value = bytes;
  while (value >= 1000 * (1 - 1e-9) && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${UNITS[unit]}`;
}

/** The size after each layer, starting from the corpus itself. */
export function descent(bytes: number) {
  const sizes = [formatBytes(bytes)];
  let size = bytes;
  for (let i = 0; i < layersFor(bytes); i++) {
    size /= RATIO_PER_LAYER;
    sizes.push(formatBytes(size));
  }
  return sizes;
}

// ─── Lossy drift: eight passes that each keep 95% ───

export const PASSES = 8;
export const KEEP_PER_PASS = 0.95;
export const DRIFT_CELLS = 100;

/** Percent of the input left after `pass` passes. */
export const keptAfter = (pass: number) => 100 * KEEP_PER_PASS ** pass;

/** Cells left after each pass: 100, 95, 90, 86, 81, 77, 74, 70, 66. */
export const DRIFT_KEPT = Array.from({ length: PASSES + 1 }, (_, pass) =>
  Math.round(keptAfter(pass))
);

/** In the input, the share that turns out to be noise: what eight passes shed. */
export const DRIFT_NOISE = DRIFT_CELLS - DRIFT_KEPT[PASSES];

export type DriftMode = 'same' | 'aware';

export interface DriftCell {
  noise: boolean;
  /** The pass that drops it (1 to 8), or 0 if it reaches the top. */
  dropped: number;
}

/**
 * Which cell each pass drops. Layer-aware prompts shed the noise; the same
 * prompt at every depth sheds whatever it happens to, signal included.
 */
export function driftCells(mode: DriftMode): DriftCell[] {
  const random = seeded(95);
  const kinds = shuffled(
    Array.from({ length: DRIFT_CELLS }, (_, i) => i < DRIFT_NOISE),
    random
  );
  const cells: DriftCell[] = kinds.map((noise) => ({ noise, dropped: 0 }));
  // This draw of the same-prompt run loses signal at exactly the average
  // rate, 95% a pass: 66, 63, 60, 57, 54, 51, 49, 46, 44 signal cells.
  const order = seeded(mode === 'aware' ? 8 : 3967);
  for (let pass = 1; pass <= PASSES; pass++) {
    const drop = DRIFT_KEPT[pass - 1] - DRIFT_KEPT[pass];
    const alive = cells.filter((cell) => cell.dropped === 0);
    const pool = mode === 'aware' ? alive.filter((cell) => cell.noise) : alive;
    for (const cell of shuffled(pool, order).slice(0, drop)) cell.dropped = pass;
  }
  return cells;
}
