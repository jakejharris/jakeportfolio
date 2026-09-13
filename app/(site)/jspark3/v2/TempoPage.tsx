import React from 'react';
import ClusterIllustration from './ClusterIllustration';
import ProjectHeader from './ProjectHeader';
import { metric, metricRange, release, releasePublished } from './release-data';

const siteLimitations = release.limitations.filter(item => !item.startsWith('Functional code passed '));

function Latency({ context }: { context: '64k' | '76k' }) {
  return <div className="tempo-chart-panel" role="group" aria-label={`${context.toUpperCase()} prompt time to first token`}>
    <div className="tempo-scale" aria-hidden="true"><span>0</span><span>30</span><span>60 seconds</span></div>
    {(['uncached', 'repeat'] as const).map(kind => {
      const row = metric(`ttft_${kind === 'uncached' ? 'cold' : 'repeat'}_${context}`);
      return <div className={`tempo-bar ${kind === 'repeat' ? 'tempo-highlight' : ''}`} key={row.id} data-metric-id={row.id}>
        <div><span>{kind === 'uncached' ? 'Uncached prompt' : 'Exact repeat'}</span><strong>{row.value.toFixed(3)} <small>s</small></strong></div>
        <div className="tempo-track" aria-hidden="true"><i style={{ width: `${row.value / 60 * 100}%` }} /></div>
      </div>;
    })}
    <p className="tempo-condition">Three-trial medians, one request at a time. Client request start to first nonempty streamed output.</p>
    <p className="tempo-condition">Exact repeat reuses the same prefix with server caches intact. Uncached means a new prompt, with kernels already warm.</p>
  </div>;
}

function Work({ concurrency }: { concurrency: 3 | 6 }) {
  const row = metric(`work_c${concurrency}_repeat`);
  return <div className="tempo-chart-panel" role="group" aria-label={`Work at ${concurrency} concurrent agents`} data-metric-id={row.id}>
    <p className="tempo-work-value">{row.value.toFixed(2)} <span>tok/s</span></p>
    <p className="tempo-work-label">Aggregate output over the full task window</p>
    <div className="tempo-scale" aria-hidden="true"><span>0</span><span>60</span><span>120 tok/s</span></div>
    <div className="tempo-track tempo-highlight" aria-hidden="true"><i style={{ width: `${row.value / 120 * 100}%` }} /></div>
    <p className="tempo-condition">{row.conditions}</p>
    <p className="tempo-condition">Same initial payload repeated in fresh Pi sessions, with caches intact. Server-wide accepted tokens ÷ 180 seconds, including unfinished output, health probes, and small launch/drain overhead. Active cap: 8.</p>
  </div>;
}

export default function TempoPage() {
  return <div className="tempo" id="tempo-top">
    <a className="tempo-skip" href="#results">Skip to results</a>
    <div className="tempo-shell">
      <ProjectHeader />
      <header className="tempo-hero">
        <div>
          <p className="tempo-kicker">JSPARK3 v2</p>
          <h1>Tempo</h1>
          <p className="tempo-lede">{release.identity.model}<br />on three DGX Sparks.</p>
          <p className="tempo-intro">Our current daily driver, using EXL3 experts and vLLM with changes to prompt reuse, prefill scheduling, and Engram reads.</p>
          <nav className="tempo-actions" aria-label="Tempo resources">
            <a className="tempo-button" href={releasePublished ? release.links.install : '#install'}>Install recipe ↗</a>
            <a href="#results">Benchmarks ↓</a>
            <a href={releasePublished ? release.links.source : '#release'}>Source ↗</a>
          </nav>
        </div>
        <ClusterIllustration />
      </header>
      <dl className="tempo-specs">
        <div><dt>Release</dt><dd>{release.identity.candidate} · Experimental</dd></div>
        <div><dt>Hardware</dt><dd>{release.identity.hardware}</dd></div>
        <div><dt>Serving</dt><dd>EXL3 experts · vLLM · TP3</dd></div>
      </dl>
    </div>

    <section className="tempo-results" id="results" aria-labelledby="results-title">
      <div className="tempo-shell">
        <div className="tempo-section-heading"><h2 id="results-title">Measured on our three Sparks.</h2><p>Tempo measurements, September 2026. Earlier test records call this build L5-P. Different workloads answer different questions.</p></div>
        <div className="tempo-charts">
          <article className="tempo-chart tempo-latency">
            <h3>Time to first token</h3>
            <p className="tempo-chart-subtitle">An uncached prompt and its exact repeat.</p>
            <fieldset className="tempo-switcher"><legend className="tempo-sr-only">Prompt length</legend><input type="radio" name="tempo-context" id="tempo-64" defaultChecked /><label htmlFor="tempo-64">64K tokens</label><input type="radio" name="tempo-context" id="tempo-76" /><label htmlFor="tempo-76">76K tokens</label></fieldset>
            <div className="tempo-context64"><Latency context="64k" /></div><div className="tempo-context76"><Latency context="76k" /></div>
          </article>
          <article className="tempo-chart tempo-work">
            <h3>Three-minute agent tasks</h3>
            <p className="tempo-chart-subtitle">The repeated Work round.</p>
            <fieldset className="tempo-switcher"><legend className="tempo-sr-only">Concurrent agents</legend><input type="radio" name="tempo-agents" id="tempo-c3" /><label htmlFor="tempo-c3">3 agents</label><input type="radio" name="tempo-agents" id="tempo-c6" defaultChecked /><label htmlFor="tempo-c6">6 agents</label></fieldset>
            <div className="tempo-work3"><Work concurrency={3} /></div><div className="tempo-work6"><Work concurrency={6} /></div>
          </article>
        </div>
        <p className="tempo-evidence-link"><a href="/jspark3/l5-benchmarks.html">Full benchmark report and methods ↗</a><a href="/jspark3/tempo-benchmarks.json">Release measurement data ↗</a></p>
        <dl className="tempo-generation" aria-label="Single-stream generation rates">
          {(['generation_prose', 'generation_code'] as const).map(id => {
            const row = metricRange(id);
            return <div key={id} data-metric-id={id}><dt>{id === 'generation_prose' ? 'Prose' : 'Code'}</dt><dd><strong>{row.value.map(value => value.toFixed(2)).join('–')}</strong> tok/s</dd></div>;
          })}
        </dl>
        <p className="tempo-generation-note">Single stream, after first output. Ranges across {metricRange('generation_prose').samples} prose and {metricRange('generation_code').samples} code tasks; one answer per task. (Completion tokens − 1) ÷ (HTTP duration − TTFT), including transport, finalization, and speculative chunks. Not GPU-only decode.</p>
        <p className="tempo-short-result" data-metric-id="short_c6"><strong>{metric('short_c6').value.toFixed(2)} tok/s</strong> in the separate six-stream short-answer test. {metric('short_c6').conditions} Mean of eight category wave rates, including initial wait.</p>
      </div>
    </section>

    <section className="tempo-shell tempo-engineering" id="engineering" aria-labelledby="engineering-title">
      <h2 id="engineering-title">What changed</h2>
      <dl>
        <div><dt>Prompt reuse</dt><dd>Retain reusable prefixes at valid state boundaries, including changed suffixes and tool continuations.</dd></div>
        <div><dt>Prefill scheduling</dt><dd>Keep large chunks for a request running alone; share a smaller budget when another stream is generating.</dd></div>
        <div><dt>Engram reads</dt><dd>Read packed weights and scales together. The preparation preserves the values and quantization.</dd></div>
      </dl>
    </section>

    <section className="tempo-shell tempo-install" id="install" aria-labelledby="install-title">
      <div><h2 id="install-title">Run Tempo</h2><p>Three DGX Sparks, a working RoCE fabric, and local storage for the pinned model, experts, draft, and prepared Engram files. The install guide starts with a fit check and configuration worksheet.</p></div>
      <div className="tempo-install-action">{releasePublished ? <a className="tempo-button" href={release.links.install}>Install {release.identity.candidate} ↗</a> : <><p className="tempo-pending">Release candidate · publication pending</p><p>The versioned install guide and source links will open here when the release is published.</p></>}</div>
    </section>

    <section className="tempo-shell tempo-notes" aria-label="Limitations and release details">
      <details open><summary>Known limitations <span aria-hidden="true">+</span></summary><ul>{siteLimitations.map(item => <li key={item}>{item}</li>)}</ul></details>
      <details id="release"><summary>Release, evidence, and credits <span aria-hidden="true">+</span></summary><div>
        <p>{release.identity.candidate} · {release.identity.status}. JSPARK3 names our current three-Spark daily driver, chosen through internal benchmarks and use. It does not claim to win every benchmark.</p>
        <p>DeepSeek created the model. Tony and Kai’s serving work, bot-lab-21’s EXL3 experts, and vLLM underpin this recipe. Code, weights, and drafts retain their upstream terms. This is serving engineering, with no new fine-tune or model merge.</p>
        <p>{releasePublished ? <><a href={release.links.release}>Versioned release</a> · <a href={release.links.source}>GitHub source</a> · <a href={release.links.huggingface}>Hugging Face recipe</a> · <a href={release.links.evidence}>Release evidence</a></> : 'GitHub and Hugging Face publication is pending. The Hugging Face package will contain a serving recipe; weights are downloaded separately.'}</p>
        <p><a href="/jspark3/tempo-summary.json">Generated release summary</a> · <a href="/jspark3/glm/">Previous driver: GLM-5.3 Flash / Cadence</a></p>
      </div></details>
    </section>
    <footer className="tempo-shell tempo-footer"><a href="/jspark3/">← All JSPARK3 releases</a><a href="/about/">Jake Harris ↗</a></footer>
  </div>;
}
