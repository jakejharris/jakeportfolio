import React from 'react';
import PageLayout from '../../../components/PageLayout';
import TransitionLink from '../../../components/TransitionLink';
import GlassLight from '../../../components/GlassLight';
import { release } from './release-data';
import { CURRENT_LINE_HISTORY, HUB_COPY, INTERNAL_BUILDS, LABELS, LATEST_PATCH_NOTE, RELEASE_HISTORY } from '../release-copy';
import { ENGINE, HISTORY, LINKS, PUBLISHED, RELBENCH_LABEL, TILES_LINE, VERSION, releaseDate } from '../glm-facts';
import { HERO_FIGURES, HERO_LINE, HERO_TILES } from './remeasured-figures';
import { Fact } from './Fact';

/**
 * The latest card's figures, as a line of subtext under its title: the GLM page's hero (remeasured-figures.ts),
 * each figure bold with its short label and its prompt's cache status. The long captions stay on the GLM page. A
 * figure without a cache status keeps its caption (a concurrency figure's condition, without the re-measurement),
 * and a figure from other weights names them. No v1.8.4 figure stands beside them.
 */
type CardFigure = { key: string; label: string; value: React.ReactNode; unit: string; weights?: React.ReactNode; note?: React.ReactNode };
const CARD_FIGURES: CardFigure[] = [
  ...HERO_FIGURES.map(({ key, label, value, unit, prompt, caption }) => ({ key, label, value, unit, note: prompt ?? caption })),
  ...HERO_TILES.map(({ key, label, value, unit, weights, prompt, caption }) => ({
    key, label, unit, value: <Fact slot={value.slot} />,
    weights: weights ? <Fact slot={weights} /> : undefined,
    note: prompt ?? (caption ? <Fact slot={caption} /> : undefined),
  })),
];

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
                {CARD_FIGURES.map(({ key, label, value, unit, weights, note }) => <span key={key} className="spark-hub-figure" data-metric-id={key}>
                  <span className="spark-hub-figure-value">{value}<small>{unit}</small></span>
                  <span className="spark-hub-figure-label">{label}</span>
                  {weights ? <span className="spark-hub-figure-weights">{weights}</span> : null}
                  {note ? <span className="spark-hub-figure-caption">{note}</span> : null}
                </span>)}
              </span>
              {RELBENCH_LABEL ? <span className="spark-hub-release-detail spark-hub-relbench" data-relbench-label="full"><Fact slot={RELBENCH_LABEL.full} /></span> : null}
              <span className="spark-hub-release-foot">
                {HERO_LINE
                  ? <span className="spark-hub-release-detail">{HERO_LINE.lead}{HERO_LINE.measured}</span>
                  : <span className="spark-hub-release-detail">{TILES_LINE ? <Fact slot={TILES_LINE} /> : null}{RELBENCH_LABEL ? <>, <Fact slot={RELBENCH_LABEL.short} /></> : null}</span>}
                <span className="spark-hub-release-action">{HUB_COPY.glmCard.action} <span aria-hidden="true">→</span></span>
              </span>
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
          {/* The latest release links to its release notes; the release before it keeps its row, as published. */}
          <li>
            <LedgerRow href={LINKS.release.pending ? '/jspark3/glm/' : LINKS.release.text}>
              <span className="spark-hub-ledger-version"><Fact slot={VERSION} /></span>
              <span className="spark-hub-ledger-what">{LATEST_PATCH_NOTE}<span className="spark-hub-ledger-pill">Latest</span></span>
              <span className="spark-hub-ledger-when">{releaseDate(false) ?? <Fact slot={PUBLISHED} />}</span>
            </LedgerRow>
          </li>
          {CURRENT_LINE_HISTORY.map(item => <li key={item.version}>
            <LedgerRow href={item.href}>
              <span className="spark-hub-ledger-version">{item.version}</span>
              <span className="spark-hub-ledger-what">GLM-5.3 Flash on <Fact slot={ENGINE.provenance} /></span>
              <span className="spark-hub-ledger-when">{item.when}</span>
            </LedgerRow>
          </li>)}
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
