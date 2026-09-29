import React from 'react';
import historical from '../glm-v180.json';
import Band from './Band';
import ServingStarts from './ServingStarts';

/** The previous release's complete site data remains frozen in its own snapshot. */
export default function HistoricalResults() {
  return <details id="v180-results" className="glm-history-results">
    <summary>v1.8.0 results, preserved as published</summary>
    <p className="glm-small">{historical.headline.conditions}</p>
    <p className="glm-small">Prose decode: <Band lo={historical.headline.prose_c1.lo_text} hi={historical.headline.prose_c1.hi_text} /> tok/s at one stream; <Band lo={historical.headline.speed.prose.lo_text} hi={historical.headline.speed.prose.hi_text} /> tok/s at four streams. One serving start, two sweeps.</p>
    <ServingStarts />
    <p className="glm-evidence-link"><a href={historical.links.results}>v1.8.0 results file ↗</a><a href={historical.links.numbers}>v1.8.0 measurement definitions ↗</a><a href="https://github.com/jakejharris/jspark3/releases/tag/v1.8.0">v1.8.0 release notes ↗</a></p>
  </details>;
}
