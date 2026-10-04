/**
 * The re-measurement of 2026-10-03, as charts on /jspark3/glm/. Every figure is copied from the screened
 * re-measurement table with its row as the receipt; nothing here is derived. Only a cell the table
 * marks PUBLISHABLE is drawn, and a chart with none is not drawn at all. Each number keeps the table's label,
 * verbatim, as its small print. These runs use their own measurements, apart from the release's results: each
 * chart names its ruler, no chart mixes two, and none is drawn on an axis with the release's figures.
 *
 * First-token figures for rows 2 and 3 are left off: they were reasoning, and the table gives no visible-text
 * partner for them (the release's partner rule).
 *
 * While PLACEHOLDER is true the section stays off in production; JSPARK3_REMEASURED_PREVIEW=1 shows it locally.
 */

/** A cell's mark in the table after the repetition screen. */
export type Screen = 'PUBLISHABLE' | 'DIAGNOSTIC' | 'HOLD';

export type RemeasuredBar = {
  /** What the bar measured, beside it. */
  name: string;
  /** The page's series colors: the release gold, or the earlier-release grey for a baseline. */
  tone: 'default' | 'before';
  /** The figure as the table prints it. */
  value: string;
  screen: Screen;
  /** The table's row for this figure, kept as the receipt. Never rendered. */
  row: string;
};

export type RemeasuredGroup = {
  key: string;
  label: string;
  /** Beside the label: a condition the figure is never shown without. */
  condition?: string;
  /** Beneath the bars: the table's label for these figures, verbatim. */
  smallPrint?: string;
  /** Beneath the label: a footnote the figures are never shown without. */
  note?: string;
  bars: RemeasuredBar[];
};

export type RemeasuredChart = {
  id: string;
  /** The measurement every bar in the chart shares; one per chart. */
  ruler: 'user-visible' | 'first-token' | 'resume' | 'combined';
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
/** What every figure ran on (table header). */
export const SETUP = 'JSPARK3 v2.0.1, base weights + draft model, three DGX Sparks';

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
        bars: [{ name: 'Code', tone: 'default', value: '92.5', screen: 'PUBLISHABLE', row: '2' }],
      },
      {
        key: 'short',
        label: 'Short replies',
        condition: 'first token 0.15 s code, 0.13 s prose',
        smallPrint: 'Replies forced to 128 tokens (the llama-bench tg128 length)',
        bars: [
          { name: 'Code', tone: 'default', value: '102.7', screen: 'PUBLISHABLE', row: '5' },
          { name: 'Prose', tone: 'default', value: '71.1', screen: 'PUBLISHABLE', row: '5' },
        ],
      },
      {
        key: 'long-prose',
        label: 'Long prose',
        smallPrint: 'Replies forced to 2,000 tokens, thinking requested off',
        bars: [{ name: 'Prose', tone: 'default', value: '73.6', screen: 'PUBLISHABLE', row: '4' }],
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
        note: 'End to end, counting the 15.3 s before the first token: 18.5 tok/s.',
        bars: [{ name: 'First token', tone: 'default', value: '15.3', screen: 'PUBLISHABLE', row: '6' }],
      },
      {
        key: '64k',
        label: '64K-token prompt',
        condition: 'read at 2,102 tok/s; the reply then streamed at 71 tok/s (after the first token)',
        note: 'End to end, counting the 31.2 s before the first token: 10.9 tok/s.',
        bars: [{ name: 'First token', tone: 'default', value: '31.2', screen: 'PUBLISHABLE', row: '6' }],
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
          { name: 'From disk', tone: 'default', value: '2.3', screen: 'HOLD', row: '7' },
          { name: 'Cold', tone: 'before', value: '56.7', screen: 'HOLD', row: '7' },
        ],
      },
    ],
  },
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
        bars: [{ name: 'Combined', tone: 'default', value: '191.4', screen: 'PUBLISHABLE', row: '3' }],
      },
      {
        key: 'long-prose',
        label: 'Prose, 2,000 tokens each',
        condition: '17.5 tok/s per request',
        smallPrint: 'Replies forced to 2,000 tokens, thinking requested off',
        bars: [{ name: 'Combined', tone: 'default', value: '133.3', screen: 'PUBLISHABLE', row: '4' }],
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

/** Charts for one user lead; the eight-at-once chart follows under its own heading. */
export const UNDER_LOAD = new Set(['eight']);
