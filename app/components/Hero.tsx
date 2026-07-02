import '../css/hero.css';
import TransitionLink from './TransitionLink';

// "Ledger" masthead: the wordmark owns the name (navbar carries the JH mark),
// one-sentence standfirst, then the contact CTA rendered as the ledger's open
// line, and the AGENTS / CONTEXT / SYSTEMS trio as a typographic rule.
// Entrance settles once, then holds still.
export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <h1 id="hero-title" className="hero-wordmark">
        Jake&nbsp;Harris
      </h1>
      <p className="hero-standfirst">
        Building AI systems, autonomous agents, and tools for high-context work.
      </p>
      {/* The ledger's open line: same mono voice + hairline rule as the trio
          below, but interactive — the terminal em-dash morphs to an arrow and
          the rule ignites on hover, an unfilled entry inviting the next line. */}
      <TransitionLink href="/contact#" scroll={true} className="hero-cta">
        <span className="hero-cta-label">Get in touch</span>
        <i className="hero-cta-rule" aria-hidden="true" />
        <span className="hero-cta-mark" aria-hidden="true">
          <span className="hero-cta-mark-rest">&mdash;</span>
          <span className="hero-cta-mark-go">&rarr;</span>
        </span>
      </TransitionLink>
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
