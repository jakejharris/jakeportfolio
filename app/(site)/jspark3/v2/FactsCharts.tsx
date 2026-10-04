import React from 'react';
import { COMPARE_SETS, CONTEXTS, DECODE_CELLS, FIRST_TOKEN_ESTIMATORS, PARTNERS, RELBENCH_LABEL, RIGMARK_BLOCKS, RIGMARK_SCOPE, SETS, STREAMS, VERSION, amount, cell, metricInfo, partner, tileCaption, type Cell, type ResultSet } from '../glm-facts';
import { Fact } from './Fact';
import { COMPARE_ROWS } from './remeasured-figures';

/** A round axis end at or just above the largest value, so bars are drawn to scale from zero. */
export function axisEnd(values: Array<number | null>) {
  const max = Math.max(...values.filter((value): value is number => value !== null), 0);
  if (max <= 0) return null;
  const step = 10 ** Math.floor(Math.log10(max));
  return ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(m => m * step >= max) ?? 10) * step;
}

/** Series colors: the earlier release grey, the default set the release gold, the other weights slate, no draft model green-grey. */
const TONE = { before: 'glm2-series-before', default: 'glm2-series-default', other: 'glm2-series-other', plain: 'glm2-series-plain' } as const;
export type Series = { key: string; name: string; tone: keyof typeof TONE; cell: Cell };

export const direction = (better: 'higher' | 'lower' | null) => (better === 'lower' ? 'lower is better' : better === 'higher' ? 'higher is better' : null);
/** The benchmark's short reasoning label after a caption, when the release labels its figures. */
export const Relbench = () => (RELBENCH_LABEL ? <> · <Fact slot={RELBENCH_LABEL.short} /></> : null);
/** The full label, once beneath the release's own figures. */
export const RelbenchNote = () => (RELBENCH_LABEL ? <p className="glm2-relbench-label" data-relbench-label="full"><Fact slot={RELBENCH_LABEL.full} /></p> : null);

/**
 * One bar: a measured value to scale; a hatched stand-in while the value is pending, so it never reads
 * as a small value; and no bar at all for a cell the set did not measure.
 */
export function Bar({ series, end, unit }: { series: Series; end: number | null; unit: string }) {
  const { state, slot } = series.cell;
  const value = state === 'value' ? amount(slot.text) : null;
  const width = value !== null && end ? (value / end) * 100 : null;
  return <div className={`glm-bar ${TONE[series.tone]}${state === 'pending' ? ' glm-bar-placeholder' : ''}`} data-state={state}>
    <span className="glm-bar-name">{series.name}</span>
    <span className="glm-bar-track" aria-hidden="true">{width !== null ? <i style={{ width: `${width}%` }} /> : state === 'pending' ? <i style={{ width: '48%' }} /> : null}</span>
    <span className="glm-bar-value">{state === 'pending' ? <span className="jspark-ph">{slot.text}</span> : state === 'absent' ? <small>{slot.text}</small> : <>{slot.text}<small> {unit}</small></>}</span>
  </div>;
}

/** Beside v1.8.4, each set names this release, so no bar reads as the earlier release's. */
export function Legend({ sets, before = false }: { sets: ResultSet[]; before?: boolean }) {
  return <ul className="glm-legend">
    {before ? <li className={TONE.before}><i aria-hidden="true" />v1.8.4 on vLLM, the baseline</li> : null}
    {sets.map(set => <li key={set.id} className={TONE[set.tone]}><i aria-hidden="true" />{before ? <><Fact slot={VERSION} />, </> : null}<Fact slot={set.label} /></li>)}
  </ul>;
}

/**
 * RigMark with the v1.8.4 protocol: each figure with v1.8.4 first, then each set RigMark ran on.
 * Every group is drawn to its own scale from zero. Nothing is derived here: the only percentage is a row
 * note the release wrote. A row the audit captioned (four at once) carries its caption, which says what each
 * side's prompts were. The scope line and the row notes travel with the figure wherever it is shown.
 */
export function CompareFigure() {
  return <figure className="glm-chart glm2-chart glm2-compare" aria-labelledby="glm2-compare-title">
    <p id="glm2-compare-title" className="glm-label">RigMark, the same protocol on v1.8.4 and <Fact slot={VERSION} /> · each figure drawn to its own scale from zero</p>
    <p className="glm2-compare-scope"><Fact slot={RIGMARK_SCOPE} /></p>
    <Legend sets={COMPARE_SETS} before />
    <div className="glm2-compare-grid">
      {COMPARE_ROWS.map(row => {
        const series: Series[] = [
          { key: 'v1_8_4', name: 'v1.8.4', tone: 'before', cell: { state: row.before.pending ? 'pending' : 'value', slot: row.before } },
          ...COMPARE_SETS.map(set => ({ key: set.id, name: `${VERSION.text} ${set.short}`, tone: set.tone, cell: row.values[set.id] })),
        ];
        const end = axisEnd(series.map(item => (item.cell.state === 'value' ? amount(item.cell.slot.text) : null)));
        return <div className="glm-group" key={row.id} role="group" aria-label={row.label} data-metric-id={row.id}>
          <p className="glm-group-label"><strong>{row.label}</strong><span>{row.unit}{direction(row.better) ? `, ${direction(row.better)}` : ''}</span></p>
          {series.map(item => <Bar key={item.key} series={item} end={end} unit={row.unit} />)}
          {row.note ? <p className="glm2-compare-note"><Fact slot={row.note} /></p> : null}
        </div>;
      })}
    </div>
  </figure>;
}

/** RigMark's own headline blocks, as it prints them, for anyone who wants the source of the bars. */
export function RigmarkBlocks() {
  return <details className="glm-history-results glm2-rigmark">
    <summary>RigMark output, as RigMark reports it</summary>
    <div className="glm2-rigmark-blocks">
      {RIGMARK_BLOCKS.map(block => <figure key={block.id} className="glm2-rigmark-block">
        <figcaption>{block.id === 'v1_8_4' ? null : <><Fact slot={VERSION} />, </>}<Fact slot={block.title} /></figcaption>
        {block.text.pending ? <p><Fact slot={block.text} /></p> : <pre>{block.text.text}</pre>}
      </figure>)}
    </div>
  </details>;
}

/**
 * A group's bars: one per set. v1.8.4 appears beside this release only in RigMark's comparison with v1.8.4,
 * so no other chart draws it.
 */
const groupSeries = (metric: string): Series[] => SETS.map(set => ({ key: set.id, name: set.short, tone: set.tone, cell: cell(set, metric) }));

/** One group per row, one bar per measured set, all groups on one scale. A concurrency group names its condition and N. */
function SetChart({ id, title, groups, unit, better }: { id: string; title: string; groups: Array<{ key: string; label: string; metric: string }>; unit: string; better: 'higher' | 'lower' }) {
  const series = groups.map(group => groupSeries(group.metric));
  const conditions = groups.map(group => tileCaption(group.metric));
  const end = axisEnd(series.flat().map(item => (item.cell.state === 'value' ? amount(item.cell.slot.text) : null)));
  return <figure className="glm-chart glm2-chart" aria-labelledby={`${id}-title`}>
    <p id={`${id}-title`} className="glm-label">{title} · {unit}, {direction(better)}<Relbench /></p>
    <Legend sets={SETS} />
    <div className="glm-groups">
      {groups.map((group, index) => <div className="glm-group" key={group.key} role="group" aria-label={group.label} data-metric-id={group.metric}>
        <p className="glm-group-label"><strong>{group.label}</strong>{conditions[index] ? <span data-condition-of={group.metric}><Fact slot={conditions[index]} /></span> : null}</p>
        {series[index].map(item => <Bar key={item.key} series={item} end={end} unit={unit} />)}
      </div>)}
    </div>
    <p className="glm-scale glm2-scale" aria-hidden="true"><span>0</span><span>{end === null ? 'scale follows the numbers' : `${end.toLocaleString('en-US')} ${unit}`}</span></p>
  </figure>;
}

export function ColdStartChart() {
  return <SetChart id="glm2-cold" title="Time to first token on a cold prompt, by prompt length" unit="s" better="lower"
    groups={CONTEXTS.map(context => ({ key: context, label: `${context} tokens`, metric: `cold_ttft_s.${context}` }))} />;
}

/** Group names for single-request decode cells. */
const DECODE_GROUPS: Record<string, string> = {
  'decode_short_tok_s': 'Short reply',
  'decode_short_tok_s.code': 'Short code reply',
  'decode_short_tok_s.prose': 'Short prose reply',
  'decode_long_tok_s': 'Code after a 32k prompt',
};

export function DecodeChart() {
  return <SetChart id="glm2-decode" title="Decode speed, one request at a time" unit="tok/s" better="higher"
    groups={DECODE_CELLS.map(metric => ({ key: metric, label: DECODE_GROUPS[metric] ?? metricInfo(metric).label, metric }))} />;
}

export function ConcurrencyChart() {
  return <SetChart id="glm2-streams" title="Decode with requests running at once, all streams combined" unit="tok/s" better="higher"
    groups={STREAMS.map(streams => { const count = Number(streams.slice(1)); return { key: streams, label: count === 1 ? 'One request' : `${count} requests`, metric: `concurrency_aggregate_tok_s.${streams}` }; })} />;
}

/** A cell with its unit, as a line of text. */
function Value({ c, unit }: { c: Cell; unit: string }) {
  return <><Fact slot={c.slot} />{c.state === 'absent' || !unit ? null : ` ${unit}`}</>;
}

/**
 * A single figure, large for the default set, with every other set's figure beneath it. worst adds
 * each set's worst run beside its figure; v1.8.4 follows when the facts measured it the same way.
 * A concurrency figure names its condition under its label.
 */
export function SetFigure({ metric, worst }: { metric: string; worst?: string }) {
  const info = metricInfo(metric);
  const condition = tileCaption(metric);
  const [first, ...rest] = SETS;
  const lead = cell(first, metric);
  const worstOf = (set: ResultSet | undefined) => {
    const c = worst ? cell(set, worst) : null;
    return c && c.state !== 'absent' && cell(set, metric).state !== 'absent' ? <>, worst <Value c={c} unit={info.unit} /></> : null;
  };
  // A figure with a partner sentence is never shown without it: directly beneath that set's line.
  const partnerOf = (set: ResultSet | undefined) => {
    const sentence = partner(set, metric);
    return sentence ? <p className="glm-vs glm2-partner" data-partner-of={set?.id}><Fact slot={sentence} /></p> : null;
  };
  return <div className="glm-figure" data-metric-id={metric}>
    <p className="glm-label">{info.label}{info.better ? ` · ${direction(info.better)}` : ''}<Relbench /></p>
    {condition ? <p className="glm2-condition" data-condition-of={metric}><Fact slot={condition} /></p> : null}
    <p className="glm-big glm-big-band"><span><Fact slot={lead.slot} /></span>{lead.state === 'absent' || !info.unit ? null : <> <small>{info.unit}</small></>}</p>
    <p className="glm-vs" data-set={first?.id}>{first ? <Fact slot={first.label} /> : null}{worstOf(first)}</p>
    {partnerOf(first)}
    {rest.map(set => <React.Fragment key={set.id}>
      <p className="glm-vs" data-set={set.id}><Fact slot={set.label} />: <Value c={cell(set, metric)} unit={info.unit} />{worstOf(set)}</p>
      {partnerOf(set)}
    </React.Fragment>)}
    {Object.hasOwn(PARTNERS, metric) && FIRST_TOKEN_ESTIMATORS ? <p className="glm-vs glm2-partner-note"><Fact slot={FIRST_TOKEN_ESTIMATORS} /></p> : null}
  </div>;
}

