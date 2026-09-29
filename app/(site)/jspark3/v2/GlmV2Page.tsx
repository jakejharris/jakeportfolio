import React from 'react';
import ClusterIllustration from './ClusterIllustration';
import ProjectHeader from './ProjectHeader';
import LegacyFragments from '../LegacyFragments';
import { GLM_V2 as release, V2_DRAFTER_NOTICE, V2_METRICS } from '../glm-v2';

const NAV = [{ href: '#results', label: 'Results' }, { href: '#license', label: 'License' }, { href: '#releases', label: 'History' }];

export default function GlmV2Page() {
  return <div className="glm glm-v2" id="glm-top">
    <LegacyFragments />
    <a className="glm-skip" href="#results">Skip to results</a>
    <div className="glm-shell">
      <ProjectHeader prefix="glm" nav={NAV} />
      <aside className="glm-v2-preview" aria-label="Release preview">
        <strong>Release preview · publication pending</strong>
        <p>{release.rows.length ? 'Measured results from the sealed candidate. Release metadata and publication remain pending.' : 'The frozen results and release qualifications are pending.'}</p>
      </aside>
      <header className="glm-hero">
        <div>
          <p className="glm-kicker">Three DGX Sparks · one endpoint</p>
          <h1>JSpark3 v2.0.0 <span>(GLM-5.3-Flash, TP3)</span></h1>
          <p className="glm-lede">TensorFold, on three Sparks.</p>
          <p className="glm-intro">The TensorFold engine, ported to TP=3, serving GLM-5.3-Flash with speculative decoding.</p>
          <div className="glm-speed">
            <p className="glm-speed-line" data-quality-headline>{release.quality?.claim ?? 'Exactness check pending.'}</p>
            <p className="glm-speed-sub">{release.quality?.scope ?? 'The scoped result will follow the frozen numbers and its receipt.'}</p>
          </div>
          <nav className="glm-actions" aria-label="Release resources">
            <a className="glm-button" href="#results">Explore the results ↓</a>
            <a href="/jspark3/glm/v1.8.4/">v1.8.4 history ↗</a>
          </nav>
        </div>
        <ClusterIllustration />
      </header>
      <dl className="glm-specs">
        <div><dt>Engine</dt><dd>TensorFold · GLM-5.3-Flash</dd></div>
        <div><dt>Execution</dt><dd>TP3 · three DGX Sparks</dd></div>
        <div><dt>Default drafter</dt><dd>DFlash2 · non-commercial</dd></div>
      </dl>
    </div>

    <section className="glm-results" id="results" aria-labelledby="results-title">
      <div className="glm-shell">
        <div className="glm-section-heading">
          <p className="glm-v2-eyebrow">Single-stream RigMark</p>
          <h2 id="results-title">Each row, with its reference.</h2>
          <p data-comparison-claim>{release.comparison_claim ?? 'Measurements and comparison verdicts pending.'}</p>
          <p>Decode throughput in tok/s, one request at a time. These rows make no claim about prefill or concurrent requests.</p>
          {release.comparison ? <div data-condition-differences>
            <p>{release.comparison.conditions}</p>
            <p>{release.comparison.engine_weights}</p>
          </div> : null}
        </div>
        <div className="glm-v2-table-wrap">
          <table className="glm-v2-table">
            <caption>The line is the midpoint of the published TP=2 and TP=4 rows.</caption>
            <thead><tr><th scope="col">Workload</th><th scope="col">Median</th><th scope="col">Slowest</th><th scope="col">Line</th></tr></thead>
            <tbody>{Object.entries(V2_METRICS).map(([id, label]) => {
              const row = release.rows.find(item => item.id === id);
              return <tr key={id}><th scope="row">{label}</th>
                <td>{row?.median_text ?? 'Pending'}</td><td>{row?.worst_text ?? 'Pending'}</td><td>{row?.line_text ?? 'Pending'}</td>
              </tr>;
            })}</tbody>
          </table>
          <div className="glm-v2-margins" aria-label="Percentage differences from the line">
            {release.rows.map(row => <p key={row.id}><strong>{V2_METRICS[row.id]}</strong><span>{row.margin_text}% · {row.vs_line} the line</span></p>)}
          </div>
        </div>
        <div className="glm-v2-table-wrap">
          <table className="glm-v2-table">
            <caption>mmastrac’s published TP3 results, author-reported.</caption>
            <thead><tr><th scope="col">Workload</th><th scope="col">JSpark3 median</th><th scope="col">Published first set</th><th scope="col">Published second set</th></tr></thead>
            <tbody>{Object.entries(V2_METRICS).map(([id, label]) => {
              const row = release.rows.find(item => item.id === id);
              return <tr key={id}><th scope="row">{label}</th><td>{row?.median_text ?? 'Pending'}</td>
                <td>{row?.upstream_tp3_set1_text ?? 'Pending'}</td><td>{row?.upstream_tp3_set2_text ?? 'Pending'}</td></tr>;
            })}</tbody>
          </table>
        </div>
        {release.comparison ? <p className="glm-evidence-link"><a href={release.comparison.source}>Pinned TP3 publication ↗</a><a href={release.comparison.line_source}>Reference line source ↗</a></p> : null}
        {release.rows.length ? <details className="glm-history-results">
          <summary>Instruments, repeats and evidence</summary>
          {release.rows.map(row => <div key={row.id} className="glm-v2-start"><h3>{V2_METRICS[row.id]}</h3>
            <p>{row.instrument}</p><p>{row.samples_text} repeats: {row.values_text.join(', ')} tok/s.</p>
            <p>{row.evidence.map((href, index) => <React.Fragment key={href}><a href={href}>Receipt {index ? '↗' : 'and results ↗'}</a>{' '}</React.Fragment>)}</p>
          </div>)}
        </details> : null}
        {release.links.results ? <p className="glm-evidence-link"><a href={release.links.results}>Sealed numbers and source tokens ↗</a></p> : null}
      </div>
    </section>

    <section className="glm-shell glm-v2-section" id="quality" aria-labelledby="quality-title">
      <p className="glm-v2-eyebrow">Qualification</p>
      <h2 id="quality-title">What the check establishes.</h2>
      {release.quality ? <>
        <p data-quality-claim>{release.quality.claim}</p><p>{release.quality.scope}</p><p>{release.quality.prompt_set_note}</p>
        <p><a href={release.quality.source}>Exactness receipt ↗</a></p>
      </> : <p className="glm-v2-empty">Quality result pending. The frozen result will supply the exactness claim, its scope and its evidence.</p>}
      {release.panel_note ? <><p>{release.panel_note}</p><ul>{release.checks.map(check => <li key={check.id}>{check.id}: {check.status}{check.observed ? ` · ${check.observed}` : ''}{check.failed_cases.length ? ` · Reported failures: ${check.failed_cases.join(', ')}` : ''}</li>)}</ul></> : null}
      {release.quality_notes.map(note => <p key={note} className="glm-v2-empty">{note}</p>)}
      <h3 style={{ marginTop: 24 }}>Release limitations</h3>
      {release.limitations.length ? <ul>{release.limitations.map(item => <li key={item}>{item}</li>)}</ul> : <p className="glm-v2-empty">Release-specific limitations and installation qualification are pending.</p>}
    </section>

    <section className="glm-shell glm-v2-section" id="license" aria-labelledby="license-title">
      <p className="glm-v2-eyebrow">License scope</p>
      <h2 id="license-title">The default drafter is non-commercial.</h2>
      <p>{release.license?.notice ?? V2_DRAFTER_NOTICE}</p>
      {release.license ? <p><a href={release.license.source}>Pinned drafter model card and terms ↗</a></p> : null}
      <p className="glm-fine">Recipe code, engine, weights and dependencies retain their own license terms.</p>
      <h3 style={{ marginTop: 24 }}>Built on open work</h3>
      <p>Tas’s TensorFold GLM branch; ashhart and the TensorFold contributors’ engine; Z.AI’s GLM-5.3-Flash; Vontra’s MLX weights; the DFlash2 authors at Inco AI; mmastrac’s fabric work, template and published reference; and alexellis’s RigMark benchmark.</p>
    </section>

    <section className="glm-shell glm-v2-section" id="releases" aria-labelledby="history-title">
      <p className="glm-v2-eyebrow">Release history</p>
      <h2 id="history-title">Earlier results stay in view.</h2>
      <p><a href="/jspark3/glm/v1.8.4/">JSpark3 v1.8.4, including the measured code c2 row ↗</a></p>
      <p><a href="/jspark3/glm/v1.8.4/#v180-results">v1.8.0 results ↗</a> · <a href="/jspark3/glm/v1.8.4/#releases">v1.1 Cadence ↗</a></p>
      <p><a href="/jspark3/deepseek/">Tempo · DeepSeek · recipe v2.0.3 ↗</a></p>
    </section>
    <footer className="glm-shell glm-footer"><a href="/jspark3/">← All JSPARK3 releases</a><a href="/about/">Jake Harris ↗</a></footer>
  </div>;
}
