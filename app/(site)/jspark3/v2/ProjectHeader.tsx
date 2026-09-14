import React from 'react';
import Image from 'next/image';

export default function ProjectHeader({ hub = false }: { hub?: boolean }) {
  return <header className="tempo-header">
    <a href="/jspark3/" className="tempo-wordmark" aria-label="JSPARK3 releases">
      <picture>
        <source media="(prefers-reduced-motion: reduce)" srcSet="/jspark3/jspark3-mark-static.svg" />
        <Image src="/jspark3/jspark3-mark.svg" alt="" width={40} height={40} unoptimized />
      </picture>
      <span>JSPARK3</span>
    </a>
    <nav aria-label="Project navigation">
      {hub ? <a href="/jspark3/deepseek/">Tempo</a> : <a href="#results">Results</a>}
      <a href="/jspark3/glm/">Cadence</a>
      <a href="/about/" className="tempo-author">Jake Harris ↗</a>
    </nav>
  </header>;
}
