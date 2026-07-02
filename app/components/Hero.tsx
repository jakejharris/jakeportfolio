import '../css/hero.css';

// "Ledger" masthead: the wordmark owns the name (navbar carries the JH mark),
// one-sentence standfirst, a mono status line, and the AGENTS / CONTEXT /
// SYSTEMS trio as a typographic rule. Entrance settles once, then holds still.
export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <h1 id="hero-title" className="hero-wordmark">
        Jake&nbsp;Harris
      </h1>
      <p className="hero-standfirst">
        Building AI systems, autonomous agents, and tools for high-context work.
      </p>
      <p className="hero-status">
        <span className="hero-status-label">now:</span> agent orchestration &amp; context tooling
      </p>
      <div className="hero-trio" aria-label="Agents. Context. Systems.">
        <span><em aria-hidden="true">01</em>Agents</span>
        <i aria-hidden="true" />
        <span><em aria-hidden="true">02</em>Context</span>
        <i aria-hidden="true" />
        <span><em aria-hidden="true">03</em>Systems</span>
      </div>
    </section>
  );
}
