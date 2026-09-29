import React from 'react';
import { GLM_V2, V2Release, V2Latency, V2Stats, V2Trace, V2Unmeasured } from '../glm-v2';

const CASES: Record<string, string> = { cold: 'Cold', warm: 'Warm resend', turn: 'Appended turn' };
const MODES = ['Max (default)', 'Low'] as const;

function TraceLinks({ traces }: { traces: V2Trace[] }) {
  return <ul className="glm-v2-traces">{traces.map((trace, index) => <li key={index}>
    <a href={trace.source}>{trace.pointer ?? `${trace.numerator} / ${trace.denominator}`} ↗</a>
  </li>)}</ul>;
}

function Timing({ stats }: { stats: V2Stats }) {
  return stats.display ? <><strong>{stats.display.median} s</strong><small>Slowest {stats.display.worst} s</small></> : <span>Not observed</span>;
}

export function LatencyTable({ rows, mode }: { rows: V2Latency[]; mode: typeof MODES[number] }) {
  return <div className="glm-v2-table-wrap glm-v2-measure-table">
    <table className="glm-v2-table">
      <caption>{mode} <span>Seconds · lower is better for both timings</span></caption>
      <thead><tr><th scope="col">Prompt / request</th><th scope="col">First token<br />Median / slowest</th><th scope="col">First answer text<br />Median / slowest</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id} data-measurement={row.id}>
        <th scope="row">{row.prompt === 'short' ? 'Short' : row.prompt}<small>{CASES[row.case]}</small></th>
        <td><Timing stats={row.first_token} /></td>
        <td><Timing stats={row.first_content} />{row.first_content.conditional ? <small className="glm-v2-conditional">Conditional on answer text observed; budget-censored requests excluded.</small> : null}</td>
      </tr>)}</tbody>
    </table>
    <details className="glm-v2-evidence">
      <summary>{mode}: repeats, reasoning and evidence</summary>
      {rows.map(row => <div key={row.id} className="glm-v2-start">
        <h4>{row.prompt === 'short' ? 'Short' : row.prompt} · {CASES[row.case]}</h4>
        <p>{row.instrument}. Timings in seconds, lower is better. Repeats are in receipt order.</p>
        <p>First token: {row.first_token.display?.values.join(', ')} s.</p>
        <TraceLinks traces={row.first_token.trace} />
        <p>{row.first_content.display ? `First answer text: ${row.first_content.display.values.join(', ')} s.` : 'First answer text was not observed within the response budget.'}</p>
        <TraceLinks traces={row.first_content.trace} />
        {row.first_content.conditional ? <><p>Conditional result: budget-censored requests are excluded from the answer timing statistics.</p><TraceLinks traces={row.first_content.censored_trace} /></> : <p>Answer text was observed on every request.</p>}
        {row.reasoning_tokens.display ? <p>Reasoning tokens: median {row.reasoning_tokens.display.median}, maximum {row.reasoning_tokens.display.worst}; repeats {row.reasoning_tokens.display.values.join(', ')}. Descriptive counts, with no better direction.</p> : null}
        <TraceLinks traces={row.reasoning_tokens.trace} />
      </div>)}
    </details>
  </div>;
}

function StatusCard({ row }: { row: V2Unmeasured }) {
  return <article className="glm-v2-status-card" data-measurement={row.id}>
    <h3>{row.label}</h3>
    <p className="glm-v2-status">{row.status === 'not-supported' ? 'Not supported' : 'Not measured'}</p>
    <p>{row.reason}</p>
    {row.source_read ? <details className="glm-v2-evidence"><summary>Queue behavior and evidence</summary>
      <p>{row.instrument}. Source read: {row.source_read.status}.</p>
      <p>{row.source_read.finding}</p>
      <p>Engine revision {row.source_read.engine_commit}; {row.source_read.citations.join('; ')}.</p>
      {row.evidence.map(href => <p key={href}><a href={href}>Queue-check receipt ↗</a></p>)}
    </details> : null}
  </article>;
}

export default function GlmV2Measurements({ release = GLM_V2 }: { release?: V2Release } = {}) {
  const checkpointPending = release.multistream.some(row => row.status === 'pending');
  return <>
    <section className="glm-shell glm-v2-section" id="latency" aria-labelledby="latency-title">
      <p className="glm-v2-eyebrow">Latency · streamed requests</p>
      <h2 id="latency-title">First token. First answer text.</h2>
      <p>{checkpointPending ? 'These are single-request, greedy timings from the earlier sealed checkpoint. Final candidate timings are pending.' : 'These are single-request, greedy timings from the sealed candidate.'}</p>
      <dl className="glm-v2-definitions">
        <div><dt>First token</dt><dd>Client time from before opening the request to the first streamed reasoning or content text. Seconds, lower is better.</dd></div>
        <div><dt>First answer text</dt><dd>Client time to the first content text, after any reasoning. This is the start of the answer, not the completed answer. Seconds, lower is better.</dd></div>
      </dl>
      <p><strong>Max (default)</strong> uses the serving default. <strong>Low</strong> still reasons briefly. The response budgets differ by mode, so read each mode separately.</p>
      <p className="glm-v2-empty"><strong>Cache conditions:</strong> cold uses a new prompt; warm resends the identical prompt; an appended turn extends the conversation. Each receipt records the cached tokens for its requests.</p>
      {release.latency.length ? null : <p className="glm-v2-empty">Latency measurements pending.</p>}
      <div className="glm-v2-mode-tables">{MODES.map(mode => <LatencyTable key={mode} mode={mode} rows={release.latency.filter(row => row.effort === mode)} />)}</div>
    </section>

    <section className="glm-shell glm-v2-section" id="prefill" aria-labelledby="prefill-title">
      <p className="glm-v2-eyebrow">Client-effective prefill</p>
      <h2 id="prefill-title">Prompt work, including client overhead.</h2>
      <p>Cold-request prompt tokens divided by time to the first streamed text. This is a client-effective rate, including request overhead, rather than a GPU-only prefill measurement. Read it with the mode-specific response budgets in the latency receipts.</p>
      {!release.prefill.length ? <p className="glm-v2-empty">Prefill measurements pending.</p> : null}
      <div className="glm-v2-table-wrap glm-v2-measure-table">
        <table className="glm-v2-table">
          <caption>Cold requests <span>tok/s · higher is better</span></caption>
          <thead><tr><th scope="col">Prompt / mode</th><th scope="col">Median</th><th scope="col">Slowest</th></tr></thead>
          <tbody>{release.prefill.map(row => row.status === 'measured' ? <tr key={row.id} data-measurement={row.id}>
            <th scope="row">{row.prompt}<small>{row.effort}</small></th><td>{row.display?.median} <small>tok/s</small></td><td>{row.display?.worst} <small>tok/s</small></td>
          </tr> : <tr key={row.id} data-measurement={row.id}><th scope="row">{row.label}</th><td colSpan={2} className="glm-v2-status-cell"><strong>Not measured</strong><small>{row.reason}</small></td></tr>)}</tbody>
        </table>
        <details className="glm-v2-evidence"><summary>Prefill repeats and evidence</summary>
          {release.prefill.map(row => row.status === 'measured' ? <div key={row.id} className="glm-v2-start">
            <h4>{row.prompt} · {row.effort}</h4><p>{row.instrument}. Repeats: {row.display?.values.join(', ')} tok/s, higher is better.</p>
            <TraceLinks traces={row.trace} />
          </div> : null)}
        </details>
      </div>
    </section>

    <section className="glm-shell glm-v2-section" id="decode" aria-labelledby="decode-title">
      <p className="glm-v2-eyebrow">Decode coverage</p>
      <h2 id="decode-title">The limits of this recipe.</h2>
      <p>Decode throughput would be reported in tok/s, higher is better. Post-context workloads have no measured figures yet. Multi-stream results appear in their own section above.</p>
      <div className="glm-v2-status-grid">{release.decode.map(row => <StatusCard key={row.id} row={row} />)}</div>
    </section>
  </>;
}
