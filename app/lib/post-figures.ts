// Pure layout and validation for the post figure blocks (timeline, statGrid,
// studyCards, overlapGrid, beforeAfter). The components draw what these
// return, and the Sanity schema validates with the same checks, so Studio
// refuses data the page could not draw.

// ---------------------------------------------------------------- clock

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutes after midnight for "HH:MM", or null when it is not a clock time. */
export function parseClock(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = CLOCK.exec(value.trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** 90 -> "1:30 AM", 780 -> "1 PM" with `short`. */
export function formatClock(minutes: number, { short = false, meridiem = true } = {}) {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const time = short && m === 0 ? `${h12}` : `${h12}:${String(m).padStart(2, '0')}`;
  return meridiem ? `${time} ${h24 < 12 ? 'AM' : 'PM'}` : time;
}

/** "1:49 AM", or "3:10 to 9:11 AM" when a span keeps its half of the day. */
export function formatClockRange(start: number, end?: number) {
  if (end === undefined || end === start) return formatClock(start);
  const sameHalf = Math.floor(start / 720) === Math.floor(end / 720);
  return `${formatClock(start, { meridiem: !sameHalf })} to ${formatClock(end)}`;
}

// ------------------------------------------------------------- timeline

export interface ClockItem {
  start: string;
  end?: string;
}

export interface TimelineScale {
  /** Minutes after midnight at the left edge. */
  from: number;
  /** Minutes after midnight at the right edge. */
  to: number;
  /** Hours between ticks. */
  step: number;
  ticks: Array<{ minutes: number; label: string; minor: boolean }>;
}

const TICK_STEPS = [1, 2, 3, 4, 6];

/**
 * The axis for a set of clock times: whole hours around them, with a tick
 * step that keeps the desktop axis to at most `maxTicks` labels. Every other
 * tick is `minor`, so a narrow screen can show half of them.
 */
export function timelineScale(items: ClockItem[], maxTicks = 8): TimelineScale {
  const minutes = items.flatMap((item) => [parseClock(item.start), parseClock(item.end)]).filter(
    (value): value is number => value !== null
  );
  if (minutes.length === 0) return { from: 0, to: 60, step: 1, ticks: [] };
  const from = Math.floor(Math.min(...minutes) / 60) * 60;
  let to = Math.ceil(Math.max(...minutes) / 60) * 60;
  if (to <= from) to = from + 60;
  const hours = (to - from) / 60;
  const step = TICK_STEPS.find((s) => Math.ceil(hours / s) + 1 <= maxTicks) ?? 12;

  // Ticks run from the first whole hour, and an even number of steps puts
  // the last tick on a major one, so a phone's half set stays evenly spaced.
  let steps = Math.ceil((to - from) / 60 / step);
  if (steps % 2 === 1 && steps > 1) steps += 1;
  to = from + steps * step * 60;
  const ticks = [];
  for (let t = from, i = 0; t <= to; t += step * 60, i++) {
    ticks.push({ minutes: t, label: formatClock(t, { short: true }), minor: i % 2 === 1 });
  }
  return { from, to, step, ticks };
}

/** Percent along the axis, clamped to it. */
export function clockPercent(minutes: number, scale: Pick<TimelineScale, 'from' | 'to'>) {
  const ratio = (minutes - scale.from) / (scale.to - scale.from);
  return Math.round(Math.min(1, Math.max(0, ratio)) * 10000) / 100;
}

/** Events and gaps in reading order: by start, an event before a gap that starts with it. */
export function timelineOrder<E extends ClockItem, G extends ClockItem>(events: E[], gaps: G[] = []) {
  const rows = [
    ...events.map((item, index) => ({ kind: 'event' as const, item, index })),
    ...gaps.map((item, index) => ({ kind: 'gap' as const, item, index })),
  ];
  return rows.sort((a, b) => {
    const delta = (parseClock(a.item.start) ?? 0) - (parseClock(b.item.start) ?? 0);
    if (delta !== 0) return delta;
    if (a.kind !== b.kind) return a.kind === 'event' ? -1 : 1;
    return a.index - b.index;
  });
}

export type Check = true | string;

/** A start and optional end, end after start, same day. */
export function checkClockSpan(item: Partial<ClockItem> | undefined, needsEnd = false): Check {
  if (!item) return true;
  const start = parseClock(item.start);
  if (start === null) return 'Start must be a 24-hour time like 07:30 or 13:05.';
  if (item.end === undefined || item.end === '') return needsEnd ? 'An end time is required.' : true;
  const end = parseClock(item.end);
  if (end === null) return 'End must be a 24-hour time like 18:45.';
  if (end <= start) return 'End must be later than start on the same day.';
  return true;
}

/** Every event names one of the lanes. */
export function checkTimelineLanes(lanes: unknown, events: Array<{ lane?: string }> | undefined): Check {
  const names = Array.isArray(lanes) ? lanes.filter((name) => typeof name === 'string' && name.trim()) : [];
  if (names.length < 1 || names.length > 3) return 'Give one to three lane names.';
  if (new Set(names).size !== names.length) return 'Lane names must differ.';
  const unknown = (events ?? []).filter((event) => !names.includes(event.lane ?? ''));
  if (unknown.length) {
    return `Each event's lane must be one of: ${names.join(', ')}. Not found: ${[...new Set(unknown.map((e) => e.lane || '(empty)'))].join(', ')}.`;
  }
  return true;
}

// ------------------------------------------------------------- statGrid

/**
 * Columns for n stats. On a phone, two when n is even and the labels are
 * short, else one; on wider screens, three when n divides by three.
 */
export function statColumns(n: number, longestLabel = 0) {
  const phone = n % 2 === 0 && longestLabel <= 60 ? 2 : 1;
  const wide = n % 3 === 0 || n === 5 ? 3 : n === 1 ? 1 : 2;
  return { phone, wide };
}

// ---------------------------------------------------------- overlapGrid

export type OverlapCell = 'hit' | 'a' | 'b' | 'both';

export function checkOverlap(v: { total?: number; aMisses?: number; bMisses?: number; shared?: number }): Check {
  const { total, aMisses, bMisses, shared } = v;
  const whole = (x: unknown) => typeof x === 'number' && Number.isInteger(x) && x >= 0;
  if (!whole(total) || total! < 10 || total! > 200 || total! % 10 !== 0) {
    return 'Total must be a whole number from 10 to 200, in tens (rows of ten).';
  }
  if (!whole(aMisses) || !whole(bMisses) || !whole(shared)) return 'Misses and shared must be whole numbers.';
  if (aMisses! > total! || bMisses! > total!) return 'Misses cannot exceed the total.';
  if (shared! > Math.min(aMisses!, bMisses!)) return 'Shared misses cannot exceed either side’s misses.';
  return true;
}

/** A fixed shuffle of 0..n-1, so a grid looks scattered and draws the same on every render. */
function scatter(n: number, seed: number) {
  const order = Array.from({ length: n }, (_, i) => i);
  let state = seed >>> 0 || 1;
  for (let i = n - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Which questions each side misses. Shared misses sit in the same cells in
 * every grid, so the eye can match them across panels.
 */
export function overlapCells(total: number, aMisses: number, bMisses: number, shared: number, seed = 11): OverlapCell[] {
  const check = checkOverlap({ total, aMisses, bMisses, shared });
  if (check !== true) throw new Error(check);
  const cells: OverlapCell[] = Array.from({ length: total }, () => 'hit');
  const order = scatter(total, seed);
  let k = 0;
  for (let i = 0; i < shared; i++) cells[order[k++]] = 'both';
  for (let i = 0; i < aMisses - shared; i++) cells[order[k++]] = 'a';
  for (let i = 0; i < bMisses - shared; i++) cells[order[k++]] = 'b';
  return cells;
}

// ----------------------------------------------------------- beforeAfter

export interface Scale {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

const NICE = [1, 2, 5, 10];

/** Round ends and an even step around the values, about `target` intervals; given ends win. */
export function niceScale(values: number[], target = 5, fixedMin?: number, fixedMax?: number): Scale {
  const finite = values.filter(Number.isFinite);
  let lo = fixedMin ?? Math.min(...finite);
  let hi = fixedMax ?? Math.max(...finite);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    lo = 0;
    hi = 1;
  }
  if (hi === lo) {
    lo -= 1;
    hi += 1;
  }
  const raw = (hi - lo) / target;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = (NICE.find((n) => n * power >= raw) ?? 10) * power;
  const min = fixedMin ?? Math.floor(lo / step + 1e-9) * step;
  let max = fixedMax ?? Math.ceil(hi / step - 1e-9) * step;
  // An even number of steps ends the axis on a tick a phone still shows.
  if (fixedMax === undefined && fixedMin === undefined && Math.round((max - min) / step) % 2 === 1) max += step;
  const ticks: number[] = [];
  const first = Math.ceil(min / step - 1e-9) * step;
  for (let t = first; t <= max + step * 1e-9; t += step) ticks.push(round(t, 6) || 0);
  return { min, max, step, ticks };
}

export function scalePercent(value: number, scale: Pick<Scale, 'min' | 'max'>) {
  const ratio = (value - scale.min) / (scale.max - scale.min);
  return Math.round(Math.min(1, Math.max(0, ratio)) * 10000) / 100;
}

function round(value: number, digits: number) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** The most decimals any value uses, so a column lines up: 84.5 and 91 show as 84.5 and 91.0. */
export function decimalsOf(values: number[]) {
  return values.reduce((most, v) => {
    const text = String(v);
    const dot = text.indexOf('.');
    return Math.max(most, dot < 0 ? 0 : text.length - dot - 1);
  }, 0);
}

/** "+18.1", "−8.6" (a true minus sign), or null when nothing changed. */
export function formatDelta(before: number, after: number, decimals: number) {
  const delta = round(after - before, decimals);
  if (delta === 0) return null;
  const text = Math.abs(delta).toFixed(decimals);
  return delta > 0 ? `+${text}` : `−${text}`;
}

export function checkScale(v: { scaleMin?: number; scaleMax?: number; rows?: Array<{ before?: number; after?: number }> }): Check {
  const { scaleMin, scaleMax, rows = [] } = v;
  if (scaleMin !== undefined && scaleMax !== undefined && scaleMax <= scaleMin) return 'Scale max must be above scale min.';
  for (const row of rows) {
    for (const value of [row.before, row.after]) {
      if (typeof value !== 'number') continue;
      if (scaleMin !== undefined && value < scaleMin) return `A value (${value}) is below the scale min.`;
      if (scaleMax !== undefined && value > scaleMax) return `A value (${value}) is above the scale max.`;
    }
  }
  return true;
}

// --------------------------------------------------------------- shared

/** Only web links, so a pasted javascript: or relative link never renders. */
export function safeHref(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}
