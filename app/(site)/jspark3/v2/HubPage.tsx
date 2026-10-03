import React from 'react';
import PageLayout from '../../../components/PageLayout';
import TransitionLink from '../../../components/TransitionLink';
import GlassLight from '../../../components/GlassLight';
import { release } from './release-data';
import { HUB_COPY, INTERNAL_BUILDS, LABELS, RELEASE_HISTORY } from '../release-copy';
import { ENGINE, HISTORY, PUBLISHED, RELBENCH_LABEL, TILES_LINE, TILE_FIGURES, VERSION, releaseDate } from '../glm-facts';
import { Fact } from './Fact';

/**
 * The latest card's figures are the release's chosen metrics, as the facts write them (glm-facts.ts TILE_FIGURES).
 * No v1.8.4 figure stands beside them: the release compares the two only in RigMark's "Against v1.8.4".
 * A figure from other weights names them; a concurrency figure carries its condition as its caption.
 */

function LedgerRow({ href, children }: { href: string; children: React.ReactNode }) {
  return href.startsWith('/')
    ? <TransitionLink href={href} className="spark-hub-ledger-row">{children}</TransitionLink>
    : <a href={href} className="spark-hub-ledger-row" target="_blank" rel="noopener">{children}</a>;
}

export default function HubPage() {
  const latestDate = releaseDate();
  return <>
    <PageLayout className="spark-hub">
      <a className="spark-hub-skip" href="#current">Skip to releases</a>
      <header className="hero spark-hub-intro">
        <h1 className="hero-wordmark" data-fluid-island>JSPARK3</h1>
        <p className="hero-standfirst" data-fluid-island>Three Sparks. One model server.<br />{HUB_COPY.standfirst}</p>
      </header>
      <section id="current" className="spark-hub-releases" aria-labelledby="spark-releases-title">
        <h2 id="spark-releases-title" className="section-kicker">{HUB_COPY.releasesTitle}</h2>
        <GlassLight />
        <ol className="spark-hub-list">
          <li>
            <TransitionLink href="/jspark3/glm/" className="pageLinkContainer spark-hub-release">
              <span className="spark-hub-release-meta">{`${LABELS.latest} `}<span><Fact slot={VERSION} />{latestDate ? <> · {latestDate}</> : null}</span></span>
              <span className="spark-hub-release-title">GLM-5.3 Flash <span aria-hidden="true">↗</span></span>
              <span className="spark-hub-figures" data-figure="facts">
                {TILE_FIGURES.map(({ key, label, unit, value, weights, caption }) => <span key={key} className="spark-hub-figure" data-metric-id={key}>
                  <span className="spark-hub-figure-label">{label}</span>
                  <span className="spark-hub-figure-value"><Fact slot={value.slot} /><small>{unit}</small></span>
                  {weights ? <span className="spark-hub-figure-weights"><Fact slot={weights} /></span> : null}
                  {caption ? <span className="spark-hub-figure-caption"><Fact slot={caption} /></span> : null}
                </span>)}
              </span>
              <span className="spark-hub-release-detail">{TILES_LINE ? <Fact slot={TILES_LINE} /> : null}{RELBENCH_LABEL ? <>, <Fact slot={RELBENCH_LABEL.short} /></> : null}</span>
              {RELBENCH_LABEL ? <span className="spark-hub-release-detail spark-hub-relbench" data-relbench-label="full"><Fact slot={RELBENCH_LABEL.full} /></span> : null}
              <span className="spark-hub-release-action">{HUB_COPY.glmCard.action} <span aria-hidden="true">→</span></span>
            </TransitionLink>
          </li>
          <li>
            <TransitionLink href="/jspark3/deepseek/" className="pageLinkContainer spark-hub-release spark-hub-release-named">
              <span className="spark-hub-release-meta">{HUB_COPY.tempoCard.meta} <span>{HUB_COPY.tempoCard.version} · Recipe {release.identity.candidate}</span></span>
              <span className="spark-hub-release-title">{HUB_COPY.tempoCard.title} <span aria-hidden="true">↗</span></span>
              <span className="spark-hub-release-detail">{release.identity.model}. {HUB_COPY.tempoCard.detail}</span>
              <span className="spark-hub-release-action">{HUB_COPY.tempoCard.action} <span aria-hidden="true">→</span></span>
            </TransitionLink>
          </li>
        </ol>
      </section>
      <section id="history" className="spark-hub-history" aria-labelledby="spark-history-title">
        <h2 id="spark-history-title" className="section-kicker spark-hub-kicker">{HUB_COPY.historyTitle}</h2>
        <ol className="spark-hub-ledger">
          <li>
            <LedgerRow href="/jspark3/glm/">
              <span className="spark-hub-ledger-version"><Fact slot={VERSION} /></span>
              <span className="spark-hub-ledger-what">GLM-5.3 Flash on <Fact slot={ENGINE.provenance} /><span className="spark-hub-ledger-pill">Latest</span></span>
              <span className="spark-hub-ledger-when">{releaseDate(false) ?? <Fact slot={PUBLISHED} />}</span>
            </LedgerRow>
          </li>
          {HISTORY.map((item, index) => <li key={`internal-${index}`} className="spark-hub-ledger-internal">
            <span className="spark-hub-ledger-row">
              <span className="spark-hub-ledger-version"><Fact slot={item.version} /></span>
              <span className="spark-hub-ledger-what"><Fact slot={item.note} /></span>
              <span className="spark-hub-ledger-when" />
            </span>
          </li>)}
          {RELEASE_HISTORY.map(item => <React.Fragment key={item.version}>
            <li>
              <LedgerRow href={item.href}>
                <span className="spark-hub-ledger-version">{item.version}</span>
                <span className="spark-hub-ledger-what">{'recipes' in item ? `${item.what} · recipe v2.0.0 to ${release.identity.candidate}` : item.what}</span>
                <span className="spark-hub-ledger-when">{item.when}</span>
              </LedgerRow>
            </li>
            {item.version === 'v1.8.0' && INTERNAL_BUILDS ? <li className="spark-hub-ledger-internal">
              <span className="spark-hub-ledger-row">
                <span className="spark-hub-ledger-version">{INTERNAL_BUILDS.first} to {INTERNAL_BUILDS.last}</span>
                <span className="spark-hub-ledger-what">{HUB_COPY.internalRow}</span>
                <span className="spark-hub-ledger-when">Sep</span>
              </span>
            </li> : null}
          </React.Fragment>)}
        </ol>
      </section>
      <p className="spark-hub-note">{HUB_COPY.note}</p>
    </PageLayout>
  </>;
}
