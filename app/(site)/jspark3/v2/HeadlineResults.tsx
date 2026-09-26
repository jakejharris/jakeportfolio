import React from 'react';
import Band from './Band';
import { GLM_COPY, HEADLINE_ROWS, IS_PLACEHOLDER, RELEASE, SHOW_MIA, streams, valueText, type HeadlineRow } from '../release-copy';
import { Ph } from '../Placeholder';

const decode = HEADLINE_ROWS.filter(row => row.label === 'Decode');
const figures = HEADLINE_ROWS.filter(row => row.label !== 'Decode');

type SeriesKey = 'now' | 'v1_1' | 'mia';
/** Each series' band on a row: this release's measured range, or a single earlier figure. The numbers size the bars. */
const band = (row: HeadlineRow, key: SeriesKey): [number | null, number | null] =>
  key === 'now' ? [row.lo, row.hi] : [row[key], row[key]];
/** The same band as the release files write it, for printing. */
function bandText(row: HeadlineRow, key: SeriesKey): [string | null, string | null] {
  if (key === 'now') return [row.lo_text, row.hi_text];
  const text = key === 'v1_1' ? row.v1_1_text : row.mia === null ? null : String(row.mia);
  return [text, text];
}

/** `name` labels the legend; `short` labels each bar. A Mia bar appears only on rows that carry her number. */
const SERIES: ReadonlyArray<{ key: SeriesKey; name: React.ReactNode; short: React.ReactNode; className: string }> = [
  { key: 'now', name: <Ph>{RELEASE}</Ph>, short: <Ph>{RELEASE}</Ph>, className: 'glm-series-now' },
  ...(IS_PLACEHOLDER || decode.some(row => row.v1_1 !== null) ? [{ key: 'v1_1' as const, name: 'v1.1', short: 'v1.1', className: 'glm-series-v11' }] : []),
  ...(SHOW_MIA && decode.some(row => row.mia !== null) ? [{ key: 'mia' as const, name: GLM_COPY.mia.series, short: 'Mia', className: 'glm-series-mia' }] : []),
];

/** A round axis end at or just above the largest value, so bars are drawn to scale from zero. */
function axisEnd(values: number[]) {
  const max = Math.max(...values, 1);
  const step = 10 ** Math.floor(Math.log10(max));
  return ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(m => m * step >= max) ?? 10) * step;
}

/**
 * A single figure shown large as its band, with the v1.1 figure beside it. Nothing is derived from the two.
 * A figure the release's numbers leave out shows n/a, and no v1.1 figure stands in for it.
 */
function Figure({ row }: { row: HeadlineRow }) {
  const omitted = !IS_PLACEHOLDER && row.lo_text === null;
  return <div className="glm-figure" data-metric-id={row.id} data-omitted={omitted || undefined}>
    <p className="glm-label">{row.label} · {streams(row.concurrency)}</p>
    <p className="glm-big glm-big-band"><span><Band lo={row.lo_text} hi={row.hi_text} /></span>{omitted ? null : <> <small>{row.unit}</small></>}</p>
    {omitted
      ? <p className="glm-vs">{GLM_COPY.figureOmitted}</p>
      : row.v1_1 === null && !IS_PLACEHOLDER
        ? <p className="glm-vs">No v1.1 run on this benchmark.</p>
        : <p className="glm-vs">v1.1: <Ph>{valueText(row.v1_1_text)}</Ph> {row.unit}</p>}
    {SHOW_MIA && row.mia !== null ? <p className="glm-vs">{GLM_COPY.mia.series}: {valueText(String(row.mia))} {row.unit}</p> : null}
  </div>;
}

/**
 * Decode by concurrent streams, to scale from zero. This release's bar is solid to the low
 * end of its band and lighter from there to the high end; earlier figures are single values.
 */
function DecodeChart() {
  const end = axisEnd(decode.flatMap(row => SERIES.flatMap(series => band(row, series.key))).filter((value): value is number => value !== null));
  const unit = decode[0].unit;
  const percent = (value: number) => (value / end) * 100;
  return <figure className="glm-chart" aria-labelledby="glm-chart-title">
    <p id="glm-chart-title" className="glm-label">Decode by concurrent streams · {unit}, all streams combined</p>
    <ul className="glm-legend">
      {SERIES.map(series => <li key={series.key} className={series.className}><i aria-hidden="true" />{series.name}</li>)}
      <li className="glm-series-now glm-legend-band"><i aria-hidden="true" />{GLM_COPY.bandKey}</li>
      {IS_PLACEHOLDER ? <li><Ph>Placeholder bars, no data yet</Ph></li> : null}
    </ul>
    <div className="glm-groups">
      {decode.map(row => <div className="glm-group" key={row.id} data-metric-id={row.id} role="group" aria-label={`Decode, ${streams(row.concurrency)}`}>
        <p className="glm-group-label"><strong>{streams(row.concurrency)}</strong></p>
        {SERIES.filter(series => series.key !== 'mia' || row.mia !== null).map(series => {
          const [lo, hi] = band(row, series.key);
          const [loText, hiText] = bandText(row, series.key);
          const solid = lo === null ? (IS_PLACEHOLDER ? 56 : 0) : percent(lo);
          const light = lo === null || hi === null ? (IS_PLACEHOLDER && series.key === 'now' ? 6 : 0) : percent(hi) - solid;
          return <div className={`glm-bar ${series.className}${IS_PLACEHOLDER ? ' glm-bar-placeholder' : ''}`} key={series.key}>
            <span className="glm-bar-name">{series.short}</span>
            {/* A figure that was not measured draws no bar at all, not a stub that reads as a small value. */}
            <span className="glm-bar-track" aria-hidden="true">{solid > 0 ? <i style={{ width: `${solid}%` }} /> : null}{light > 0 ? <b style={{ left: `${solid}%`, width: `${light}%` }} /> : null}</span>
            <span className="glm-bar-value"><Band lo={loText} hi={hiText} /></span>
          </div>;
        })}
      </div>)}
    </div>
    <p className="glm-scale" aria-hidden="true"><span>0</span><span>{IS_PLACEHOLDER ? 'no scale yet' : `${end.toLocaleString('en-US')} ${unit}`}</span></p>
  </figure>;
}

/** The release's own figures: prefill large, decode as a chart. Every start, this one included, is in the table below. */
export default function HeadlineResults() {
  if (!HEADLINE_ROWS.length) return null;
  return <div className={`glm-resgrid${figures.length && decode.length ? '' : ' glm-resgrid-single'}`}>
    {figures.length ? <div className="glm-figures">{figures.map(row => <Figure key={row.id} row={row} />)}</div> : null}
    {decode.length ? <DecodeChart /> : null}
  </div>;
}
