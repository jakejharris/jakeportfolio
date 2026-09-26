import React from 'react';
import { RELEASE } from '../release-copy';
import { Ph } from '../Placeholder';

function Box({ x, y, own }: { x: number; y: number; own: boolean }) {
  return <g>
    <rect x={x} y={y} width="70" height="44" rx="5" fill={own ? '#2a2517' : '#1c1f23'} stroke={own ? '#d4b87c' : '#a9aba8'} strokeWidth="1.5" />
    <rect x={x + 8} y={y + 8} width="54" height="28" fill={own ? 'url(#glm-grille-ours)' : 'url(#glm-grille-theirs)'} />
  </g>;
}

function Cluster({ dx, own }: { dx: number; own: boolean }) {
  return <g>
    <g stroke={own ? '#d4b87c' : '#a9aba8'} strokeWidth="2" strokeOpacity={own ? 1 : 0.8}>
      <line x1={120 + dx} y1="62" x2={70 + dx} y2="150" /><line x1={120 + dx} y1="62" x2={170 + dx} y2="150" /><line x1={70 + dx} y1="150" x2={170 + dx} y2="150" />
    </g>
    <Box x={85 + dx} y={40} own={own} /><Box x={35 + dx} y={128} own={own} /><Box x={135 + dx} y={128} own={own} />
  </g>;
}

/** Two clusters of three machines and one recipe between them: ours, and the first community run from PR #9. */
export default function ClusterPair() {
  return <figure className="glm-pair">
    <svg viewBox="0 12 460 180" role="img" aria-label="Two clusters of three machines with the JSPARK3 recipe between them: our three DGX Sparks, and @unsaltedbutter-ai's three GB10 machines, which ran JSPARK3 v1.1 with one added patch.">
      <defs>
        <pattern id="glm-grille-ours" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1" fill="#d4b87c" fillOpacity=".55" /></pattern>
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
