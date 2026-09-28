import { GLM_RELEASE, METRICS, startsAndSweeps, streams, valueText, type GlmRelease } from '../release-copy';

/**
 * The decode race's data: the page's own serving starts, reduced to the decode rows the race draws.
 * It adds no numbers. Every lo, hi and text below is copied from glm-release.json as it is.
 */

/** One decode row of a start: a lane of the race, drawn as one strand per concurrent stream. */
export interface RaceLane {
  id: string;
  /** The stream count, parsed from the row's concurrency ("c8" is 8). */
  streams: number;
  /** The page's own words for it, "one stream" or "8 streams". */
  label: string;
  lo: number | null;
  hi: number | null;
  /** The row end, printed as the page prints a band: one value, or the two ends joined by an en dash. */
  band: string;
}

/** What a start ran, as the serving-start table captions it. */
export interface StartRun {
  build: string;
  mode: number;
  serving_starts: number;
  sweeps: number;
}

export interface RaceStart {
  /** "current" for the release's own start, otherwise the set id, as in the serving-start table. */
  key: string;
  /** The start's label from the data, never edited. */
  label: string;
  run: StartRun;
  /** True when at least one lane has a measured lo. */
  measured: boolean;
  lanes: RaceLane[];
}

export interface RaceData {
  /** Every start of the serving-start table except the earlier release, in the table's order. */
  starts: RaceStart[];
  /** The measured starts, the ones the race can run. */
  measured: RaceStart[];
  /** The start shown first: the first measured one, or the first start when none is measured. */
  initial: RaceStart | null;
  /** The full lane width in tok/s, one value for every start, or null when nothing is measured. */
  scaleEnd: number | null;
  unit: string;
}

/**
 * The same rule as axisEnd in HeadlineResults.tsx: a round end at or just above the largest value.
 * Kept as a copy so that file stays as it is.
 */
export function axisEnd(values: number[]) {
  const max = Math.max(...values, 1);
  const step = 10 ** Math.floor(Math.log10(max));
  return ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(m => m * step >= max) ?? 10) * step;
}

/** A band as Band.tsx prints it. A row that was not measured prints the page's own mark for that. */
export function bandText(lo: string | null, hi: string | null) {
  if (lo === null || hi === null) return valueText(null);
  return lo === hi ? valueText(lo) : `${valueText(lo)}–${valueText(hi)}`;
}

type Cell = { id: string; lo: number | null; hi: number | null; lo_text: string | null; hi_text: string | null };

const DECODE = new Map<string, string>(METRICS.filter(metric => metric.label === 'Decode').map(metric => [metric.id, metric.concurrency]));

/** The decode cells of a start, in data order, as lanes. */
function lanes<T extends Cell>(cells: T[], concurrency: (cell: T) => string | undefined): RaceLane[] {
  return cells.flatMap(cell => {
    const at = concurrency(cell);
    if (!at) return [];
    return [{
      id: cell.id,
      streams: Number(at.replace(/^c/, '')),
      label: streams(at),
      lo: cell.lo,
      hi: cell.hi,
      band: bandText(cell.lo_text, cell.hi_text),
    }];
  });
}

function start(key: string, label: string, { build, mode, serving_starts, sweeps }: StartRun, raceLanes: RaceLane[]): RaceStart {
  return { key, label, run: { build, mode, serving_starts, sweeps }, measured: raceLanes.some(lane => lane.lo !== null), lanes: raceLanes };
}

/**
 * The weights a start ran, in the serving-start table's words. It mirrors the words setCaption in
 * release-copy.ts writes, kept here so that file stays as it is; a test fails if the two drift apart.
 */
export function weightsText(mode: number) {
  return mode === 0 ? 'stock weights' : 'edited weights, opt-in';
}

/** True when `text` names `build` as a whole version, so "v1.7" is not found inside "v1.7.4". */
function names(text: string, build: string) {
  return new RegExp(`(?<![\\w.])${build.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\.?\\d)`).test(text);
}

/**
 * The figure caption for a start: its label as written, then the build and the weights in the serving-start
 * table's words where the label does not already say them, then its starts and sweeps. A build the label lacks
 * leads. "v1.7.4 base recipe, no decode levers · edited weights, opt-in · one serving start, two sweeps".
 */
export function raceCaption({ label, run }: Pick<RaceStart, 'label' | 'run'>) {
  const build = run.build;
  const weights = run.mode === 0 ? 'stock weights' : 'edited weights';
  return [
    ...(names(label, build) ? [] : [build]),
    label,
    ...(label.toLowerCase().includes(weights) ? [] : [weightsText(run.mode)]),
    startsAndSweeps(run),
  ].join(' · ');
}

/**
 * The starts the race can show, exactly the rows of ServingStarts.tsx in its order: the release's own start
 * (when its numbers include it), then every serving start in the data. The earlier release is left out, since it
 * has single figures rather than a start. One lane width covers every lo and hi of every start.
 */
export function buildRaceStarts(release: GlmRelease): RaceData {
  const { headline, sets } = release;
  const own = headline.missing ? [] : headline.rows;
  const starts: RaceStart[] = [
    ...(own.length
      ? [start('current', `${headline.build}, measured build`, { ...headline, mode: 0 }, lanes(own, row => (row.label === 'Decode' ? row.concurrency : undefined)))]
      : []),
    ...sets.map(set => start(set.id, set.label, set, lanes(set.rows, cell => DECODE.get(cell.id)))),
  ].filter(entry => entry.lanes.length);
  const measured = starts.filter(entry => entry.measured);
  const values = measured.flatMap(entry => entry.lanes.flatMap(lane => [lane.lo, lane.hi])).filter((value): value is number => value !== null);
  const unit = own.find(row => row.label === 'Decode')?.unit ?? 'tok/s';
  return { starts, measured, initial: measured[0] ?? starts[0] ?? null, scaleEnd: values.length ? axisEnd(values) : null, unit };
}

/** The race for the page's own data. */
const RACE = buildRaceStarts(GLM_RELEASE);
export default RACE;
