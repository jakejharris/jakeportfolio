import React from 'react';
import ProjectHeader from './ProjectHeader';
import { release } from './release-data';

export default function HubPage() {
  return <div className="tempo tempo-hub">
    <a className="tempo-skip" href="#current">Skip to current release</a>
    <div className="tempo-shell">
      <ProjectHeader hub />
      <header className="tempo-hub-intro"><h1>Three Sparks.<br />One model server.</h1><p>JSPARK3 is my three-DGX-Spark project. Each version records the daily driver we chose through internal benchmarks and actual use.</p></header>
      <section className="tempo-release" id="current" aria-labelledby="tempo-title"><p>Current daily driver<br />JSPARK3 v2</p><div><h2 id="tempo-title">Tempo</h2><p>{release.identity.model} with EXL3 experts and vLLM.</p><p>{release.identity.candidate} · Experimental</p><a href="/jspark3/deepseek/">Recipe, measured results, and limitations →</a></div></section>
      <section className="tempo-release" aria-labelledby="cadence-title"><p>Previous daily driver<br />JSPARK3 v1.1</p><div><h2 id="cadence-title">Cadence</h2><p>GLM-5.3 Flash. The published recipe, benchmarks, and release history remain available.</p><a href="/jspark3/glm/">Read the Cadence release →</a></div></section>
      <p className="tempo-compatibility">Following an older GLM link? <a href="/jspark3/glm/">The preserved Cadence page has all original sections.</a></p>
      <footer className="tempo-footer"><a href="/">← jakejh.com</a><a href="/about/">Jake Harris ↗</a></footer>
    </div>
  </div>;
}
