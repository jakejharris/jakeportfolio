/**
 * The re-measurement of 2026-10-03, as charts on /jspark3/glm/. Every figure is copied from the screened
 * re-measurement table with its row as the receipt; nothing here is derived. Only a cell the table
 * marks PUBLISHABLE is drawn, and a chart with none is not drawn at all. Each number keeps the table's label,
 * verbatim, as its small print. These runs use their own measurements, apart from the release's results: each
 * chart names its ruler, no chart mixes two, and none is drawn on an axis with the release's figures.
 *
 * The one figure from elsewhere is the baseline of a matched pair: v1.8.0's published prose figure for one stream,
 * read from glm-v180.json as its results page shows it. The pair's labels say how the two runs differ, and no
 * speedup is computed.
 *
 * Row 2's first streamed token was reasoning, so it never shows without the time its answer text began (the
 * release's partner rule).
 *
 * Each figure is rounded once, from the receipt's unrounded value (the round-once audit), and every timing and
 * short-reply rate says whether its prompt was fresh or already cached. Row 5 leads with its fresh-prompt figures;
 * the cached ones show only beside them, and the earlier means, which averaged a fresh run with cached ones, are
 * withdrawn. Row 6's reading rates are estimates (prompt tokens ÷ client first-token time) and say so. A per-request
 * figure is the mean of each request's own rate, not the total's share. The cached-prompt range takes a
 * non-breaking hyphen (\u2011), so it never wraps at the hyphen.
 *
 * While PLACEHOLDER is true the section stays off in production; JSPARK3_REMEASURED_PREVIEW=1 shows it locally.
 */

import v180 from '../glm-v180.json';

/** A cell's mark in the table after the repetition screen. */
export type Screen = 'PUBLISHABLE' | 'DIAGNOSTIC' | 'HOLD';

/** A figure as its source prints it, with its screen mark and its receipt (never rendered). */
export type RemeasuredCell = { value: string; screen: Screen; source: string };

export type RemeasuredBar = RemeasuredCell & {
  /** What the bar measured, beside it. */
  name: string;
  /** The page's series colors: the release gold, or the earlier-release grey for v1.8.0. */
  tone: 'default' | 'before';
};

export type RemeasuredGroup = {
  key: string;
  label: string;
  /** Beside the label: a condition the figure is never shown without. */
  condition?: string;
  /** Beneath the bars: the table's label for these figures, verbatim. */
  smallPrint?: string;
  /** Beneath the bars: footnotes the figures are never shown without, one line each. */
  notes?: string[];
  bars: RemeasuredBar[];
};

export type RemeasuredChart = {
  id: string;
  /** The measurement every bar in the chart shares; one per chart. */
  ruler: 'user-visible' | 'first-token' | 'resume' | 'combined' | 'v1.8-ladder';
  /** A subhead above the chart, for a chart that stands apart from the ones before it. */
  heading?: string;
  title: string;
  unit: string;
  better: 'higher' | 'lower';
  /** The table's label for every figure in the chart, verbatim, under the title. */
  smallPrint?: string;
  /** One line on how the chart was measured. */
  methods: string;
  groups: RemeasuredGroup[];
};

/**
 * A large figure above the charts, from one group of one chart: a bar's value or a figure its condition gives.
 * It carries that group's condition (or its own line), label and footnote.
 */
export type LeadFigure = { chart: string; group: string; label: string; value: string; unit: string; line?: string };

export const PLACEHOLDER = false;
export const DATE = '2026-10-03';
export const ANCHOR = 'remeasured-2026-10-03';

/** v1.8.0's published prose figure for one stream, as its results page shows it. */
const prose180 = v180.headline.prose_c1;

export const CHARTS: RemeasuredChart[] = [
  {
    id: 'reply-one',
    ruler: 'user-visible',
    title: 'Reply speed, one request at a time',
    unit: 'tok/s',
    better: 'higher',
    methods: 'User-visible rate: reply tokens over the time from sending the request to its last token, so the wait for the first token counts.',
    groups: [
      {
        key: 'natural-code',
        label: 'A complete program',
        condition: 'fresh prompt: first streamed reasoning 0.26 s; first answer text by 0.62 s',
        smallPrint: 'One request asked for a complete program, natural length (5,543 tokens), user-visible rate including first token',
        notes: ['Answer-text time is a collector upper bound.'],
        bars: [{ name: 'Code', tone: 'default', value: '92.5', screen: 'PUBLISHABLE', source: 'row 2' }],
      },
      {
        key: 'short',
        label: 'Short replies, fresh prompt',
        condition: 'first token 0.31 s (code) / 0.25 s (prose) on a fresh prompt; 0.07\u20110.08 s when the prompt is already cached',
        smallPrint: 'Replies forced to 128 tokens (the llama-bench tg128 length)',
        notes: ['With the prompt already cached: code 108.5 tok/s, prose 73.5 tok/s.', 'One fresh-prompt and two cached-prompt requests each, for code and for prose.'],
        bars: [
          { name: 'Code', tone: 'default', value: '91.1', screen: 'PUBLISHABLE', source: 'row 5' },
          { name: 'Prose', tone: 'default', value: '66.2', screen: 'PUBLISHABLE', source: 'row 5' },
        ],
      },
      {
        key: 'long-prose',
        label: 'Long prose',
        smallPrint: 'Replies forced to 2,000 tokens, thinking requested off',
        bars: [{ name: 'Prose', tone: 'default', value: '73.5', screen: 'PUBLISHABLE', source: 'row 4' }],
      },
    ],
  },
  {
    id: 'long-prompt',
    ruler: 'first-token',
    title: 'Time to first token after a long prompt',
    unit: 's',
    better: 'lower',
    smallPrint: 'One request, unique prompt (no cache), 400-token reply',
    methods: 'From sending the request to the first token streamed back, with none of the prompt reused from cache.',
    groups: [
      {
        key: '32k',
        label: '32K-token prompt',
        condition: 'read at ≈2,149 tok/s (estimated as prompt tokens ÷ client first-token time); the reply then streamed at 63 tok/s (after the first token)',
        notes: ['End to end, counting the 15.3 s before the first token: 18.5 tok/s.'],
        bars: [{ name: 'First token', tone: 'default', value: '15.3', screen: 'PUBLISHABLE', source: 'row 6' }],
      },
      {
        key: '64k',
        label: '64K-token prompt',
        condition: 'read at ≈2,102 tok/s (the same estimate); the reply then streamed at 71 tok/s (after the first token)',
        notes: ['End to end, counting the 31.2 s before the first token: 10.9 tok/s.'],
        bars: [{ name: 'First token', tone: 'default', value: '31.2', screen: 'PUBLISHABLE', source: 'row 6' }],
      },
    ],
  },
  {
    id: 'resume',
    ruler: 'resume',
    title: 'Returning to a ~112K-token session: server prefill 2.3 s with disk cache vs 56.7 s fresh',
    unit: 's',
    better: 'lower',
    smallPrint: 'Separate requests in one session chain: 112,728 / 112,743 prompt tokens; the disk request reused 112,156 tokens. Different system prefix and output limit, so an illustrative disk-hit vs fresh-prefill observation, not an identical-request A/B. Disk save needs idle time; back-to-back large-session traffic can prevent it (known issue 17)',
    methods: 'Server prefill is the server\'s own time to process the prompt before it starts the reply.',
    groups: [
      {
        key: '112k',
        label: 'Server prefill',
        notes: ['Seen from the client, the first reasoning arrived at 2.5 s with the disk cache and at 56.9 s fresh.'],
        bars: [
          { name: 'Disk cache', tone: 'default', value: '2.3', screen: 'PUBLISHABLE', source: 'row 7' },
          { name: 'Fresh', tone: 'default', value: '56.7', screen: 'PUBLISHABLE', source: 'row 7' },
        ],
      },
    ],
  },
  // Held: the site shows no figures for eight requests at once.
  {
    id: 'eight',
    ruler: 'combined',
    title: 'Eight requests at once, all replies combined',
    unit: 'tok/s',
    better: 'higher',
    methods: 'Combined rate: every reply token over the time from the first request sent to the last token. It is not the speed one user sees.',
    groups: [
      {
        key: 'natural-code',
        label: 'Code, natural length',
        condition: '28.1 tok/s mean per-request rate (total ÷ 8 = 23.9)',
        smallPrint: '8 code requests started together, natural reply length, combined user-visible rate',
        bars: [{ name: 'Combined', tone: 'default', value: '191.4', screen: 'HOLD', source: 'row 3' }],
      },
      {
        key: 'long-prose',
        label: 'Prose, 2,000 tokens each',
        condition: '17.5 tok/s mean per-request rate (total ÷ 8 = 16.7)',
        smallPrint: 'Replies forced to 2,000 tokens, thinking requested off',
        bars: [{ name: 'Combined', tone: 'default', value: '133.3', screen: 'HOLD', source: 'row 4' }],
      },
    ],
  },
  {
    id: 'prose-v180',
    ruler: 'v1.8-ladder',
    heading: 'One stream of prose, against v1.8.0',
    title: 'Prose decode, one stream, on the v1.8 ladder',
    unit: 'tok/s',
    better: 'higher',
    smallPrint: 'Best of 3 runs. Replies of 400 tokens started together, thinking requested off, temperature 0. Combined rate = tokens after each first token ÷ time from the earliest first token to the latest last token, the same formula as v1.8\'s ladder, which used 512-token replies. Measured 2026-10-03',
    methods: 'With one stream, the combined rate is that stream\'s own rate after its first token.',
    groups: [
      {
        key: 'prose-c1',
        label: 'Prose, one stream',
        notes: ['New runs repeated the same prompts; v1.8\'s did not.', 'Grey figure is v1.8.0\'s published ladder, better of 2 runs, unscreened for repetition.'],
        bars: [
          { name: 'v1.8.0', tone: 'before', value: prose180.hi_text, screen: 'PUBLISHABLE', source: 'glm-v180.json headline.prose_c1.hi_text (v1.8.0 results release_m0.decode_prose_c1.hi)' },
          { name: 'v2.0.1', tone: 'default', value: '67.9', screen: 'PUBLISHABLE', source: 'row 8' },
        ],
      },
    ],
  },
];

/** Above the charts: what one user feels first. */
export const LEAD: LeadFigure[] = [
  { chart: 'reply-one', group: 'natural-code', label: 'A complete program, one request', value: '92.5', unit: 'tok/s', line: 'user-visible, from send to the last token' },
  { chart: 'reply-one', group: 'short', label: 'First token on a short reply', value: '0.31', unit: 's', line: 'code, on a fresh prompt; 0.25 s for prose; 0.07\u20110.08 s when the prompt is already cached' },
  { chart: 'long-prompt', group: '32k', label: 'First token after a 32K-token prompt', value: '15.3', unit: 's' },
];

/**
 * The GLM page's hero tiles: the re-measured figures lead, each with its group's label as its caption. The
 * release's tiles named in HERO_RELEASE_TILES follow, until a re-measured figure replaces them.
 */
export const HERO: LeadFigure[] = [
  { chart: 'reply-one', group: 'natural-code', label: 'Code, one request', value: '92.5', unit: 'tok/s' },
  { chart: 'reply-one', group: 'long-prose', label: 'Prose, one request', value: '73.5', unit: 'tok/s' },
  { chart: 'long-prompt', group: '32k', label: 'Reading a 32K-token prompt', value: '≈2,149', unit: 'tok/s', line: 'estimated as prompt tokens ÷ client first-token time (15.3 s)' },
];
export const HERO_RELEASE_TILES = ['rigmark.c4'];

/**
 * Tonight's figures as rows of "Every measured v2.0.1 set", one chart per measurement. The table measured base
 * weights + draft model (MEASURED_SET), so each row takes that set's figure from the band chart it names. A
 * figure for another set drops in under `sets`, keyed by its result-set id, with nothing else to change; until
 * then that set reads "Not yet re-measured". A row with nothing to draw is left out.
 */
export type SetRow = { key: string; label: string; from: { chart: string; group: string; bar: string }; sets?: Record<string, RemeasuredCell> };
export type RemeasuredSetChart = Pick<RemeasuredChart, 'id' | 'ruler' | 'title' | 'unit' | 'better' | 'methods'> & { rows: SetRow[] };
export const MEASURED_SET = 'V-D';

export const SET_CHARTS: RemeasuredSetChart[] = [
  {
    id: 'sets-reply',
    ruler: 'user-visible',
    title: 'Reply speed, one request at a time, user-visible',
    unit: 'tok/s',
    better: 'higher',
    methods: 'User-visible rate: reply tokens over the time from sending the request to its last token, so the wait for the first token counts.',
    rows: [
      { key: 'natural-code', label: 'A complete program, natural length', from: { chart: 'reply-one', group: 'natural-code', bar: 'Code' } },
      { key: 'short-code', label: 'Code, forced to 128 tokens, fresh prompt', from: { chart: 'reply-one', group: 'short', bar: 'Code' } },
      { key: 'short-prose', label: 'Prose, forced to 128 tokens, fresh prompt', from: { chart: 'reply-one', group: 'short', bar: 'Prose' } },
      { key: 'long-prose', label: 'Prose, forced to 2,000 tokens', from: { chart: 'reply-one', group: 'long-prose', bar: 'Prose' } },
    ],
  },
  {
    id: 'sets-long-prompt',
    ruler: 'first-token',
    title: 'Time to first token after a long prompt, nothing reused from cache',
    unit: 's',
    better: 'lower',
    methods: 'From sending the request to the first token streamed back, with none of the prompt reused from cache.',
    rows: [
      { key: '32k', label: '32K-token prompt', from: { chart: 'long-prompt', group: '32k', bar: 'First token' } },
      { key: '64k', label: '64K-token prompt', from: { chart: 'long-prompt', group: '64k', bar: 'First token' } },
    ],
  },
];
