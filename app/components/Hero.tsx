import '../css/hero.css';

// "Ledger" masthead: the wordmark owns the name (navbar carries the JH mark)
// and the one-sentence standfirst states the work. Entrance settles once, then
// holds still.
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
        the apps they make possible.
      </p>
    </section>
  );
}
