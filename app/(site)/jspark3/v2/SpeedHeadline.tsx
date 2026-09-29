import React from 'react';
import { GLM_COPY, HEADLINE_ROWS, SPEED, valueText } from '../release-copy';
import Band from './Band';

/** The release claim, followed by explicitly labelled measurements from its own start. */
export default function SpeedHeadline() {
  if (!SPEED) return null;
  const { code, prose, streams } = SPEED;
  const median = HEADLINE_ROWS.find(row => row.id === `decode_c${streams}`)?.median_text;
  return <div className="glm-speed" data-speed-prose={prose !== null}>
    <p className="glm-speed-line">
      {GLM_COPY.speed.summary}
    </p>
    <p className="glm-speed-sub">Code{median ? ' median' : ''}: <strong className="glm-speed-figure">{median ? valueText(median) : <Band lo={code.lo_text} hi={code.hi_text} />}</strong> tok/s{prose ? <> · prose: <strong className="glm-speed-figure"><Band lo={prose.lo_text} hi={prose.hi_text} /></strong> tok/s</> : null}, {streams} concurrent streams.</p>
    <p className="glm-speed-sub">{GLM_COPY.speed.scope}</p>
    {GLM_COPY.speed.reference ? <p className="glm-speed-reference">{GLM_COPY.speed.reference}</p> : null}
  </div>;
}
