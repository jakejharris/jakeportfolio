import React from 'react';

function Spark({ x, y, rank }: { x: number; y: number; rank: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-8 94 144 166 276 94 123 20Z" fill="#080b09" opacity=".5" />
      <path d="M0 39 143 105 258 39 258 78 143 145 0 78Z" fill="url(#jsv-case)" stroke="#736f5d" strokeWidth="1" />
      <path d="M143 105 258 39 258 78 143 145Z" fill="#383b30" />
      <path d="M0 39 113-20 258 39 143 105Z" fill="url(#jsv-metal-top)" stroke="#a09d88" strokeWidth="1" strokeLinejoin="round" />
      <path d="M12 40 114-12 245 40 143 97Z" fill="none" stroke="#c6c2a1" opacity=".3" />
      <path d="M0 46 143 112 258 47" fill="none" stroke="#151b16" strokeWidth="2" />
      {Array.from({ length: 24 }, (_, i) => {
        const px = 9 + i * 5.3;
        const py = 49 + i * 2.45;
        return <path key={i} d={`M${px} ${py}v22`} stroke="#292c23" strokeWidth="2" />;
      })}
      {Array.from({ length: 17 }, (_, i) => {
        const px = 152 + i * 5.8;
        const py = 110 - i * 3.35;
        return <path key={i} d={`M${px} ${py}v20`} stroke="#151c17" strokeWidth="2" />;
      })}
      <path d="m100 24 17-9 28 12-17 9Z" fill="#262d22" opacity=".7" />
      <path d="m109 24 10-5 15 7-10 5Z" fill="#becb94" />
      <circle cx="131" cy="127" r="2" fill="#d8ef9d" />
      <text className="jsv-svg-rank" paintOrder="stroke" stroke="#171c17" strokeWidth="6" strokeLinejoin="round" x="143" y={rank.startsWith('00') ? 200 : 181} textAnchor="middle" fontFamily="monospace" fontSize="16" fill="#b4bcaa" letterSpacing="2">{rank}</text>
    </g>
  );
}

export default function ClusterIllustration() {
  return (
    <figure className="jsv-cluster">
      <svg viewBox="0 0 720 660" role="img" aria-labelledby="jsv-cluster-title jsv-cluster-desc">
        <title id="jsv-cluster-title">Three Sparks. One model.</title>
        <desc id="jsv-cluster-desc">An illustrative three-node RoCE fabric. Rank zero exposes the API; all three machines participate in tensor-parallel execution.</desc>
        <defs>
          <linearGradient id="jsv-metal-top" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b0ac92" /><stop offset=".55" stopColor="#7c8068" /><stop offset="1" stopColor="#555e4c" /></linearGradient>
          <linearGradient id="jsv-case" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#979178" /><stop offset="1" stopColor="#5b5c48" /></linearGradient>
          <pattern id="jsv-grid" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#56624d" /></pattern>
        </defs>
        <rect x="40" y="60" width="640" height="560" fill="url(#jsv-grid)" opacity=".35" />
        <ellipse cx="358" cy="352" rx="305" ry="211" fill="none" stroke="#404b39" strokeDasharray="3 9" />
        <g fill="none" stroke="#b5d780" strokeWidth="2" opacity=".75">
          <path d="M325 237 325 282 210 345" /><path d="M354 225 485 293 485 345" />
          <path d="M206 428 206 485 354 555 499 472 499 402" />
        </g>
        <g fill="#d8ef9d"><circle cx="325" cy="282" r="3" /><circle cx="485" cy="293" r="3" /><circle cx="354" cy="555" r="3" /></g>
        <Spark x={206} y={104} rank="00 / API HEAD" />
        <Spark x={65} y={317} rank="01 / WORKER" />
        <Spark x={393} y={307} rank="02 / WORKER" />
        <g className="jsv-svg-cap"><path d="M349 33v49" stroke="#929d83" strokeWidth="1" /><circle cx="349" cy="29" r="4" fill="#d8ef9d" />
        <text x="365" y="36" fontFamily="monospace" fontSize="10" fill="#b4bcaa" letterSpacing="1.5">ONE ENDPOINT</text></g>
        <text className="jsv-svg-cap" x="356" y="602" textAnchor="middle" fontFamily="monospace" fontSize="10" fill="#b4bcaa" letterSpacing="2">THREE-WAY EXECUTION / RoCE FABRIC</text>
      </svg>
      <figcaption>Three DGX Sparks · one endpoint<span>Rank 0 serves the API; all three run inference.</span></figcaption>
    </figure>
  );
}
