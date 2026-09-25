import React from 'react';
import PageLayout from '../../../components/PageLayout';
import PixelFluidBackground from '../../../components/PixelFluidBackground';
import TransitionLink from '../../../components/TransitionLink';
import { release } from './release-data';
import { GLM_RELEASE, HUB_COPY, INTERNAL_BUILDS, RELEASE_HISTORY, headlineValue, releaseDate } from '../release-copy';
import { Ph } from '../Placeholder';

const rows = GLM_RELEASE.headline.rows;

/** The card's two numbers: prefill, and decode for one stream. A row missing from the release is left out. */
const HUB_STATS = [
  { row: rows.find(row => row.label === 'Prefill'), caption: 'prefill' },
  { row: rows.find(row => row.label === 'Decode' && row.concurrency === 'c1'), caption: 'decode, one stream' },
].flatMap(({ row, caption }) => (row ? [{ row, caption }] : []));

function LedgerRow({ href, children }: { href: string; children: React.ReactNode }) {
  return href.startsWith('/')
    ? <TransitionLink href={href} className="spark-hub-ledger-row">{children}</TransitionLink>
    : <a href={href} className="spark-hub-ledger-row" target="_blank" rel="noopener">{children}</a>;
}

export default function HubPage() {
  return <>
    <PixelFluidBackground heroMode quietShare={0.75} />
    <PageLayout className="spark-hub">
      <a className="spark-hub-skip" href="#current">Skip to releases</a>
      <header className="hero spark-hub-intro">
        <h1 className="hero-wordmark">JSPARK3</h1>
        <p className="hero-standfirst">Three Sparks. One model server.<br />{HUB_COPY.standfirst}</p>
      </header>
      <section id="current" className="spark-hub-releases" aria-label="Releases">
        <h2 className="section-kicker spark-hub-kicker">{HUB_COPY.glmCard.meta}</h2>
        <TransitionLink href="/jspark3/glm/" className="pageLinkContainer pinnedLinkBorder spark-hub-release">
          <span className="spark-hub-release-meta">{HUB_COPY.glmCard.meta} <span><Ph>{GLM_RELEASE.version}</Ph> · <Ph>{releaseDate(GLM_RELEASE.published)}</Ph></span></span>
          <span className="spark-hub-release-title">{HUB_COPY.glmCard.title} <span aria-hidden="true">↗</span></span>
          <span className="spark-hub-release-model">{HUB_COPY.glmCard.model}</span>
          {HUB_STATS.length ? <span className="spark-hub-release-stats">
            {HUB_STATS.map(({ row, caption }) => <span key={row.id}><strong><Ph>{headlineValue(row.value)}</Ph></strong> {row.unit} {caption}</span>)}
          </span> : null}
          <span className="spark-hub-release-detail">{HUB_COPY.glmCard.detail}</span>
          <span className="spark-hub-release-action">{HUB_COPY.glmCard.action} <span aria-hidden="true">→</span></span>
        </TransitionLink>
        <h2 className="section-kicker spark-hub-kicker">{HUB_COPY.tempoCard.meta}</h2>
        <TransitionLink href="/jspark3/deepseek/" className="pageLinkContainer spark-hub-release spark-hub-release-named">
          <span className="spark-hub-release-meta">{HUB_COPY.tempoCard.meta} <span>{HUB_COPY.tempoCard.version} · Recipe {release.identity.candidate}</span></span>
          <span className="spark-hub-release-title">{HUB_COPY.tempoCard.title} <span aria-hidden="true">↗</span></span>
          <span className="spark-hub-release-detail">{release.identity.model}. {HUB_COPY.tempoCard.detail}</span>
          <span className="spark-hub-release-action">{HUB_COPY.tempoCard.action} <span aria-hidden="true">→</span></span>
        </TransitionLink>
      </section>
      <section id="history" className="spark-hub-history" aria-labelledby="spark-history-title">
        <h2 id="spark-history-title" className="section-kicker spark-hub-kicker">{HUB_COPY.historyTitle}</h2>
        <ol className="spark-hub-ledger">
          <li>
            <LedgerRow href="/jspark3/glm/">
              <span className="spark-hub-ledger-version"><Ph>{GLM_RELEASE.version}</Ph></span>
              <span className="spark-hub-ledger-what">{GLM_RELEASE.name ? `${GLM_RELEASE.name}, GLM-5.3 Flash` : 'GLM-5.3 Flash'}<span className="spark-hub-ledger-pill">Latest</span></span>
              <span className="spark-hub-ledger-when"><Ph>{releaseDate(GLM_RELEASE.published, false)}</Ph></span>
            </LedgerRow>
          </li>
          {INTERNAL_BUILDS ? <li className="spark-hub-ledger-internal">
            <span className="spark-hub-ledger-row">
              <span className="spark-hub-ledger-version">{INTERNAL_BUILDS.first}{INTERNAL_BUILDS.last ? <> to <Ph>{INTERNAL_BUILDS.last}</Ph></> : null}</span>
              <span className="spark-hub-ledger-what">{HUB_COPY.internalRow}</span>
              <span className="spark-hub-ledger-when">Sep</span>
            </span>
          </li> : null}
          {RELEASE_HISTORY.map(item => <li key={item.version}>
            <LedgerRow href={item.href}>
              <span className="spark-hub-ledger-version">{item.version}</span>
              <span className="spark-hub-ledger-what">{'recipes' in item ? `${item.what} · recipe v2.0.0 to ${release.identity.candidate}` : item.what}</span>
              <span className="spark-hub-ledger-when">{item.when}</span>
            </LedgerRow>
          </li>)}
        </ol>
      </section>
      <p className="spark-hub-note">{HUB_COPY.note}</p>
    </PageLayout>
  </>;
}
