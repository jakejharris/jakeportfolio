import React from 'react';
import { Bar, axisEnd, direction, type Series } from './FactsCharts';
import { amount } from '../glm-facts';
import { ANCHOR, CHARTS, DATE, LEAD, PLACEHOLDER, UNDER_LOAD, type RemeasuredBar, type RemeasuredChart } from './remeasured-data';

/** The section ships once the placeholders are replaced; until then it shows only in a local preview. */
export const remeasuredShown = (placeholder: boolean, preview: string | undefined) => !placeholder || preview === '1';

/** Each chart with only the bars the table marks PUBLISHABLE; a group or chart left with none is dropped. */
export function publishable(charts: RemeasuredChart[]): RemeasuredChart[] {
  return charts
    .map(chart => ({ ...chart, groups: chart.groups.map(group => ({ ...group, bars: group.bars.filter(bar => bar.screen === 'PUBLISHABLE') })).filter(group => group.bars.length) }))
    .filter(chart => chart.groups.length);
}

const date = new Date(`${DATE}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const series = (bar: RemeasuredBar): Series => ({ key: bar.name, name: bar.name, tone: bar.tone, cell: { state: PLACEHOLDER ? 'pending' : 'value', slot: { text: bar.value, pending: PLACEHOLDER } } });

/** A label as the table writes it, with its known-issue reference linked to the page's list. */
function SmallPrint({ text }: { text: string }) {
  return <>{text.split(/(known issue \d+)/).map((part, index) => (index % 2 ? <a key={index} href="#known-issues">{part}</a> : part))}</>;
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
        {group.note ? <p className="glm2-compare-note">{group.note}</p> : null}
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
  const figures = LEAD.flatMap(lead => {
    const chart = charts.find(item => item.id === lead.chart);
    const group = chart?.groups.find(item => item.key === lead.group);
    return chart && group ? [{ lead, chart, group }] : [];
  });
  if (!figures.length) return null;
  return <div className="glm2-lead">
    {figures.map(({ lead, chart, group }) => {
      const line = lead.line ?? group.condition;
      const smallPrint = group.smallPrint ?? chart.smallPrint;
      return <div key={lead.label} className="glm-figure" data-lead={`${chart.id}.${group.key}`}>
        <p className="glm-label">{lead.label}</p>
        <p className="glm-big glm-big-band"><span>{PLACEHOLDER ? <span className="jspark-ph">{lead.value}</span> : lead.value}</span> <small>{lead.unit}</small></p>
        {line ? <p className="glm-vs">{line}</p> : null}
        {smallPrint ? <p className="glm2-lead-print"><SmallPrint text={smallPrint} /></p> : null}
        {group.note ? <p className="glm2-lead-print">{group.note}</p> : null}
      </div>;
    })}
  </div>;
}

/**
 * The re-measurement of 2026-10-03, after the release's results and apart from them: one user first (reply
 * speed, long prompts, a long session coming back), then several requests at once under their own heading.
 */
export default function Remeasured() {
  const charts = publishable(CHARTS);
  if (!remeasuredShown(PLACEHOLDER, process.env.JSPARK3_REMEASURED_PREVIEW) || !charts.length) return null;
  const one = charts.filter(chart => !UNDER_LOAD.has(chart.id));
  const load = charts.filter(chart => UNDER_LOAD.has(chart.id));
  return <section className="glm-results glm2-remeasured" id={ANCHOR} aria-labelledby={`${ANCHOR}-title`}>
    <div className="glm-shell">
      <div className="glm-section-heading">
        <h2 id={`${ANCHOR}-title`}>Re-measured on {date}.</h2>
        <p className="glm-band-line">One request at a time first: how fast a reply streams, and how soon a long prompt gets an answer.</p>
        <p>Every figure is JSPARK3 v2.0.1 with base weights and the <a href="#draft-model">draft model</a>, on three DGX Sparks. Without the draft model, which is licensed for non-commercial use, these figures do not apply. These runs use their own measurements, so they sit apart from the release&apos;s figures above, which are unchanged. Each chart is drawn to its own scale from zero.</p>
      </div>
      <Lead charts={one} />
      {one.map(chart => <RemeasuredFigure key={chart.id} chart={chart} />)}
      {load.length ? <>
        <h3 className="glm2-subhead" id={`${ANCHOR}-load`}>Several requests at once</h3>
        <p className="glm2-remeasured-note">Requests started together share the Sparks, so each one streams slower than a request on its own. This is not the same test as the release&apos;s eight-at-once figure above.</p>
        {load.map(chart => <RemeasuredFigure key={chart.id} chart={chart} />)}
      </> : null}
    </div>
  </section>;
}
