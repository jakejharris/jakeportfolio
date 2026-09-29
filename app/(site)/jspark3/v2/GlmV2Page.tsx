import React from 'react';
import ClusterIllustration from './ClusterIllustration';
import ProjectHeader from './ProjectHeader';
import LegacyFragments from '../LegacyFragments';
import { GLM_V2 as release, V2_NO_DRAFTER_NOTICE, V2_MTP_NOTICE, V2_DRAFTER_NOTICE, V2_KNOWN_ISSUE, V2_METRICS, V2_RELEASE_SET, v2Band } from '../glm-v2';

const NAV = [{ href: '#results', label: 'Results' }, { href: '#license', label: 'License' }, { href: '#releases', label: 'History' }];

export default function GlmV2Page() {
  return <div className="glm glm-v2" id="glm-top">
    <LegacyFragments />
    <a className="glm-skip" href="#results">Skip to results</a>
    <div className="glm-shell">
      <ProjectHeader prefix="glm" nav={NAV} />
      {release.pending.length > 0 ? <aside className="glm-v2-preview" aria-label="Release preview">
        <strong>Release preview · publication pending</strong>
        <p>{release.fixture ? 'Benchmark figures remain pending. The layout fixture is not a measurement.' : 'Qualification and publication checks are still pending.'}</p>
      </aside> : null}
      <header className="glm-hero">
        <div>
          <p className="glm-kicker">Three DGX Sparks · one endpoint</p>
          <h1>JSpark3 v2.0.0 <span>(GLM-5.3-Flash, TP3)</span></h1>
          <p className="glm-lede">A new base for three Sparks.</p>
          <p className="glm-intro">Based on mmastrac’s NVFP4 GLM-5.3-Flash TP3 recipe, adapted to three DGX Sparks with the full serving path and tuning controls.</p>
          <div className="glm-speed">
            <p className="glm-speed-line">{release.comparison && V2_RELEASE_SET && !release.fixture ? 'Compared with mmastrac’s published TP3, on the same instruments.' : 'Published TP3 comparison pending.'}</p>
            <p className="glm-speed-sub">{release.comparison && V2_RELEASE_SET && !release.fixture ? 'Measured ranges and author-reported results are shown together below.' : 'Headline figures will follow the frozen results.'}</p>
          </div>
          <nav className="glm-actions" aria-label="Release resources">
            <a className="glm-button" href="#results">Explore the results ↓</a>
            <a href="/jspark3/glm/v1.8.4/">v1.8.4 history ↗</a>
            {!release.pending.length ? <a href={release.links.release}>Release notes ↗</a> : null}
          </nav>
        </div>
        <ClusterIllustration />
      </header>
      <dl className="glm-specs">
        <div><dt>Base</dt><dd>mmastrac · NVFP4 · GLM-5.3-Flash</dd></div>
        <div><dt>Execution</dt><dd>TP3 · three DGX Sparks · RoCE</dd></div>
        <div><dt>Default drafter</dt><dd>DFlash2 · non-commercial</dd></div>
      </dl>
    </div>

    <section className="glm-results" id="results" aria-labelledby="results-title">
      <div className="glm-shell">
        <div className="glm-section-heading">
          <p className="glm-v2-eyebrow">The measured release</p>
          <h2 id="results-title">Every range, with its conditions.</h2>
          <p>{release.fixture ? 'Measurements pending. The preview uses invented fixture data; those values are not displayed as results.' : release.conditions}</p>
          <p>All figures are tok/s. Decode above one stream is aggregate throughput across streams. Ranges describe variation within a serving start.</p>
          {release.comparison ? <div data-condition-differences>
            <p>Same instruments, different conditions.</p>
            <ul>{release.comparison.condition_differences.map(item => <li key={item}>{item}</li>)}</ul>
          </div> : null}
        </div>
        {V2_RELEASE_SET ? <div className="glm-v2-table-wrap">
          <table className="glm-v2-table">
            <caption>{release.fixture ? 'Pending measurements for JSpark3 v2.0.0 (GLM-5.3-Flash, TP3)' : release.title}</caption>
            <thead><tr><th scope="col">Workload</th><th scope="col">Measured range</th><th scope="col">mmastrac, published TP3</th></tr></thead>
            <tbody>{Object.entries(V2_RELEASE_SET.cells).map(([id, cell]) => <tr key={id}>
              <th scope="row">{V2_METRICS[id]}</th>
              <td>{release.fixture ? <span className="glm-v2-pending">Pending</span> : v2Band(cell)}</td>
              <td>{release.fixture || !release.comparison ? <span className="glm-v2-pending">Pending</span> : release.comparison.cells[id] ? v2Band(release.comparison.cells[id]) : 'Not compared'}</td>
            </tr>)}</tbody>
          </table>
          {!release.fixture ? <p className="glm-small">{V2_RELEASE_SET.serving_starts} serving start; {V2_RELEASE_SET.sweeps} sweeps. {V2_RELEASE_SET.label}. {V2_RELEASE_SET.prefill_omitted_reason}</p> : null}
        </div> : <p className="glm-v2-empty">No measured serving start of this release is in the numbers. No other build supplies its headline.</p>}
        {release.comparison ? <p className="glm-evidence-link"><a href={release.comparison.source}>mmastrac’s pinned publication and benchmark ↗</a></p> : null}
        {!release.fixture ? <details className="glm-history-results">
          <summary>Instruments and recorded sample counts</summary>
          {release.sets.map(set => <div key={set.id} className="glm-v2-start">
            <h3>{set.build} · {set.mode === '0' ? 'stock weights' : 'edited weights, opt-in'}</h3>
            <p>{set.label} · {set.serving_starts} serving start(s), {set.sweeps} sweeps · {set.toggles}</p>
            <dl>{Object.entries(set.cells).map(([id, cell]) => <div key={id}>
              <dt>{V2_METRICS[id]}</dt>
              <dd>{v2Band(cell)} tok/s. {cell.instrument}{cell.samples_text ? ` · ${cell.samples_text} samples` : ''}{cell.median_text ? ` · median ${cell.median_text} tok/s` : ''}</dd>
            </div>)}</dl>
          </div>)}
        </details> : null}
        {!release.pending.length ? <p className="glm-evidence-link"><a href={release.links.results}>Frozen results file ↗</a><a href={release.links.numbers}>Measurement definitions ↗</a></p> : null}
      </div>
    </section>

    <section className="glm-shell glm-v2-section" id="quality" aria-labelledby="quality-title">
      <p className="glm-v2-eyebrow">Qualification</p>
      <h2 id="quality-title">Quality, on the verdict-bearing prompts.</h2>
      {release.quality && !release.fixture ? <>
        <p data-quality-claim>{release.quality.claim}</p>
        <a href={release.quality.source}>Quality measurements and scope ↗</a>
      </> : <p className="glm-v2-empty">Quality result pending. The frozen verdict, prompt count and scoped claim will appear here with their evidence.</p>}
      <h3 style={{ marginTop: 24 }}>Known issue · long context</h3>
      <p data-known-issue>{release.quality?.known_issue ?? V2_KNOWN_ISSUE}</p>
    </section>

    <section className="glm-shell glm-v2-section" id="license" aria-labelledby="license-title">
      <p className="glm-v2-eyebrow">Before you run it</p>
      <h2 id="license-title">Choose a path with the right terms.</h2>
      <div className="glm-v2-paths">
        <div><h3>DFlash2 · default</h3><p>{V2_DRAFTER_NOTICE}</p>{release.drafter_source ? <>
          <p><a href={release.drafter_source.url}>Pinned upstream drafter ↗</a></p>
          <p><a href={release.drafter_source.card}>Model card and license notice ↗</a> · <a href={release.drafter_source.license_url}>License text ↗</a></p>
        </> : <p className="glm-fine">Upstream license link pending.</p>}</div>
        <div><h3>No drafter</h3><p>{V2_NO_DRAFTER_NOTICE}</p><p className="glm-fine">This path avoids the non-commercial drafter.</p></div>
        <div><h3>MTP-only</h3><p>{V2_MTP_NOTICE}</p><p className="glm-fine">Its weights reach the TP=3 shards unpadded and may not load. We do not recommend this path.</p></div>
      </div>
      <p className="glm-fine">Recipe, base weights, and dependencies retain their own license terms. Release-specific installation guidance will follow qualification.</p>
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
