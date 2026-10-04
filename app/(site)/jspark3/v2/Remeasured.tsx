import React from 'react';
import { Bar, Legend, axisEnd, direction, type Series } from './FactsCharts';
import { SETS, amount, type Cell, type ResultSet } from '../glm-facts';
import { ANCHOR, CHARTS, DATE, LEAD, MEASURED_SET, PLACEHOLDER, SET_CHARTS, type RemeasuredBar, type RemeasuredChart, type SetRow } from './remeasured-data';
import { REMEASURED_DATE, REMEASURED_ON, publishable, resolve } from './remeasured-figures';

const series = (bar: RemeasuredBar): Series => ({ key: bar.name, name: bar.name, tone: bar.tone, cell: { state: PLACEHOLDER ? 'pending' : 'value', slot: { text: bar.value, pending: PLACEHOLDER } } });

/** A label as the table writes it, with its known-issue reference linked to that issue in the page's list. */
function SmallPrint({ text }: { text: string }) {
  return <>{text.split(/(known issue \d+)/).map((part, index) => (index % 2 ? <a key={index} href={`#known-issue-${part.split(' ').at(-1)}`}>{part}</a> : part))}</>;
}

/**
 * One chart: one measurement, its groups on one scale from zero, each figure with its label, then how it was
 * measured. A chart that stands apart from the ones before it comes under its own subhead.
 */
function RemeasuredFigure({ chart }: { chart: RemeasuredChart }) {
  const id = `${ANCHOR}-${chart.id}`;
  const end = axisEnd(chart.groups.flatMap(group => group.bars.map(bar => amount(bar.value))));
  return <>{chart.heading ? <h3 className="glm2-subhead" id={`${id}-heading`}>{chart.heading}</h3> : null}<figure className="glm-chart glm2-chart" id={id} aria-labelledby={`${id}-title`} data-ruler={chart.ruler}>
    <p id={`${id}-title`} className="glm-label">{chart.title} · {chart.unit}, {direction(chart.better)}</p>
    {chart.smallPrint ? <p className="glm2-compare-scope"><SmallPrint text={chart.smallPrint} /></p> : null}
    <div className="glm-groups">
      {chart.groups.map(group => <div className="glm-group" key={group.key} role="group" aria-label={group.label}>
        <p className="glm-group-label"><strong>{group.label}</strong>{group.condition ? <span>{group.condition}</span> : null}</p>
        {group.bars.map(bar => <Bar key={bar.name} series={series(bar)} end={end} unit={chart.unit} />)}
        {group.smallPrint ? <p className="glm2-compare-note"><SmallPrint text={group.smallPrint} /></p> : null}
        {group.notes?.map(note => <p key={note} className="glm2-compare-note">{note}</p>)}
      </div>)}
    </div>
    <p className="glm2-chart-methods">{chart.methods}</p>
  </figure></>;
}

/**
 * The figures one user feels first, large. A lead shows only while its group is shown, and carries the group's
 * condition (or its own line), its label and its footnote.
 */
function Lead({ charts }: { charts: RemeasuredChart[] }) {
  const figures = resolve(LEAD, charts);
  if (!figures.length) return null;
  return <div className="glm2-lead">
    {figures.map(({ figure: lead, chart, group, line, notes, smallPrint }) => {
      return <div key={lead.label} className="glm-figure" data-lead={`${chart.id}.${group.key}`}>
        <p className="glm-label">{lead.label}</p>
        <p className="glm-big glm-big-band"><span>{PLACEHOLDER ? <span className="jspark-ph">{lead.value}</span> : lead.value}</span> <small>{lead.unit}</small></p>
        {line ? <p className="glm-vs">{line}</p> : null}
        {smallPrint ? <p className="glm2-lead-print"><SmallPrint text={smallPrint} /></p> : null}
        {notes?.map(note => <p key={note} className="glm2-lead-print">{note}</p>)}
      </div>;
    })}
  </div>;
}

const NOT_YET: Cell = { state: 'absent', slot: { text: 'Not yet re-measured', pending: false } };

/** A row's cell for one result set: the band's figure for the set the table measured, else one dropped in for that set. */
function setCell(row: SetRow, set: ResultSet, charts: RemeasuredChart[]): Cell {
  const own = set.id === MEASURED_SET
    ? charts.find(chart => chart.id === row.from.chart)?.groups.find(group => group.key === row.from.group)?.bars.find(bar => bar.name === row.from.bar)
    : row.sets?.[set.id];
  return own?.screen === 'PUBLISHABLE' ? { state: PLACEHOLDER ? 'pending' : 'value', slot: { text: own.value, pending: PLACEHOLDER } } : NOT_YET;
}

/**
 * Tonight's figures as rows of "Every measured v2.0.1 set": one bar per set, each row dated and carrying the
 * table's label. A set not yet re-measured says so, and a row with nothing to draw is left out.
 */
export function RemeasuredSetChart({ id }: { id: string }) {
  const data = SET_CHARTS.find(item => item.id === id);
  const charts = publishable(CHARTS);
  if (!REMEASURED_ON || !data) return null;
  const rows = data.rows.map(row => {
    const chart = charts.find(item => item.id === row.from.chart);
    const group = chart?.groups.find(item => item.key === row.from.group);
    return { row, cells: SETS.map(set => ({ set, cell: setCell(row, set, charts) })), smallPrint: group?.smallPrint ?? chart?.smallPrint };
  }).filter(item => item.cells.some(({ cell }) => cell.state !== 'absent'));
  if (!rows.length) return null;
  const figure = `${ANCHOR}-${data.id}`;
  const end = axisEnd(rows.flatMap(item => item.cells.map(({ cell }) => (cell.state === 'value' ? amount(cell.slot.text) : null))));
  return <figure className="glm-chart glm2-chart glm2-set-rows" id={figure} aria-labelledby={`${figure}-title`} data-ruler={data.ruler}>
    <p id={`${figure}-title`} className="glm-label">{data.title} · {data.unit}, {direction(data.better)}</p>
    <Legend sets={SETS} />
    <div className="glm-groups">
      {rows.map(({ row, cells, smallPrint }) => <div className="glm-group" key={row.key} role="group" aria-label={row.label}>
        <p className="glm-group-label"><strong>{row.label}</strong><span>measured {DATE}</span></p>
        {cells.map(({ set, cell }) => <Bar key={set.id} series={{ key: set.id, name: set.short, tone: set.tone, cell }} end={end} unit={data.unit} />)}
        {smallPrint ? <p className="glm2-compare-note"><SmallPrint text={smallPrint} /></p> : null}
      </div>)}
    </div>
    <p className="glm2-chart-methods">{data.methods}</p>
  </figure>;
}

/**
 * The re-measurement of 2026-10-03, right under the hero and apart from the release's results below it: what
 * one user feels (reply speed, the wait for the first token after a long prompt), what the disk cache saves on
 * a long session, then one prose figure beside v1.8.0's.
 */
export default function Remeasured() {
  const charts = publishable(CHARTS);
  if (!REMEASURED_ON || !charts.length) return null;
  return <section className="glm-results glm2-remeasured" id={ANCHOR} aria-labelledby={`${ANCHOR}-title`}>
    <div className="glm-shell">
      <div className="glm-section-heading">
        <h2 id={`${ANCHOR}-title`}>v2.0.1 measured on {REMEASURED_DATE}.</h2>
        <p className="glm-band-line">One request at a time: how fast a reply streams, how soon a long prompt gets an answer, and what the disk cache saves on a long session.</p>
        <p>Every figure is JSPARK3 v2.0.1 with base weights and the <a href="#draft-model">draft model</a>, on three DGX Sparks. Without the draft model, which is licensed for non-commercial use, these figures do not apply. These runs use their own measurements, so they sit apart from the release&apos;s figures below, which are unchanged. Each chart is drawn to its own scale from zero.</p>
      </div>
      <Lead charts={charts} />
      {charts.map(chart => <RemeasuredFigure key={chart.id} chart={chart} />)}
    </div>
  </section>;
}
