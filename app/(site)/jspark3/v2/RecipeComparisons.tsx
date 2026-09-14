'use client';

import React, { useState } from 'react';
import data from '@/public/jspark3/tempo-comparisons.json';

type Recipe = 'tempo' | 'mia' | 'tony';
type Workload = 'code' | 'prose' | 'all';
const names: Record<Recipe, string> = { tempo: 'Tempo', mia: 'Mia', tony: 'Tony' };
const workloads: Record<Workload, string> = { code: 'Code', prose: 'Prose', all: '8-category mean' };

function RateBar({ recipe, value, max, basis }: { recipe: Recipe; value: number; max: number; basis: string }) {
  return <div className={`tempo-rate tempo-series-${recipe}`} data-recipe={recipe} data-value={value}>
    <div className="tempo-rate-label"><span><strong>{names[recipe]}</strong><small>{basis}</small></span><span className="tempo-rate-number">{value.toFixed(1)} <small>tok/s</small></span></div>
    <div className="tempo-rate-track" aria-hidden="true"><i style={{ transform: `scaleX(${value / max})` }} /></div>
  </div>;
}

function ScalingChart({ workload, concurrency }: { workload: Workload; concurrency: number }) {
  const recipes: Recipe[] = workload === 'all' ? ['tempo', 'mia', 'tony'] : ['tempo', 'mia'];
  const value = (index: number, recipe: Recipe) => {
    const row = data.short[index];
    return recipe === 'tony' ? row.all.tony : row[workload][recipe];
  };
  const max = workload === 'code' ? 200 : workload === 'prose' ? 100 : 150;
  const x = (index: number) => 12 + index * 470 / (data.short.length - 1);
  const y = (rate: number) => 208 - rate / max * 196;
  return <figure className="tempo-scaling" aria-label={`${workloads[workload]} throughput from one to four offered streams`}>
    <figcaption>How throughput scales <span>tok/s · higher is better</span></figcaption>
    <div className="tempo-scaling-plot">
      <div className="tempo-scaling-axis" aria-hidden="true"><span>{max}</span><span>{max / 2}</span><span>0</span></div>
      <svg viewBox="0 0 500 220" preserveAspectRatio="none" role="img" aria-label={`Tempo and Mia measured on our three Sparks${workload === 'all' ? '; Tony is an author-published reference' : ''}. Select a stream count below to read exact values.`}>
        {[0, max / 2, max].map(tick => <line key={tick} x1="12" x2="482" y1={y(tick)} y2={y(tick)} className="tempo-plot-grid" />)}
        <line x1={x(concurrency - 1)} x2={x(concurrency - 1)} y1="8" y2="212" className="tempo-plot-cursor" />
        {recipes.map(recipe => <g key={recipe} className={`tempo-series-${recipe}`}>
          <polyline points={data.short.map((_, i) => `${x(i)},${y(value(i, recipe))}`).join(' ')} fill="none" className="tempo-plot-line" vectorEffect="non-scaling-stroke" />
          {data.short.map((row, i) => <circle key={row.concurrency} cx={x(i)} cy={y(value(i, recipe))} r={row.concurrency === concurrency ? 6 : 3} className="tempo-plot-point" vectorEffect="non-scaling-stroke" />)}
        </g>)}
      </svg>
    </div>
    <div className="tempo-scaling-ticks" aria-hidden="true">{data.short.map(row => <span key={row.concurrency} className={row.concurrency === concurrency ? 'is-selected' : ''}>C{row.concurrency}</span>)}</div>
    <div className="tempo-plot-legend">{recipes.map(recipe => <span key={recipe} className={`tempo-series-${recipe}`}><i aria-hidden="true" />{names[recipe]}{recipe === 'tony' ? ' (published)' : ''}</span>)}</div>
  </figure>;
}

export function ShortScreenComparison() {
  const [workload, setWorkload] = useState<Workload>('code');
  const [concurrency, setConcurrency] = useState(4);
  const row = data.short[concurrency - 1];
  const values = row[workload];
  const max = workload === 'code' ? 200 : workload === 'prose' ? 100 : 150;
  return <article className="tempo-comparison" id="recipe-comparison" aria-labelledby="short-comparison-title">
    <div className="tempo-comparison-heading">
      <div><p className="tempo-comparison-eyebrow">Short speed screen</p><h3 id="short-comparison-title">Code, prose, and parallel streams.</h3></div>
      <p>Aggregate end-to-end output.<br />Measured on our three DGX Sparks.</p>
    </div>
    <fieldset className="tempo-choice" aria-describedby="short-screen-conditions"><legend>Workload</legend>
      {(Object.keys(workloads) as Workload[]).map(key => <label key={key}><input type="radio" name="comparison-workload" value={key} checked={workload === key} onChange={() => setWorkload(key)} /><span>{workloads[key]}</span></label>)}
    </fieldset>
    <div className="tempo-comparison-grid">
      <div className="tempo-selected-rates" aria-live="polite" aria-atomic="true">
        <p className="tempo-selected-caption">{workloads[workload]} · C{concurrency} · {concurrency} offered {concurrency === 1 ? 'stream' : 'streams'}</p>
        <RateBar recipe="tempo" value={values.tempo} max={max} basis="Our measurement" />
        <RateBar recipe="mia" value={values.mia} max={max} basis="Our measurement" />
        {workload === 'all' && <RateBar recipe="tony" value={row.all.tony} max={max} basis="Author-published reference" />}
        <p className="tempo-comparison-delta"><strong>{(values.tempo / values.mia).toFixed(2)}×</strong> Mia’s measured {workload === 'all' ? 'eight-category mean' : `${workload} throughput`} in this cell.</p>
      </div>
      <ScalingChart workload={workload} concurrency={concurrency} />
    </div>
    <fieldset className="tempo-choice tempo-concurrency"><legend>Offered streams <span>C = concurrent requests submitted together</span></legend>
      {data.short.map(item => <label key={item.concurrency}><input type="radio" name="comparison-concurrency" value={item.concurrency} checked={concurrency === item.concurrency} onChange={() => setConcurrency(item.concurrency)} /><span>C{item.concurrency}</span></label>)}
    </fieldset>
    <div className="tempo-comparison-conditions" id="short-screen-conditions">
      <p><strong>Same short screen, different recipes.</strong> Completion tokens across all streams ÷ shared HTTP wall time, including initial wait. One wave per category and concurrency, 150–256-token caps. These fixtures measure speed, not answer quality.</p>
      <p><strong>Comparisons stop at 4 offered streams, within Mia’s active-request cap.</strong> Tempo allows 8 active requests. These are recipe-level comparisons, not an isolated kernel or quantization test.</p>
      <p className="tempo-reference-note">{workload === 'all' ? 'The eight-category mean excludes counting. Tony’s TP3 figures are author-published on his three Sparks, not a rerun on ours. Hardware state and recipe settings differ.' : 'Tony’s published aggregate reference is available in “8-category mean”. It is separate from the code and prose measurements shown here.'}</p>
      <p className="tempo-comparison-sources"><a href="https://github.com/MiaAI-Lab/DeepSeek-v4.1-Flash-DGX-Sparks">Mia’s recipe ↗</a><a href="https://github.com/tonyd2wild/DeepSeek-V4.1-Flash-vLLM-DGX-Spark">Tony’s recipe ↗</a><a href="/jspark3/tempo-comparison-methods.html">Measurement notes ↗</a></p>
    </div>
    <details className="tempo-comparison-table"><summary>C1–C4 values and sources</summary>
      <div className="tempo-table-scroll" tabIndex={0} role="region" aria-label="Short-screen data table">
        <table><caption>Aggregate end-to-end tok/s. Tempo and Mia measured locally; Tony author-published, eight-category mean only.</caption><thead><tr><th scope="col">Streams</th><th scope="col">Tempo code</th><th scope="col">Mia code</th><th scope="col">Tempo prose</th><th scope="col">Mia prose</th><th scope="col">Tempo mean</th><th scope="col">Mia mean</th><th scope="col">Tony mean*</th></tr></thead><tbody>
          {data.short.map(item => <tr key={item.concurrency}><th scope="row">C{item.concurrency}</th>{[item.code.tempo, item.code.mia, item.prose.tempo, item.prose.mia, item.all.tempo, item.all.mia, item.all.tony].map((value, index) => <td key={index}>{value.toFixed(2)}</td>)}</tr>)}
        </tbody></table>
      </div>
      <p>*Author-published reference. <a href="/jspark3/tempo-comparisons.json">Chart data and source hashes ↗</a> · <a href="/jspark3/l5-benchmarks.html">Full methods and historical results ↗</a></p>
    </details>
  </article>;
}

export function WorkComparison() {
  const [round, setRound] = useState('repeat');
  const row = data.work.find(item => item.round === round)!;
  return <article className="tempo-chart tempo-work-comparison" aria-labelledby="work-comparison-title">
    <p className="tempo-comparison-eyebrow">Longer agent work</p>
    <h3 id="work-comparison-title">Three agents, three recipes.</h3>
    <p className="tempo-chart-subtitle">Three-minute tasks, measured on our fleet at C3.</p>
    <div className="tempo-work-controls">
      <fieldset className="tempo-choice"><legend>Round</legend>{['first', 'repeat'].map(value => <label key={value}><input type="radio" name="work-comparison-round" checked={round === value} onChange={() => setRound(value)} /><span>{value === 'first' ? 'First' : 'Repeat'}</span></label>)}</fieldset>
    </div>
    <div aria-live="polite" aria-atomic="true" className="tempo-work-rates">
      <p className="tempo-selected-caption">C3 · {round === 'first' ? 'First' : 'Repeat'} round · aggregate tok/s</p>
      <RateBar recipe="tempo" value={row.tempo} max={100} basis="Our measurement" />
      <RateBar recipe="tony" value={row.tony} max={100} basis="Locally adapted recipe" />
      <RateBar recipe="mia" value={row.mia} max={100} basis="Counted local rerun" />
    </div>
    <p className="tempo-condition">Accepted backend tokens ÷ 180 seconds, including unfinished output, health probes, and small launch/drain overhead. Same initial tasks; later tool histories diverge. Repeat uses fresh Pi sessions with caches intact.</p>
    <p className="tempo-condition">One cohort, no output-quality score or productivity claim. Three agents stay within every recipe’s active-request cap. Tony’s local run includes fabric, storage, loader, and allocator adaptations; it is separate from his published short-screen figures.</p>
    <a className="tempo-work-source" href="/jspark3/l5-benchmarks.html#work">All Work rounds and methods ↗</a>
  </article>;
}
