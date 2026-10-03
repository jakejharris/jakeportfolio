import React from 'react';
import { RELEASE } from '../release-copy';
import { Ph } from '../Placeholder';

/** A GB10 machine front-on: every maker's box is 150 mm wide with a body about 45 mm tall. Ours are DGX Sparks, metal foam with a slotted plate at each end. */
function Box({ cx, cy, own }: { cx: number; cy: number; own: boolean }) {
  const x = cx - 35, y = cy - 10.6, ink = own ? '#d4b87c' : '#a9aba8';
  return <g>
    <rect x={x} y={y} width="70" height="21.2" rx="2" fill={own ? '#2a2517' : '#1c1f23'} stroke={ink} strokeWidth="1.5" />
    <rect x={x + 2} y={y + 2} width="66" height="17.2" fill={own ? 'url(#glm-foam-ours)' : 'url(#glm-grille-theirs)'} />
    {own ? [[3.2, 3.85], [55.1, 61.8]].map(([plate, slot]) => <React.Fragment key={plate}>
      <rect x={x + plate} y={y + 2.3} width="11.8" height="16.6" rx="2" fill="#2a2517" stroke={ink} strokeWidth="1" />
      <rect x={x + slot} y={y + 2.9} width="4.4" height="15.4" rx="2.2" fill={ink} fillOpacity=".35" />
    </React.Fragment>) : null}
  </g>;
}

function Cluster({ dx, own }: { dx: number; own: boolean }) {
  return <g>
    <g stroke={own ? '#d4b87c' : '#a9aba8'} strokeWidth="2" strokeOpacity={own ? 1 : 0.8}>
      <line x1={120 + dx} y1="62" x2={70 + dx} y2="150" /><line x1={120 + dx} y1="62" x2={170 + dx} y2="150" /><line x1={70 + dx} y1="150" x2={170 + dx} y2="150" />
    </g>
    <Box cx={120 + dx} cy={62} own={own} /><Box cx={70 + dx} cy={150} own={own} /><Box cx={170 + dx} cy={150} own={own} />
  </g>;
}

/** Two clusters of three machines and one recipe between them: ours, and the first community run from PR #9. */
export default function ClusterPair() {
  return <figure className="glm-pair">
    <svg viewBox="0 12 460 180" role="img" aria-label="Two clusters of three machines with the JSPARK3 recipe between them: our three DGX Sparks, and @unsaltedbutter-ai's three GB10 machines, which ran JSPARK3 v1.1 with one added patch.">
      <defs>
        <pattern id="glm-foam-ours" width="7" height="6" patternUnits="userSpaceOnUse"><g fill="#d4b87c" fillOpacity=".5"><circle cx="1" cy="1.2" r=".8" /><circle cx="4.3" cy=".7" r=".6" /><circle cx="2.8" cy="3.4" r=".9" /><circle cx="6" cy="3" r=".7" /><circle cx="1.2" cy="5.2" r=".6" /><circle cx="4.8" cy="5.1" r=".8" /></g></pattern>
        <pattern id="glm-grille-theirs" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1" fill="#a9aba8" fillOpacity=".45" /></pattern>
      </defs>
      <Cluster dx={0} own />
      <Cluster dx={220} own={false} />
      <g stroke="#ecebe6" strokeWidth="1.5">
        <rect x="219" y="86" width="22" height="28" rx="2" fill="#141619" />
        <line x1="224" y1="95" x2="236" y2="95" strokeWidth="1" /><line x1="224" y1="101" x2="236" y2="101" strokeWidth="1" /><line x1="224" y1="107" x2="232" y2="107" strokeWidth="1" />
      </g>
      <g stroke="#ecebe6" strokeDasharray="2 4" strokeLinecap="round"><line x1="190" y1="100" x2="212" y2="100" /><line x1="248" y1="100" x2="270" y2="100" /></g>
    </svg>
    <figcaption>
      <span><strong>Our three DGX Sparks</strong>runs <Ph>{RELEASE}</Ph></span>
      <span><strong>Their three GB10 machines</strong>ran v1.1 with one added patch</span>
    </figcaption>
  </figure>;
}
