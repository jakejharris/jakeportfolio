import React from 'react';
import { Bar, axisEnd, direction, type Series } from './FactsCharts';
import { amount } from '../glm-facts';
import { ANCHOR, CHARTS, LEAD, PLACEHOLDER, type RemeasuredBar, type RemeasuredChart } from './remeasured-data';
import { REMEASURED_ON, publishable, resolve } from './remeasured-figures';

const series = (bar: RemeasuredBar): Series => ({ key: bar.name, name: bar.name, tone: bar.tone, cell: { state: PLACEHOLDER ? 'pending' : 'value', slot: { text: bar.value, pending: PLACEHOLDER } } });

/** A label as the table writes it, with its known-issue reference linked to that issue in the page's list. */
function SmallPrint({ text }: { text: string }) {
  return <>{text.split(/(known issue \d+)/).map((part, index) => (index % 2 ? <a key={index} href={`#known-issue-${part.split(' ').at(-1)}`}>{part}</a> : part))}</>;
}

/** One chart: one measurement, its groups on one scale from zero, each figure with its label, then how it was measured. */
function RemeasuredFigure({ chart }: { chart: RemeasuredChart }) {
  const id = `${ANCHOR}-${chart.id}`;
  const end = axisEnd(chart.groups.flatMap(group => group.bars.map(bar => amount(bar.value))));
  return <figure className="glm-chart glm2-chart" id={id} aria-labelledby={`${id}-title`} data-ruler={chart.ruler}>
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
  </figure>;
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

/**
 * The prompt lengths the long-prompt chart measures. The set charts leave these out, so each length shows one
 * figure, from the pinned table.
 */
export const COVERED_CONTEXTS: string[] = REMEASURED_ON ? publishable(CHARTS).find(chart => chart.id === 'long-prompt')?.groups.map(group => group.key) ?? [] : [];

/**
 * The figures of 2026-10-03 at the head of the page's results: what one user feels first, large, then one chart
 * per measurement, two to a row: reply speed, the wait for the first token after a long prompt, what the disk
 * cache saves on a long session, and one prose figure beside v1.8.0's.
 */
export default function Remeasured() {
  const charts = publishable(CHARTS);
  if (!REMEASURED_ON || !charts.length) return null;
  return <div className="glm2-remeasured" id={ANCHOR}>
    <Lead charts={charts} />
    <div className="glm2-pair">{charts.map(chart => <RemeasuredFigure key={chart.id} chart={chart} />)}</div>
  </div>;
}
