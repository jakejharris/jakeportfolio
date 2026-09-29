import React from 'react';
import PageLayout from '../../../components/PageLayout';
import PixelFluidBackground from '../../../components/PixelFluidBackground';
import TransitionLink from '../../../components/TransitionLink';
import { release } from './release-data';
import { HUB_COPY, INTERNAL_BUILDS, RELEASE_HISTORY } from '../release-copy';
import { GLM_V2, V2_HIGHLIGHTS } from '../glm-v2';

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
        <h1 className="hero-wordmark" data-fluid-island>JSPARK3</h1>
        <p className="hero-standfirst" data-fluid-island>Three Sparks. One model server.<br />{HUB_COPY.standfirst}</p>
      </header>
      <section id="current" className="spark-hub-releases" aria-labelledby="spark-releases-title">
        <h2 id="spark-releases-title" className="section-kicker">{HUB_COPY.releasesTitle}</h2>
        <ol className="spark-hub-list">
          <li>
            <TransitionLink href="/jspark3/glm/" className="pageLinkContainer pinnedLinkBorder spark-hub-release">
              <span className="spark-hub-release-meta">{GLM_V2.pending.length ? 'Release preview · publication pending' : 'Latest release'}</span>
              <span className="spark-hub-release-title">{GLM_V2.title} <span aria-hidden="true">↗</span></span>
              <span className="spark-hub-figures">
                {V2_HIGHLIGHTS.map(cell => <span key={cell.id} className="spark-hub-figure">
                  <span className="spark-hub-figure-label">{cell.label}</span>
                  <span className="spark-hub-figure-value">{cell.value}{!GLM_V2.fixture ? <small>tok/s</small> : null}</span>
                </span>)}
              </span>
              <span className="spark-hub-release-detail">{GLM_V2.fixture ? 'Measurements pending. Fixture values are not release results.' : 'Measured ranges. Conditions and every serving start on the release page.'}</span>
              <span className="spark-hub-release-detail">DFlash2: non-commercial. MTP-only: not measured at TP=3.</span>
              <span className="spark-hub-release-action">Recipe, results, and license scope <span aria-hidden="true">→</span></span>
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
              <span className="spark-hub-ledger-version">JSpark3 v2.0.0</span>
              <span className="spark-hub-ledger-what">(GLM-5.3-Flash, TP3)<span className="spark-hub-ledger-pill">{GLM_V2.pending.length ? 'Preview' : 'Latest'}</span></span>
              <span className="spark-hub-ledger-when">{GLM_V2.published ?? 'Pending'}</span>
            </LedgerRow>
          </li>
          {INTERNAL_BUILDS ? <li className="spark-hub-ledger-internal">
            <span className="spark-hub-ledger-row">
              <span className="spark-hub-ledger-version">{INTERNAL_BUILDS.first}{INTERNAL_BUILDS.last ? <> to {INTERNAL_BUILDS.last}</> : null}</span>
              <span className="spark-hub-ledger-what">{HUB_COPY.internalRow}</span>
              <span className="spark-hub-ledger-when">Sep</span>
            </span>
          </li> : null}
          <li><LedgerRow href="/jspark3/glm/v1.8.4/">
            <span className="spark-hub-ledger-version">v1.8.4</span>
            <span className="spark-hub-ledger-what">GLM-5.3 Flash · preserved results</span>
            <span className="spark-hub-ledger-when">Sep</span>
          </LedgerRow></li>
          {RELEASE_HISTORY.map(item => <li key={item.version}>
            <LedgerRow href={item.href.replace('/jspark3/glm/#', '/jspark3/glm/v1.8.4/#')}>
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
