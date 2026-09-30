import React from 'react';
import { V2Multistream } from '../glm-v2';

export default function GlmV2Multistream({ rows }: { rows: V2Multistream[] }) {
  return <section className="glm-shell glm-v2-section" id="multistream" aria-labelledby="multistream-title">
    <p className="glm-v2-eyebrow">Multi-stream serving</p>
    <h2 id="multistream-title">Requests served together.</h2>
    <p>Aggregate output throughput across concurrent requests, in tok/s, higher is better. Read it separately from the single-stream RigMark measurements.</p>
    {rows.some(row => row.status === 'pending') ? <p className="glm-v2-empty">Final multi-stream measurements are pending. No scaling or comparison claim is made.</p> : null}
    <div className="glm-v2-table-wrap glm-v2-measure-table">
      <table className="glm-v2-table">
        <caption>Concurrent requests <span>Aggregate tok/s · higher is better</span></caption>
        <thead><tr><th scope="col">Streams / workload</th><th scope="col">Median</th><th scope="col">Slowest repeat</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} data-multistream={row.streams} data-multistream-id={row.id}>
          <th scope="row">{row.streams} streams{row.workload_label ? <small>{row.workload_label}</small> : null}</th>
          <td>{row.aggregate?.display?.median ?? 'Pending'}</td>
          <td>{row.aggregate?.display?.worst ?? 'Pending'}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {rows.filter(row => row.status === 'measured').map(row => <details className="glm-v2-evidence" key={row.id}>
      <summary>{row.workload_label} · {row.streams} streams: conditions, repeats and evidence</summary>
      <p>{row.instrument}</p><p>{row.workload}</p><p>{row.timing}</p><p>{row.cache}</p>
      <p>{row.samples} repeats: {row.aggregate?.display?.values.join(', ')} tok/s.</p>
      <ul className="glm-v2-traces">{row.aggregate?.trace.map((trace, index) => <li key={index}>
        <a href={trace.source}>{trace.pointer ?? `${trace.numerator} / ${trace.denominator}`} ↗</a>
      </li>)}</ul>
      {row.evidence.map(href => <p key={href}><a href={href}>Serving receipt ↗</a></p>)}
    </details>)}
  </section>;
}
