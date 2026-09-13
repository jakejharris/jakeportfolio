import React from 'react';

export default function ProjectHeader({ hub = false }: { hub?: boolean }) {
  return <header className="tempo-header">
    <a href="/jspark3/" className="tempo-wordmark" aria-label="JSPARK3 releases">JSPARK<sup>3</sup></a>
    <nav aria-label="Project navigation">
      {hub ? <a href="/jspark3/deepseek/">Tempo</a> : <a href="#results">Results</a>}
      <a href="/jspark3/glm/">Cadence</a>
      <a href="/about/" className="tempo-author">Jake Harris ↗</a>
    </nav>
  </header>;
}
