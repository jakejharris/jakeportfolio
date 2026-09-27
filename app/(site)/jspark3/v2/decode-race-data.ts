import { GLM_COPY, GLM_RELEASE, METRICS, setCaption, streams, valueText, type GlmRelease } from '../release-copy';

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

export interface RaceStart {
  /** "current" for the release's own start, otherwise the set id, as in the serving-start table. */
  key: string;
  caption: string;
  label: string;
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

function start(key: string, caption: string, label: string, raceLanes: RaceLane[]): RaceStart {
  return { key, caption, label, measured: raceLanes.some(lane => lane.lo !== null), lanes: raceLanes };
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
      ? [start('current', setCaption({ ...headline, mode: 0 }), GLM_COPY.sets.thisRelease, lanes(own, row => (row.label === 'Decode' ? row.concurrency : undefined)))]
      : []),
    ...sets.map(set => start(set.id, setCaption(set), set.label, lanes(set.rows, cell => DECODE.get(cell.id)))),
  ].filter(entry => entry.lanes.length);
  const measured = starts.filter(entry => entry.measured);
  const values = measured.flatMap(entry => entry.lanes.flatMap(lane => [lane.lo, lane.hi])).filter((value): value is number => value !== null);
  const unit = own.find(row => row.label === 'Decode')?.unit ?? 'tok/s';
  return { starts, measured, initial: measured[0] ?? starts[0] ?? null, scaleEnd: values.length ? axisEnd(values) : null, unit };
}

/** The race for the page's own data. */
const RACE = buildRaceStarts(GLM_RELEASE);
export default RACE;
