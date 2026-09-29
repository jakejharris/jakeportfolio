import React from 'react';
import Band from './Band';
import { GLM_RELEASE, HEADLINE_ROWS, streams, valueText } from '../release-copy';

/** Keep different prompt workloads and their sample counts explicit. */
export default function WorkloadResults() {
  const { prose_rows, structured_c8 } = GLM_RELEASE.headline;
  if (!prose_rows || !structured_c8) return null;
  return <div className="glm-starts" data-workload-results>
    <h3>Results by workload</h3>
    <p className="glm-starts-intro">Code medians accompany the full repeat ranges. Prose and structured show their two-sweep ranges. Every decode rate is the aggregate across all concurrent streams.</p>
    <table role="table">
      <caption>Decode · tok/s · 512 forced output tokens per stream</caption>
      <thead role="rowgroup"><tr role="row"><th scope="col">Workload</th><th scope="col">Streams</th><th scope="col">Range, tok/s</th><th scope="col">Median, tok/s</th><th scope="col">Repeats</th></tr></thead>
      <tbody role="rowgroup">
        {HEADLINE_ROWS.filter(row => row.label === 'Decode').map(row => <tr role="row" key={row.id}>
          <th scope="row">Code</th><td data-label="Streams">{streams(row.concurrency)}</td>
          <td data-label="Range, tok/s">{row.omitted_reason ? 'Not measured' : <Band lo={row.lo_text} hi={row.hi_text} />}</td>
          <td data-label="Median, tok/s">{row.median_text ? valueText(row.median_text) : 'n/a'}</td><td data-label="Repeats">{row.samples ?? 'n/a'}</td>
        </tr>)}
        {prose_rows.map(row => <tr role="row" key={row.concurrency}>
          <th scope="row">Prose</th><td data-label="Streams">{streams(row.concurrency)}</td><td data-label="Range, tok/s"><Band lo={row.lo_text} hi={row.hi_text} /></td><td data-label="Median, tok/s">Not reported</td><td data-label="Sweeps">{row.samples}</td>
        </tr>)}
        <tr role="row"><th scope="row">Structured</th><td data-label="Streams">8 streams</td><td data-label="Range, tok/s"><Band lo={structured_c8.lo_text} hi={structured_c8.hi_text} /></td><td data-label="Median, tok/s">Not reported</td><td data-label="Sweeps">{structured_c8.samples}</td></tr>
      </tbody>
    </table>
    <p className="glm-small">Code at two streams: 103.0 to 106.4 tok/s over five runs, overlapping v1.8.0&apos;s 101.0 to 103.9.</p>
  </div>;
}
