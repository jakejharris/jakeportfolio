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
 * First-token figures for rows 2 and 3 are left off: they were reasoning, and the table gives no visible-text
 * partner for them (the release's partner rule).
 *
 * While PLACEHOLDER is true the section stays off in production; JSPARK3_REMEASURED_PREVIEW=1 shows it locally.
 */

import v180 from '../glm-v180.json';

/** A cell's mark in the table after the repetition screen. */
export type Screen = 'PUBLISHABLE' | 'DIAGNOSTIC' | 'HOLD';

export type RemeasuredBar = {
  /** What the bar measured, beside it. */
  name: string;
  /** The page's series colors: the release gold, or the earlier-release grey for v1.8.0. */
  tone: 'default' | 'before';
  /** The figure as its source prints it. */
  value: string;
  screen: Screen;
  /** Where the figure comes from, kept as the receipt: the table's row ("row 2"), or the published file and key. Never rendered. */
  source: string;
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
        smallPrint: 'One request asked for a complete program, natural length (5,543 tokens), user-visible rate including first token',
        bars: [{ name: 'Code', tone: 'default', value: '92.5', screen: 'PUBLISHABLE', source: 'row 2' }],
      },
      {
        key: 'short',
        label: 'Short replies',
        condition: 'first token 0.15 s code, 0.13 s prose',
        smallPrint: 'Replies forced to 128 tokens (the llama-bench tg128 length)',
        bars: [
          { name: 'Code', tone: 'default', value: '102.7', screen: 'PUBLISHABLE', source: 'row 5' },
          { name: 'Prose', tone: 'default', value: '71.1', screen: 'PUBLISHABLE', source: 'row 5' },
        ],
      },
      {
        key: 'long-prose',
        label: 'Long prose',
        smallPrint: 'Replies forced to 2,000 tokens, thinking requested off',
        bars: [{ name: 'Prose', tone: 'default', value: '73.6', screen: 'PUBLISHABLE', source: 'row 4' }],
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
        condition: 'read at 2,149 tok/s; the reply then streamed at 63 tok/s (after the first token)',
        notes: ['End to end, counting the 15.3 s before the first token: 18.5 tok/s.'],
        bars: [{ name: 'First token', tone: 'default', value: '15.3', screen: 'PUBLISHABLE', source: 'row 6' }],
      },
      {
        key: '64k',
        label: '64K-token prompt',
        condition: 'read at 2,102 tok/s; the reply then streamed at 71 tok/s (after the first token)',
        notes: ['End to end, counting the 31.2 s before the first token: 10.9 tok/s.'],
        bars: [{ name: 'First token', tone: 'default', value: '31.2', screen: 'PUBLISHABLE', source: 'row 6' }],
      },
    ],
  },
  // Held: which metric 2.3 s and 56.7 s are is still being pinned, and the title waits on it.
  {
    id: 'resume',
    ruler: 'resume',
    title: 'Returning to a 112K-token session',
    unit: 's',
    better: 'lower',
    smallPrint: 'Returning to a 112K-token session after a few seconds idle between turns; back-to-back traffic from other large sessions can prevent the disk save (known issue 11)',
    methods: 'The session\'s saved state is read back from each host\'s disk; cold, the whole prompt is read again.',
    groups: [
      {
        key: '112k',
        label: '112K-token session',
        bars: [
          { name: 'From disk', tone: 'default', value: '2.3', screen: 'HOLD', source: 'row 7' },
          { name: 'Cold', tone: 'before', value: '56.7', screen: 'HOLD', source: 'row 7' },
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
        condition: '28.1 tok/s per request',
        smallPrint: '8 code requests started together, natural reply length, combined user-visible rate',
        bars: [{ name: 'Combined', tone: 'default', value: '191.4', screen: 'HOLD', source: 'row 3' }],
      },
      {
        key: 'long-prose',
        label: 'Prose, 2,000 tokens each',
        condition: '17.5 tok/s per request',
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
  { chart: 'reply-one', group: 'short', label: 'First token on a short reply', value: '0.15', unit: 's', line: 'code; 0.13 s for prose' },
  { chart: 'long-prompt', group: '32k', label: 'First token after a 32K-token prompt', value: '15.3', unit: 's' },
];
