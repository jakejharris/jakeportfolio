import React from 'react';
import { GLM_COPY, SPEED, valueText, type SpeedBand } from '../release-copy';
import { Ph } from '../Placeholder';

/** A headline figure: the top of its measured range, as the release files write it, never rounded. */
function Figure({ band }: { band: SpeedBand }) {
  return <strong className="glm-speed-figure"><Ph>{valueText(band.hi_text)}</Ph></strong>;
}

/**
 * The hero's lead line: this release's stock-weight decode at four streams, "up to" the best measured run,
 * from headline.speed alone. The results below keep the full ranges. It renders nothing when the release's
 * own start is not in the numbers, and never borrows another start.
 */
export default function SpeedHeadline() {
  if (!SPEED) return null;
  const { code, prose, streams } = SPEED;
  return <div className="glm-speed" data-speed-prose={prose !== null}>
    <p className="glm-speed-line">
      Up to <Figure band={code} /> tok/s code{prose ? <> and <Figure band={prose} /> tok/s prose</> : null} decode at {streams} streams on three DGX Sparks, stock weights.
    </p>
    <p className="glm-speed-sub">{GLM_COPY.speed.best}</p>
    {GLM_COPY.speed.reference ? <p className="glm-speed-reference">{GLM_COPY.speed.reference}</p> : null}
  </div>;
}
