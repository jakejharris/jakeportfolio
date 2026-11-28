// Pure layout and validation for the run chart block: rows of timed bars on
// one clock, grouped, colored by category. The component draws what
// buildRunChart returns, and Studio validates with checkRunChart, so the
// editor refuses data the page could not draw. Nothing here throws on bad
// data: the page drops what it cannot place.

import { clockPercent, evenSteps, formatClock, parseClock, type Check } from './post-figures';

export const RUN_LIMITS = {
  groups: 24,
  categories: 6,
  lanes: 80,
  spans: 400,
  markers: 60,
  milestones: 8,
} as const;

const DAY = 24 * 60;
const TICK_STEPS = [1, 2, 3, 4, 6, 12];

const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

// ---------------------------------------------------------------- clock

/**
 * Minutes after midnight of the run's first day for a "HH:MM" clock time.
 * A time earlier than the run's start is the next day, so a run can cross
 * midnight. Null when either is not a clock time.
 */
export function runMinutes(clock: unknown, start: number | null): number | null {
  const minutes = parseClock(clock);
  if (minutes === null || start === null) return null;
  return minutes < start ? minutes + DAY : minutes;
}

/** "2 AM" style label for a run minute, wrapping past midnight. */
export function runClockLabel(minutes: number, short = false) {
  return formatClock(((minutes % DAY) + DAY) % DAY, { short });
}

/** "3:10 to 3:38 AM", or "11:50 PM to 12:10 AM" across halves of the day. */
export function runRangeLabel(start: number, end: number) {
  const a = ((start % DAY) + DAY) % DAY;
  const b = ((end % DAY) + DAY) % DAY;
  const sameHalf = Math.floor(start / 720) === Math.floor(end / 720);
  return `${formatClock(a, { meridiem: !sameHalf })} to ${formatClock(b)}`;
}

// ------------------------------------------------------------- the axis

export interface RunTick {
  minutes: number;
  label: string;
  /** Hidden on narrow charts, which show every other tick. */
  minor: boolean;
  /** Keeps its AM or PM on the narrowest charts: the ends, and where the half of the day changes. */
  meridiem: boolean;
}

export interface RunWindow {
  /** Run minutes at the left edge, on a whole hour. */
  from: number;
  /** Run minutes at the right edge, on a whole hour. */
  to: number;
  /** Hours between ticks. */
  step: number;
  ticks: RunTick[];
}

/**
 * The clock axis: from the hour the run starts in to the hour after its last
 * moment (or `end`, when that is later), in a tick step that keeps the wide
 * axis to `maxTicks` labels. The step count is even past one, so the narrow
 * axis (every other tick) still ends on a tick.
 */
export function runWindow(start: number, last: number, end?: number | null, maxTicks = 13): RunWindow {
  const from = Math.floor(start / 60) * 60;
  let to = Math.ceil(Math.max(last, end ?? 0, start) / 60) * 60;
  if (to <= from) to = from + 60;
  const hours = (to - from) / 60;
  const even = (step: number) => evenSteps(hours, step);
  const step = TICK_STEPS.find((s) => even(s) + 1 <= maxTicks) ?? 24;
  const steps = even(step);
  to = from + steps * step * 60;
  const ticks: RunTick[] = [];
  const half = (minutes: number) => Math.floor((((minutes % DAY) + DAY) % DAY) / 720);
  let lastMajorHalf = -1;
  for (let i = 0; i <= steps; i++) {
    const minutes = from + i * step * 60;
    const minor = steps > 1 && i % 2 === 1;
    const meridiem = i === 0 || i === steps || (!minor && half(minutes) !== lastMajorHalf);
    if (!minor) lastMajorHalf = half(minutes);
    ticks.push({ minutes, label: runClockLabel(minutes, true), minor, meridiem });
  }
  return { from, to, step, ticks };
}

/** Percent along the axis, clamped, to two decimals (the timeline's own helper). */
export const runPercent: (minutes: number, window: Pick<RunWindow, 'from' | 'to'>) => number = clockPercent;

// ------------------------------------------------------------ the model

export interface RunBar {
  row: number;
  left: number;
  width: number;
  /** Palette slot, the category's place in the legend. */
  slot: number;
  thin: boolean;
}

export interface RunDot {
  row: number;
  left: number;
  accent: boolean;
}

export interface RunLaneSummary {
  label: string;
  thin: boolean;
  /** Category names of this row's spans, in legend order, without repeats. */
  categories: string[];
  spans: string[];
  markers: string[];
}

export interface RunGroupModel {
  key: string;
  label: string;
  heading?: string;
  rows: number;
  bars: RunBar[];
  dots: RunDot[];
  lanes: RunLaneSummary[];
}

export interface RunMilestoneModel {
  label: string;
  time: string;
  left: number;
  /** Labels in the right part of the chart end at their line. */
  anchor: 'start' | 'end';
}

export interface RunChartModel {
  window: RunWindow;
  groups: RunGroupModel[];
  categories: Array<{ label: string; slot: number }>;
  milestones: RunMilestoneModel[];
  /** Milestones after the axis ends, listed rather than drawn. */
  later: Array<{ label: string; time: string }>;
  /** One step per axis hour: its minute (unique even when a run passes a day and labels repeat), the clock and how many spans had ended by then. */
  readout: Array<{ minutes: number; label: string; done: number }>;
  total: number;
  hasThin: boolean;
  /** Run time of the first and last moments, for the summary. */
  first: number;
  last: number;
}

interface CleanData {
  start: number;
  groups: Array<{ key: string; label: string; heading?: string }>;
  categories: Array<{ key: string; label: string }>;
  lanes: Array<{ key: string; label: string; group: string; thin: boolean }>;
  spans: Array<{ lane: string; category: string; start: number; end: number }>;
  markers: Array<{ lane: string; time: number; accent: boolean; label: string }>;
  milestones: Array<{ label: string; time: number }>;
  end: number | null;
}

type Raw = Record<string, unknown> | null | undefined;

/** Unique keyed items with a label; later duplicates and blanks are dropped. */
function keyed<T extends { key: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.key || seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });
}

function clean(value: unknown): CleanData | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const start = parseClock(v.start);
  if (start === null) return null;

  const groups = keyed(
    list<Raw>(v.groups)
      .slice(0, RUN_LIMITS.groups)
      .map((g) => ({ key: text(g?.key), label: text(g?.label), heading: text(g?.heading) || undefined }))
      .filter((g) => g.label)
  );
  const categories = keyed(
    list<Raw>(v.categories)
      .slice(0, RUN_LIMITS.categories)
      .map((c) => ({ key: text(c?.key), label: text(c?.label) }))
      .filter((c) => c.label)
  );
  const groupKeys = new Set(groups.map((g) => g.key));
  const lanes = keyed(
    list<Raw>(v.lanes)
      .slice(0, RUN_LIMITS.lanes)
      .map((l) => ({ key: text(l?.key), label: text(l?.label), group: text(l?.group), thin: l?.thin === true }))
      .filter((l) => l.label && groupKeys.has(l.group))
  );
  const laneKeys = new Set(lanes.map((l) => l.key));
  const categoryKeys = new Set(categories.map((c) => c.key));
  const spans = list<Raw>(v.spans)
    .slice(0, RUN_LIMITS.spans)
    .map((s) => ({
      lane: text(s?.lane),
      category: text(s?.category),
      start: runMinutes(s?.start, start),
      end: runMinutes(s?.end, start),
    }))
    .filter(
      (s): s is CleanData['spans'][number] =>
        laneKeys.has(s.lane) && categoryKeys.has(s.category) && s.start !== null && s.end !== null && s.end > s.start
    );
  const markers = list<Raw>(v.markers)
    .slice(0, RUN_LIMITS.markers)
    .map((m) => ({ lane: text(m?.lane), time: runMinutes(m?.time, start), accent: m?.kind === 'accent', label: text(m?.label) }))
    .filter((m): m is CleanData['markers'][number] => laneKeys.has(m.lane) && m.time !== null);
  const milestones = list<Raw>(v.milestones)
    .slice(0, RUN_LIMITS.milestones)
    .map((m) => ({ label: text(m?.label), time: runMinutes(m?.time, start) }))
    .filter((m): m is CleanData['milestones'][number] => Boolean(m.label) && m.time !== null);
  return { start, groups, categories, lanes, spans, markers, milestones, end: runMinutes(v.end, start) };
}

/**
 * Everything the chart draws, in percent of the axis, from block data of any
 * quality. Rows without a known group, spans without a known row or
 * category, and times that are not clock times are dropped. Null when
 * nothing is left to draw.
 */
export function buildRunChart(value: unknown, maxTicks = 13): RunChartModel | null {
  const data = clean(value);
  if (!data) return null;
  const { spans, markers } = data;
  if (spans.length === 0 && markers.length === 0) return null;

  const moments = [...spans.flatMap((s) => [s.start, s.end]), ...markers.map((m) => m.time)];
  const first = Math.min(...moments);
  const last = Math.max(...moments);
  const window = runWindow(data.start, last, data.end, maxTicks);
  const slotOf = new Map(data.categories.map((c, i) => [c.key, i]));
  const categoryLabel = new Map(data.categories.map((c) => [c.key, c.label]));

  const groups: RunGroupModel[] = [];
  for (const group of data.groups) {
    const lanes = data.lanes.filter((l) => l.group === group.key);
    if (lanes.length === 0) continue;
    const model: RunGroupModel = { ...group, rows: lanes.length, bars: [], dots: [], lanes: [] };
    lanes.forEach((lane, row) => {
      const own = spans.filter((s) => s.lane === lane.key).sort((a, b) => a.start - b.start);
      const dots = markers.filter((m) => m.lane === lane.key).sort((a, b) => a.time - b.time);
      for (const span of own) {
        const left = runPercent(span.start, window);
        model.bars.push({
          row,
          left,
          width: Math.round((runPercent(span.end, window) - left) * 100) / 100,
          slot: slotOf.get(span.category) ?? 0,
          thin: lane.thin,
        });
      }
      for (const dot of dots) model.dots.push({ row, left: runPercent(dot.time, window), accent: dot.accent });
      const used = [...new Set(own.map((s) => s.category))].sort((a, b) => (slotOf.get(a) ?? 0) - (slotOf.get(b) ?? 0));
      model.lanes.push({
        label: lane.label,
        thin: lane.thin,
        categories: used.map((key) => categoryLabel.get(key) ?? key),
        spans: own.map((s) => runRangeLabel(s.start, s.end)),
        markers: dots.map((d) => (d.label ? `${runClockLabel(d.time)} (${d.label})` : runClockLabel(d.time))),
      });
    });
    groups.push(model);
  }
  if (groups.length === 0) return null;

  const milestones: RunMilestoneModel[] = [];
  const later: RunChartModel['later'] = [];
  for (const m of [...data.milestones].sort((a, b) => a.time - b.time)) {
    if (m.time > window.to) {
      later.push({ label: m.label, time: runClockLabel(m.time) });
      continue;
    }
    const left = runPercent(m.time, window);
    milestones.push({ label: m.label, time: runClockLabel(m.time), left, anchor: left > 60 ? 'end' : 'start' });
  }

  const drawn = groups.reduce((n, g) => n + g.bars.length, 0);
  const shownLanes = new Set(data.lanes.filter((l) => groups.some((g) => g.key === l.group)).map((l) => l.key));
  const ends = spans.filter((s) => shownLanes.has(s.lane)).map((s) => s.end);
  const readout = [];
  for (let m = window.from; m <= window.to; m += 60) {
    readout.push({ minutes: m, label: runClockLabel(m, true), done: ends.filter((end) => end <= m).length });
  }

  return {
    window,
    groups,
    categories: data.categories.map((c, slot) => ({ label: c.label, slot })),
    milestones,
    later,
    readout,
    total: drawn,
    hasThin: groups.some((g) => g.lanes.some((l) => l.thin)),
    first,
    last,
  };
}

// ----------------------------------------------------------- validation

/**
 * The first problem in a run chart's data, or true. Studio shows the
 * message on the block; the page draws what it can either way.
 */
export function checkRunChart(value: unknown): Check {
  if (!value || typeof value !== 'object') return true;
  const v = value as Record<string, unknown>;
  const start = parseClock(v.start);
  if (start === null) return 'Start must be a 24-hour time like 01:49.';

  // Required names can still be only spaces in Studio; the page drops those items, so refuse them here.
  const keys = (name: string, items: Raw[]) => {
    const seen = new Set<string>();
    for (const [i, item] of items.entries()) {
      const key = text(item?.key);
      if (!key) return `${name} ${i + 1} needs a key.`;
      if (seen.has(key)) return `${name} key "${key}" is used twice.`;
      if (!text(item?.label)) return `${name} "${key}" needs a name.`;
      seen.add(key);
    }
    return seen;
  };
  const groups = keys('Group', list<Raw>(v.groups));
  if (typeof groups === 'string') return groups;
  const categories = keys('Category', list<Raw>(v.categories));
  if (typeof categories === 'string') return categories;
  const lanes = keys('Row', list<Raw>(v.lanes));
  if (typeof lanes === 'string') return lanes;

  for (const lane of list<Raw>(v.lanes)) {
    if (!groups.has(text(lane?.group))) return `Row "${text(lane?.key)}" names group "${text(lane?.group)}", which is not in Groups.`;
  }
  for (const group of groups) {
    if (!list<Raw>(v.lanes).some((lane) => text(lane?.group) === group)) return `Group "${group}" has no rows.`;
  }

  const endAxis = v.end ? runMinutes(v.end, start) : null;
  if (v.end && endAxis === null) return 'End must be a 24-hour time like 13:30, or empty.';
  const timeProblem = (what: string, minutes: number | null) => {
    if (minutes === null) return `${what}: use a 24-hour time like 07:30.`;
    if (endAxis !== null && minutes > endAxis) return `${what} is after the chart's end.`;
    return null;
  };

  for (const [i, span] of list<Raw>(v.spans).entries()) {
    const name = `Span ${i + 1}`;
    if (!lanes.has(text(span?.lane))) return `${name} names row "${text(span?.lane)}", which is not in Rows.`;
    if (!categories.has(text(span?.category))) return `${name} names category "${text(span?.category)}", which is not in Categories.`;
    const a = runMinutes(span?.start, start);
    const b = runMinutes(span?.end, start);
    const problem = timeProblem(`${name} start`, a) ?? timeProblem(`${name} end`, b);
    if (problem) return problem;
    if (b! <= a!) return `${name} must end after it starts. Times before the run's start count as the next day.`;
  }
  for (const [i, marker] of list<Raw>(v.markers).entries()) {
    const name = `Marker ${i + 1}`;
    if (!lanes.has(text(marker?.lane))) return `${name} names row "${text(marker?.lane)}", which is not in Rows.`;
    const problem = timeProblem(name, runMinutes(marker?.time, start));
    if (problem) return problem;
  }
  for (const [i, milestone] of list<Raw>(v.milestones).entries()) {
    if (!text(milestone?.label)) return `Milestone ${i + 1} needs a name.`;
    if (runMinutes(milestone?.time, start) === null) return `Milestone ${i + 1}: use a 24-hour time like 07:30.`;
  }
  if (list(v.spans).length === 0 && list(v.markers).length === 0) return 'Add at least one span or marker.';
  return true;
}
