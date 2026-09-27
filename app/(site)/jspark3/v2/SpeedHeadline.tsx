import React from 'react';
import Band from './Band';
import { GLM_COPY, SPEED, type SpeedBand } from '../release-copy';

/** A headline figure: the approximate token the numbers supply, or else the measured band as written. */
function Figure({ band }: { band: SpeedBand }) {
  return <strong className="glm-speed-figure">{band.display ?? <Band lo={band.lo_text} hi={band.hi_text} />}</strong>;
}

/**
 * The hero's lead line: this release's stock-weight decode at eight streams, from headline.speed alone.
 * It renders nothing when the release's own start is not in the numbers, and never borrows another start.
 */
export default function SpeedHeadline() {
  if (!SPEED) return null;
  const { code, prose, streams } = SPEED;
  const approximate = code.display !== null || (prose !== null && prose.display !== null);
  return <div className="glm-speed" data-speed-prose={prose !== null} data-speed-approximate={approximate}>
    <p className="glm-speed-line">
      <Figure band={code} /> tok/s code{prose ? <> and <Figure band={prose} /> tok/s prose</> : null} decode at {streams} streams on three DGX Sparks, stock weights.
    </p>
    <p className="glm-speed-sub">{approximate ? GLM_COPY.speed.approximate : GLM_COPY.speed.range}</p>
    {GLM_COPY.speed.reference ? <p className="glm-speed-reference">{GLM_COPY.speed.reference}</p> : null}
  </div>;
}
