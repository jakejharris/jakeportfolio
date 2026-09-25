import React from 'react';
import ClusterIllustration from './ClusterIllustration';
import ClusterPair from './ClusterPair';
import FoldAnchors from './FoldAnchors';
import GlmArchive from './GlmArchive';
import HeadlineResults from './HeadlineResults';
import ProjectHeader from './ProjectHeader';
import { GLM_COPY, GLM_RELEASE, IS_PLACEHOLDER, LABELS, SHOW_MIA, releaseDate } from '../release-copy';
import { Marked, Ph } from '../Placeholder';

const NAV = [
  { href: '#results', label: 'Results' },
  { href: '/jspark3/deepseek/', label: 'Tempo' },
  { href: '#releases', label: 'History' },
] as const;

/** The credit line, with the handle and the pull request linked in place. */
function Credit() {
  const { text, handle, profile, pr } = GLM_COPY.credit;
  const [before, rest = ''] = text.split(handle);
  const [middle, after = ''] = rest.split('PR #9');
  return <p className="glm-credit">{before}<a href={profile}>{handle}</a>{middle}<a href={pr}>PR #9</a>{after}</p>;
}

/**
 * The GLM release page: the Tempo project shell with the Spark's own palette.
 * The numbers lead; the first community run follows. Every value comes from
 * glm-release.json, so filling that file is the whole flip.
 */
export default function GlmPage() {
  const { version, name, published, links, headline } = GLM_RELEASE;
  return <div className="glm" id="glm-top">
    <a className="glm-skip" href="#results">Skip to results</a>
    <FoldAnchors />
    <div className="glm-shell">
      <ProjectHeader prefix="glm" nav={NAV} />
      <header className="glm-hero">
        <div>
          <p className="glm-kicker">JSPARK3{name ? <> <Ph>{version}</Ph></> : null} · {LABELS.latest}</p>
          <h1><Ph>{name ?? version}</Ph></h1>
          <p className="glm-lede">GLM-5.3 Flash<br />on three DGX Sparks.</p>
          <p className="glm-intro">{GLM_COPY.intro}</p>
          <nav className="glm-actions" aria-label="Release resources">
            <a className="glm-button" href={GLM_COPY.install.guide}>Install <Ph>{version}</Ph> ↗</a>
            <a href="#results">Results ↓</a>
            <a href={links.release}>Release notes ↗</a>
          </nav>
        </div>
        <ClusterIllustration />
      </header>
      <dl className="glm-specs">
        <div><dt>Release</dt><dd><Ph>{version}</Ph> · <Ph>{releaseDate(published)}</Ph></dd></div>
        <div><dt>Weights</dt><dd>Stock GLM-5.3 Flash · abliteration is opt-in</dd></div>
        <div><dt>Hardware</dt><dd>Three DGX Sparks · RoCE · one endpoint</dd></div>
      </dl>
    </div>

    <section className="glm-results" id="results" aria-labelledby="results-title">
      <div className="glm-shell">
        <div className="glm-section-heading">
          <h2 id="results-title">{GLM_COPY.resultsTitle}</h2>
          <p>{IS_PLACEHOLDER ? <Ph block>{headline.conditions}</Ph> : headline.conditions}</p>
        </div>
        <HeadlineResults />
        {SHOW_MIA ? <p className="glm-small">{GLM_COPY.numbersNote}</p> : null}
        {GLM_COPY.internalBuilds ? <p className="glm-small"><Marked text={GLM_COPY.internalBuilds} /></p> : null}
        <p className="glm-evidence-link"><a href={links.release}>Release notes and full results ↗</a><a href="#benchmarks">v1.1 benchmarks and comparisons ↓</a></p>
      </div>
    </section>

    <section className="glm-shell glm-proof" id="community" aria-labelledby="proof-title">
      <div>
        <h2 id="proof-title">{GLM_COPY.proof.title}</h2>
        <Credit />
        <p className="glm-fine"><Marked text={GLM_COPY.proof.scope} /></p>
      </div>
      <ClusterPair />
    </section>

    <section className="glm-shell glm-why" id="why-glm" aria-labelledby="why-title">
      <h2 id="why-title">{GLM_COPY.whyGlmTitle}</h2>
      <div>
        <p>{GLM_COPY.whyGlm}</p>
        <a className="glm-olive" href="/jspark3/deepseek/">{GLM_COPY.whyGlmLink} →</a>
      </div>
    </section>

    <section className="glm-shell glm-install" id="install" aria-labelledby="install-title">
      <div>
        <h2 id="install-title">Run <Ph>{version}</Ph></h2>
        <p>{GLM_COPY.install.body}</p>
        <p>{GLM_COPY.weights}</p>
      </div>
      <ul className="glm-runlinks">
        <li><a href={links.source}><span>The recipe on GitHub</span><span>jakejharris/jspark3</span></a></li>
        <li><a href={links.huggingface}><span>Model card and provenance on Hugging Face</span><span>jakejharris/jspark3</span></a></li>
        <li><a href={GLM_COPY.install.guide}><span>The full install</span><span>docs/INSTALL.md</span></a></li>
      </ul>
    </section>

    <GlmArchive />
    <footer className="glm-shell glm-footer"><a href="/jspark3/">← All JSPARK3 releases</a><a href="/about/">Jake Harris ↗</a></footer>
  </div>;
}
