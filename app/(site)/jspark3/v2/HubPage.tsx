import React from 'react';
import PageLayout from '../../../components/PageLayout';
import PixelFluidBackground from '../../../components/PixelFluidBackground';
import TransitionLink from '../../../components/TransitionLink';
import { release } from './release-data';
import { HUB_COPY } from '../release-copy';

export default function HubPage() {
  return <>
    <PixelFluidBackground heroMode quietShare={0.75} />
    <PageLayout className="spark-hub">
      <a className="spark-hub-skip" href="#current">Skip to releases</a>
      <header className="hero spark-hub-intro">
        <h1 className="hero-wordmark">JSPARK3</h1>
        <p className="hero-standfirst">Three Sparks. One model server.<br />{HUB_COPY.standfirst}</p>
      </header>
      <section id="current" className="spark-hub-releases" aria-labelledby="spark-releases-title">
        <h2 id="spark-releases-title" className="section-kicker">Releases</h2>
        <ol className="spark-hub-list">
          <li>
            <TransitionLink href="/jspark3/deepseek/" className="pageLinkContainer pinnedLinkBorder spark-hub-release">
              <span className="spark-hub-release-meta">{HUB_COPY.tempoCard.meta} <span>{HUB_COPY.tempoCard.version}</span></span>
              <span className="spark-hub-release-title">{HUB_COPY.tempoCard.title} <span aria-hidden="true">↗</span></span>
              <span className="spark-hub-release-model">{release.identity.model}</span>
              <span className="spark-hub-release-detail">EXL3 experts · vLLM · Three DGX Sparks</span>
              <span className="spark-hub-release-action">{HUB_COPY.tempoCard.action} <span aria-hidden="true">→</span></span>
            </TransitionLink>
          </li>
          <li>
            <TransitionLink href="/jspark3/glm/" className="pageLinkContainer spark-hub-release spark-hub-release-previous">
              <span className="spark-hub-release-meta">{HUB_COPY.glmCard.meta} <span>{HUB_COPY.glmCard.version}</span></span>
              <span className="spark-hub-release-title">{HUB_COPY.glmCard.title} <span aria-hidden="true">↗</span></span>
              <span className="spark-hub-release-model">{HUB_COPY.glmCard.model}</span>
              <span className="spark-hub-release-action">{HUB_COPY.glmCard.action} <span aria-hidden="true">→</span></span>
            </TransitionLink>
          </li>
        </ol>
      </section>
      <p className="spark-hub-note">{HUB_COPY.note}</p>
    </PageLayout>
  </>;
}
