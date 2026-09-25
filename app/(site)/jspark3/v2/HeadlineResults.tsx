import React from 'react';
import { GLM_COPY, GLM_RELEASE, IS_PLACEHOLDER, SHOW_MIA, changeFromBaseline, comparisonValue, headlineValue, streams, type HeadlineRow } from '../release-copy';
import { Ph } from '../Placeholder';

const rows = GLM_RELEASE.headline.rows;
const decode = rows.filter(row => row.label === 'Decode');
const figures = rows.filter(row => row.label !== 'Decode');
const hasPerStream = rows.some(row => row.per_stream !== null);

type SeriesKey = 'value' | 'v1_1' | 'mia';
/** `name` labels the legend; `short` labels each bar. A Mia bar appears only on rows that carry her number. */
const SERIES: ReadonlyArray<{ key: SeriesKey; name: React.ReactNode; short: React.ReactNode; className: string }> = [
  { key: 'value', name: <Ph>{GLM_RELEASE.version}</Ph>, short: <Ph>{GLM_RELEASE.version}</Ph>, className: 'glm-series-now' },
  { key: 'v1_1', name: 'v1.1', short: 'v1.1', className: 'glm-series-v11' },
  ...(SHOW_MIA ? [{ key: 'mia' as const, name: GLM_COPY.mia.series, short: 'Mia', className: 'glm-series-mia' }] : []),
];

/** A round axis end at or just above the largest value, so bars are drawn to scale from zero. */
function axisEnd(values: number[]) {
  const max = Math.max(...values, 1);
  const step = 10 ** Math.floor(Math.log10(max));
  return ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(m => m * step >= max) ?? 10) * step;
}

function Change({ row }: { row: HeadlineRow }) {
  const change = changeFromBaseline(row);
  if (change) return <>{change}</>;
  return IS_PLACEHOLDER ? <Ph>+XX%</Ph> : <>n/a</>;
}

/** A single measurement shown as a large figure, with its v1.1 comparison. */
function Figure({ row }: { row: HeadlineRow }) {
  return <div className="glm-figure" data-metric-id={row.id}>
    <p className="glm-label">{row.label} · {streams(row.concurrency)}</p>
    <p className="glm-big"><Ph>{headlineValue(row.value)}</Ph> <small>{row.unit}</small></p>
    {row.v1_1 === null && !IS_PLACEHOLDER
      ? <p className="glm-vs">No v1.1 run on this benchmark.</p>
      : <p className="glm-vs">v1.1: <Ph>{comparisonValue(row.v1_1)}</Ph> {row.unit}<br />Change: <Change row={row} /></p>}
    {SHOW_MIA && row.mia !== null ? <p className="glm-vs">{GLM_COPY.mia.series}: {headlineValue(row.mia)} {row.unit}</p> : null}
  </div>;
}

/** Decode by concurrent streams: this release against v1.1 (and Mia where matched), to scale from zero. */
function DecodeChart() {
  const end = axisEnd(decode.flatMap(row => SERIES.map(series => row[series.key])).filter((value): value is number => value !== null));
  const unit = decode[0].unit;
  return <figure className="glm-chart" aria-labelledby="glm-chart-title">
    <p id="glm-chart-title" className="glm-label">Decode by concurrent streams · {unit}, all streams combined</p>
    <ul className="glm-legend">
      {SERIES.map(series => <li key={series.key} className={series.className}><i aria-hidden="true" />{series.name}</li>)}
      {IS_PLACEHOLDER ? <li><Ph>Placeholder bars, no data yet</Ph></li> : null}
    </ul>
    <div className="glm-groups">
      {decode.map(row => <div className="glm-group" key={row.id} data-metric-id={row.id} role="group" aria-label={`Decode, ${streams(row.concurrency)}`}>
        <p className="glm-group-label"><strong>{streams(row.concurrency)}</strong>{row.per_stream !== null ? <span>{headlineValue(row.per_stream)} {unit} per stream</span> : null}</p>
        {SERIES.filter(series => series.key !== 'mia' || row.mia !== null).map(series => {
          const value = row[series.key];
          const width = value === null ? (IS_PLACEHOLDER ? 62 : 0) : (value / end) * 100;
          return <div className={`glm-bar ${series.className}${IS_PLACEHOLDER ? ' glm-bar-placeholder' : ''}`} key={series.key}>
            <span className="glm-bar-name">{series.short}</span>
            <span className="glm-bar-track" aria-hidden="true"><i style={{ width: `${width}%` }} /></span>
            <span className="glm-bar-value"><Ph>{comparisonValue(value)}</Ph></span>
          </div>;
        })}
      </div>)}
    </div>
    <p className="glm-scale" aria-hidden="true"><span>0</span><span>{IS_PLACEHOLDER ? 'no scale yet' : `${end.toLocaleString('en-US')} ${unit}`}</span></p>
  </figure>;
}

/** Every headline row, for exact values and screen readers. */
function NumbersTable() {
  return <details className="glm-table">
    <summary>The numbers as a table</summary>
    <div className="glm-table-scroll">
      <table>
        <caption>Headline numbers, compared with our own v1.1. Decode above one stream is the aggregate across all streams.</caption>
        <thead><tr>
          <th scope="col">Measure</th>
          <th scope="col"><Ph>{GLM_RELEASE.version}</Ph></th>
          {hasPerStream ? <th scope="col">Per stream</th> : null}
          <th scope="col">v1.1</th>
          {SHOW_MIA ? <th scope="col">{GLM_COPY.mia.series}</th> : null}
          <th scope="col">Change</th>
        </tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}>
          <th scope="row">{row.label} <span>{row.concurrency}</span></th>
          <td><Ph>{headlineValue(row.value)}</Ph> <span>{row.unit}</span></td>
          {hasPerStream ? <td>{row.per_stream === null ? '' : headlineValue(row.per_stream)}</td> : null}
          <td><Ph>{comparisonValue(row.v1_1)}</Ph></td>
          {SHOW_MIA ? <td>{comparisonValue(row.mia)}</td> : null}
          <td><Change row={row} /></td>
        </tr>)}</tbody>
      </table>
    </div>
  </details>;
}

export default function HeadlineResults() {
  return <>
    <div className={`glm-resgrid${figures.length && decode.length ? '' : ' glm-resgrid-single'}`}>
      {figures.length ? <div className="glm-figures">{figures.map(row => <Figure key={row.id} row={row} />)}</div> : null}
      {decode.length ? <DecodeChart /> : null}
    </div>
    <NumbersTable />
  </>;
}
