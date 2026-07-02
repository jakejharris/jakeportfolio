import '../css/hero.css';
import TransitionLink from './TransitionLink';

// "Ledger" masthead: the wordmark owns the name (navbar carries the JH mark),
// one-sentence standfirst, then the contact CTA rendered as the ledger's open
// line. Entrance settles once, then holds still.
export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <h1 id="hero-title" className="hero-wordmark">
        Jake&nbsp;Harris
      </h1>
      {/* Hard break: the standfirst reads as two lines at every width, long
          line over short. */}
      <p className="hero-standfirst">
        Building agent orchestration systems and
        <br />
        tools that remember.
      </p>
      {/* The ledger's open line: same mono voice + hairline rule as the trio
          below, but interactive — the terminal dash morphs to an arrow and the
          rule ignites on hover, an unfilled entry inviting the next line. The
          rest-state dash is drawn as a rule segment (not a glyph) so it sits on
          exactly the same line as the hairline. */}
      <TransitionLink href="/contact#" scroll={true} className="hero-cta">
        <span className="hero-cta-label">Get in touch</span>
        <i className="hero-cta-rule" aria-hidden="true" />
        <span className="hero-cta-mark" aria-hidden="true">
          <span className="hero-cta-mark-rest" />
          <span className="hero-cta-mark-go">&rarr;</span>
        </span>
      </TransitionLink>
    </section>
  );
}
