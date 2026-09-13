import React from 'react';
import PageLayout from '../../../components/PageLayout';
import PixelFluidBackground from '../../../components/PixelFluidBackground';
import TransitionLink from '../../../components/TransitionLink';
import { release } from './release-data';

export default function HubPage() {
  return <>
    <PixelFluidBackground heroMode quietShare={0.75} />
    <PageLayout className="spark-hub">
      <a className="spark-hub-skip" href="#current">Skip to releases</a>
      <header className="hero spark-hub-intro">
        <h1 className="hero-wordmark">JSPARK3</h1>
        <p className="hero-standfirst">Three Sparks. One model server.<br />The daily drivers, recipes, and measured results.</p>
      </header>
      <section id="current" className="spark-hub-releases" aria-labelledby="spark-releases-title">
        <h2 id="spark-releases-title" className="section-kicker">Releases</h2>
        <ol className="spark-hub-list">
          <li>
            <TransitionLink href="/jspark3/deepseek/" className="pageLinkContainer pinnedLinkBorder spark-hub-release">
              <span className="spark-hub-release-meta">Current daily driver <span>v2 · Experimental</span></span>
              <span className="spark-hub-release-title">Tempo <span aria-hidden="true">↗</span></span>
              <span className="spark-hub-release-model">{release.identity.model}</span>
              <span className="spark-hub-release-detail">EXL3 experts · vLLM · Three DGX Sparks</span>
              <span className="spark-hub-release-action">Recipe, results, and limitations <span aria-hidden="true">→</span></span>
            </TransitionLink>
          </li>
          <li>
            <TransitionLink href="/jspark3/glm/" className="pageLinkContainer spark-hub-release spark-hub-release-previous">
              <span className="spark-hub-release-meta">Previous daily driver <span>v1.1</span></span>
              <span className="spark-hub-release-title">Cadence <span aria-hidden="true">↗</span></span>
              <span className="spark-hub-release-model">GLM-5.3 Flash</span>
              <span className="spark-hub-release-action">Published recipe and release history <span aria-hidden="true">→</span></span>
            </TransitionLink>
          </li>
        </ol>
      </section>
      <p className="spark-hub-note">Each release records a daily driver chosen through internal benchmarks and actual use. Earlier GLM links still lead to Cadence.</p>
    </PageLayout>
  </>;
}
