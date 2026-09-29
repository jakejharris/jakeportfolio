import React from 'react';
import ClusterIllustration from './ClusterIllustration';
import ProjectHeader from './ProjectHeader';
import GlmV2Measurements from './GlmV2Measurements';
import GlmV2Multistream from './GlmV2Multistream';
import GlmV2Candidate from './GlmV2Candidate';
import LegacyFragments from '../LegacyFragments';
import { GLM_V2, V2_DRAFTER_NOTICE, V2_METRICS, V2Release } from '../glm-v2';

const NAV = [{ href: '#results', label: 'Results' }, { href: '#license', label: 'License' }, { href: '#releases', label: 'History' }];

export default function GlmV2Page({ release = GLM_V2 }: { release?: V2Release } = {}) {
  return <div className="glm glm-v2" id="glm-top">
    <LegacyFragments />
    <a className="glm-skip" href="#results">Skip to results</a>
    <div className="glm-shell">
      <ProjectHeader prefix="glm" nav={NAV} />
      <aside className="glm-v2-preview" aria-label="Release preview">
        <strong>{release.fixture ? 'Synthetic rehearsal · invented values' : 'Release preview · publication pending'}</strong>
        <p>{release.fixture ? 'Invented values for layout verification. Publication remains blocked.' : release.sparkdash || release.multistream.every(row => row.status === 'measured') ? 'Sealed candidate measurements. Publication remains on hold; evidence links await publication of the checkpoint.' : release.rows.length ? 'Earlier sealed single-stream checkpoint. Final candidate measurements are pending; publication remains on hold.' : 'The frozen results and release qualifications are pending.'}</p>
      </aside>
      <header className="glm-hero">
        <div>
          <p className="glm-kicker">Three DGX Sparks · one endpoint</p>
          <h1>JSpark3 v2.0.0 <span>(GLM-5.3-Flash, TP3)</span></h1>
          <p className="glm-lede">TensorFold, on three Sparks.</p>
          <p className="glm-intro">JSpark3 builds on Ash Hart’s TensorFold engine with a three-Spark TP3 recipe, a chat-switch revisit store, hardening and a High effort default. {release.serving ? release.serving.serial ? 'This build serves one request at a time.' : 'This build adds concurrent serving.' : 'Concurrent serving qualification awaits the winning build.'} Final measurements and configuration follow the winning build’s receipts.</p>
          <div className="glm-speed">
            <p className="glm-speed-line" data-quality-headline>{release.builder_quality?.claim ?? release.quality?.claim ?? 'Candidate qualification pending.'}</p>
            <p className="glm-speed-sub">{release.quality?.scope ?? 'The final results will follow the sealed numbers and their receipts.'}</p>
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
          <h2 id="results-title">{release.serving?.serial ? 'One request at a time.' : 'Single-stream decode.'}</h2>
          <nav className="glm-v2-jumps" aria-label="Measurement sections"><a href="#latency">Latency ↓</a><a href="#prefill">Prefill ↓</a><a href={release.sparkdash ? "#sparkdash" : "#multistream"}>Multi-stream ↓</a><a href="#decode">Decode coverage ↓</a></nav>
          <p>Decode throughput in tok/s, higher is better, one request at a time. These rows make no claim about prefill or concurrent requests.</p>
        </div>
        <div className="glm-v2-table-wrap">
          <table className="glm-v2-table">
            <caption>Single-stream RigMark · tok/s · higher is better</caption>
            <thead><tr><th scope="col">Workload</th><th scope="col">Median</th><th scope="col">Slowest repeat</th></tr></thead>
            <tbody>{Object.entries(V2_METRICS).map(([id, label]) => {
              const row = release.rows.find(item => item.id === id);
              return <tr key={id}><th scope="row">{label}</th>
                <td>{row?.display.median ?? 'Pending'}</td><td>{row?.display.worst ?? 'Pending'}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        {release.rows.length ? <details className="glm-history-results">
          <summary>Instruments, repeats and evidence</summary>
          {release.rows.map(row => <div key={row.id} className="glm-v2-start"><h3>{V2_METRICS[row.id]}</h3>
            <p>{row.instrument}</p><p>Repeats: {row.display.values.join(', ')} tok/s.</p>
            <p>{row.evidence.map((href, index) => <React.Fragment key={href}><a href={href}>Receipt {index ? '↗' : 'and results ↗'}</a>{' '}</React.Fragment>)}</p>
          </div>)}
        </details> : null}
        {release.links.results ? <p className="glm-evidence-link"><a href={release.links.results}>Sealed numbers and source tokens ↗</a></p> : null}
      </div>
    </section>

    <GlmV2Candidate release={release} />
    {!release.sparkdash ? <GlmV2Multistream rows={release.multistream} /> : null}
    <GlmV2Measurements release={release} />

    <section className="glm-shell glm-v2-section" id="quality" aria-labelledby="quality-title">
      <p className="glm-v2-eyebrow">Qualification</p>
      <h2 id="quality-title">What the check establishes.</h2>
      {release.builder_quality ? <><p data-quality-claim>{release.builder_quality.claim}</p><p><a href={release.builder_quality.source}>Winning exactness receipt ↗</a></p></> : release.quality ? <>
        <p data-quality-claim>{release.quality.claim}</p><p>{release.quality.scope}</p><p>{release.quality.prompt_set_note}</p>
        <details className="glm-v2-evidence"><summary>Corpus and drafting counters</summary>
          <p>{release.quality.display.tested} of {release.quality.display.prompts} prompts tested; long prompt: {release.quality.display.long_prompt_tokens} tokens; generated: {release.quality.display.generated_tokens} tokens.</p>
          <p>With drafting: {release.quality.proof_display.tokens_after_first_on} tokens after the first token, {release.quality.proof_display.verify_cycles_on} verify cycles, {release.quality.proof_display.tokens_per_cycle} tokens per cycle. Serial reference: {release.quality.proof_display.serial_rounds_off} rounds.</p>
          <p>These are diagnostic counts on the measured corpus, with no performance ranking.</p>
        </details>
        <p><a href={release.quality.source}>Exactness receipt ↗</a></p>
      </> : <p className="glm-v2-empty">Quality result pending. The frozen result will supply the exactness claim, its scope and its evidence.</p>}
      {release.panel_note ? <><p>{release.panel_note}</p><ul>{release.checks.map(check => <li key={check.id}>{check.id}: {check.status}{check.observed ? ` · ${check.observed}` : ''}{check.reason ? ` · ${check.reason}` : ''}{!check.observed && check.display?.passed !== undefined ? ` · ${check.display.passed}/${check.display.total}` : ''}{!check.observed && check.display?.corrupt !== undefined ? ` · ${check.display.corrupt} corrupt of ${check.display.total}` : ''}{!check.observed && check.display?.percentage ? ` (${check.display.percentage})` : ''}{check.source ? <> · <a href={check.source}>Receipt ↗</a></> : null}{check.failed_cases.length ? ` · Reported failures: ${check.failed_cases.join(', ')}` : ''}</li>)}</ul></> : null}
      {release.quality_notes.map(note => <p key={note} className="glm-v2-empty">{note}</p>)}
      <h3 style={{ marginTop: 24 }}>Release limitations</h3>
      <p data-memory-limitation>Text preparation runs outside the 5.5 GiB memory envelope. That envelope remains an ESTIMATE; the fix is planned for v2.0.1.</p>
      {release.limitations.length ? <ul>{release.limitations.map(item => <li key={item}>{item}</li>)}</ul> : <p className="glm-v2-empty">Release-specific limitations and installation qualification are pending.</p>}
    </section>

    <section className="glm-shell glm-v2-section" id="license" aria-labelledby="license-title">
      <p className="glm-v2-eyebrow">License scope</p>
      <h2 id="license-title">The default drafter is non-commercial.</h2>
      <p>{V2_DRAFTER_NOTICE}</p>
      {release.license ? <p><a href={release.license.source}>Pinned drafter model card and terms ↗</a></p> : null}
      <p className="glm-fine">Recipe code, engine, base weights, quantized weights and dependencies retain their own license terms. This is not legal advice.</p><p><code>DRAFTER=none</code> disables the drafter. Performance: not measured at TP=3.</p>
      <h3 style={{ marginTop: 24 }}>Built on open work</h3>
      <p>Tas’s TensorFold GLM branch; Ash Hart and the TensorFold contributors’ engine; Z.AI’s GLM-5.3-Flash; Vontra’s MLX weights; the DFlash2 authors at Inco AI; mmastrac’s fabric work and template; and alexellis’s RigMark benchmark.</p>
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
