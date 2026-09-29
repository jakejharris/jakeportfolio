import React from 'react';
import { V2Release } from '../glm-v2';

const SECTIONS = [
  ['admission', 'Request admission'], ['revisit', 'Kept conversations and chat switching'],
  ['effort', 'High, Max and Low'], ['api', 'API and installation qualification'],
  ['limitations', 'Candidate limitations'],
] as const;

export default function GlmV2Candidate({ release }: { release: V2Release }) {
  const sd = release.sparkdash;
  return <>
    <section className="glm-shell glm-v2-section" id="sparkdash" aria-labelledby="sparkdash-title">
      <p className="glm-v2-eyebrow">sparkDash (MiaAI-Lab)</p>
      <h2 id="sparkdash-title">One run per row. Thinking off.</h2>
      <p>Decode is aggregate completion tokens minus one per request, divided by the latest last-token time minus the earliest first-token time. It excludes time before the first token. It is not end-to-end throughput or a sum of stream rates.</p>
      <p>Prefill is server prompt tokens divided by client time to the first token for one fresh prompt.</p>
      {sd ? <>
        <p>Instrument revision: {sd.revision}. Output budget: {sd.max_tokens} tokens.</p>
        {['code', 'prose', 'prefill'].map(workload => <div className="glm-v2-table-wrap glm-v2-measure-table" key={workload}>
          <table className="glm-v2-table"><caption>{workload} · thinking off · one run per row<span>tok/s · higher is better{workload === 'prefill' ? '' : ' · aggregate decode'}</span></caption>
            <thead><tr><th scope="col">{workload === 'prefill' ? 'Prompt' : 'Streams'}</th><th scope="col">{workload === 'prefill' ? 'Prefill' : 'Aggregate'}</th><th scope="col">Per stream</th></tr></thead>
            <tbody>{sd.cells.filter(cell => cell.workload === workload).map(cell => <tr key={cell.id} data-sparkdash={cell.id}>
              <th scope="row">{cell.label}{cell.extension ? <small>Extension: the four-stream wave sent twice</small> : null}</th>
              <td>{cell.display}<small>tok/s · thinking off</small></td><td>{cell.per_stream ?? 'Not supplied'}{cell.per_stream ? <small>tok/s · thinking off</small> : null}</td>
            </tr>)}</tbody>
          </table>
        </div>)}
        <p>{sd.evidence.map(href => <React.Fragment key={href}><a href={href}>Public sparkDash receipt ↗</a>{' '}</React.Fragment>)}</p>
      </> : <p className="glm-v2-empty">Winning sparkDash figures and public receipts pending. No figures are borrowed from RigMark or another instrument.</p>}
    </section>
    <section className="glm-shell glm-v2-section" id="configuration" aria-labelledby="configuration-title">
      <p className="glm-v2-eyebrow">Serving configuration</p><h2 id="configuration-title">The winning build’s settings.</h2>
      {release.serving ? <><p>{release.serving.serial ? 'One request at a time.' : `Default concurrency: ${release.serving.default_streams} streams.`}</p>{release.serving.opt_out ? <p>Return to one request at a time: <code>{release.serving.opt_out}</code>.</p> : null}</> : <p className="glm-v2-empty">Default concurrency and opt-out await the winning build.</p>}
      {SECTIONS.map(([key, title]) => <div key={key} className="glm-v2-start"><h3>{title}</h3>
        {release.sections?.[key] ? <>{release.sections[key].paragraphs.map(value => <p key={value}>{value}</p>)}{release.sections[key].evidence.map(href => <p key={href}><a href={href}>Source receipt ↗</a></p>)}</> : <p className="glm-v2-empty">{key === 'api' ? 'API model id: glm53. Final binding, image URL opt-in and installation qualification await source review.' : 'Winning copy, settings and source evidence pending.'}</p>}
      </div>)}
    </section>
  </>;
}
