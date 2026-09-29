import React from 'react';
import PageLayout from '../../../components/PageLayout';
import TransitionLink from '../../../components/TransitionLink';
import GlassLight from '../../../components/GlassLight';
import { release } from './release-data';
import { GLM_RELEASE, HEADLINE_ROWS, HUB_COPY, INTERNAL_BUILDS, IS_PLACEHOLDER, RELEASE, RELEASE_HISTORY, RELEASE_SUMMARY, releaseDate, valueText } from '../release-copy';
import { Ph } from '../Placeholder';
import Band from './Band';

/**
 * The card's four figures, from the release's own start: prefill, code and prose for one stream, and code
 * for four streams. prose_c1 is the release's decode_prose_c1; the others are headline rows. A figure the
 * release's numbers leave out is skipped, and with no measured start of the release the card shows none.
 */
type HubCell = { lo_text: string | null; hi_text: string | null; median_text?: string; unit: string };
const HUB_TILES = HUB_COPY.glmCard.tiles.flatMap(tile => {
  const cell: HubCell | undefined = tile.id === 'prose_c1'
    ? (GLM_RELEASE.headline.missing || !GLM_RELEASE.headline.prose_c1 ? undefined : { ...GLM_RELEASE.headline.prose_c1, unit: 'tok/s' })
    : HEADLINE_ROWS.find(item => item.id === tile.id);
  return cell && (IS_PLACEHOLDER || cell.hi_text !== null) ? [{ ...tile, cell }] : [];
});
const FIGURE = HUB_COPY.glmCard.figure;

/** A recorded code median, otherwise the complete recorded range. */
function HubFigure({ cell }: { cell: HubCell }) {
  return cell.median_text ? <Ph>{valueText(cell.median_text)}</Ph> : <Band lo={cell.lo_text} hi={cell.hi_text} />;
}

function LedgerRow({ href, children }: { href: string; children: React.ReactNode }) {
  return href.startsWith('/')
    ? <TransitionLink href={href} className="spark-hub-ledger-row">{children}</TransitionLink>
    : <a href={href} className="spark-hub-ledger-row" target="_blank" rel="noopener">{children}</a>;
}

export default function HubPage() {
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
            <TransitionLink href="/jspark3/glm/" className="pageLinkContainer pinnedLinkBorder spark-hub-release">
              <span className="spark-hub-release-meta">{`${HUB_COPY.glmCard.meta} `}<span><Ph>{RELEASE}</Ph>{GLM_RELEASE.published ? <> · <Ph>{releaseDate(GLM_RELEASE.published)}</Ph></> : null}</span></span>
              <span className="spark-hub-release-title">{HUB_COPY.glmCard.title} <span aria-hidden="true">↗</span></span>
              {RELEASE_SUMMARY ? <span className="spark-hub-release-detail">{RELEASE_SUMMARY}</span> : null}
              {HUB_TILES.length ? <span className="spark-hub-figures" data-figure={FIGURE}>
                {HUB_TILES.map(({ id, label, cell }) => <span key={id} className="spark-hub-figure" data-metric-id={id}>
                  <span className="spark-hub-figure-label">{label}</span>
                  <span className="spark-hub-figure-value"><HubFigure cell={cell} /><small>{cell.unit}</small></span>
                </span>)}
              </span> : null}
              <span className="spark-hub-release-detail">{HUB_TILES.length ? HUB_COPY.glmCard.caption[FIGURE] : HUB_COPY.glmCard.caption.none}</span>
              {HUB_TILES.length && HUB_COPY.glmCard.installNote ? <span className="spark-hub-release-detail" data-hub-install-note>{HUB_COPY.glmCard.installNote}</span> : null}
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
              <span className="spark-hub-ledger-version"><Ph>{RELEASE}</Ph></span>
              <span className="spark-hub-ledger-what">{GLM_RELEASE.name ? `${GLM_RELEASE.name}, GLM-5.3 Flash` : 'GLM-5.3 Flash'}<span className="spark-hub-ledger-pill">Latest</span></span>
              <span className="spark-hub-ledger-when">{GLM_RELEASE.published ? <Ph>{releaseDate(GLM_RELEASE.published, false)}</Ph> : null}</span>
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
