// One idea per image. Every figure is a literal from app/(site)/jspark3/content.ts;
// `sources` lists the literals the renderer checks against that file before it draws.

const RECIPE = 'GLM-5.3 Flash EXL3/TR3 4-bpw, vLLM TP3/EP3, three DGX Sparks';

function bar({ ours, value, unit, who, pct }) {
  return `<div class="bar${ours ? ' ours' : ''}">
  <div class="track"><div class="fill" style="width:${pct}%"></div><div class="value">${value}<span class="unit">${unit}</span></div></div>
  <div class="who">${who}</div></div>`;
}

export const CARDS = [
  {
    id: '01-aggregate-251',
    idea: '251 tok/s aggregate decode at four streams, 62.80 per stream',
    source: 'BENCHMARK_FACTS[1]; BENCHMARKS.sparkdash rows C4',
    sources: ['"251"', '62.80 per stream', '251.13', 'value: "251"'],
    receipt: `sparkDash protocol, C4 clamp code: 251.13 tok/s aggregate. ${RECIPE}`,
    body: () => `
<div class="num">251<span class="unit">tok/s</span></div>
<div class="label">aggregate decode at four streams, 62.80 per stream</div>
<div class="segs">${[1, 2, 3, 4].map((i) => `<div class="seg"><div class="fill"></div><div class="v">stream ${i} · 62.80</div></div>`).join('')}</div>`,
  },
  {
    id: '02-ttft-391-vs-719',
    idea: '391 ms time to first token vs 719 ms on the two-Spark recipe',
    source: 'HERO_FACTS[1]; BENCHMARKS.sparkdash row C1 time to first token',
    sources: ['391 ms', '719 ms', 'time to first token on the sparkDash prompt'],
    receipt: `sparkDash protocol, C1, time to first token. JSpark3 clamp code vs Mia TP2 two-Spark recipe. ${RECIPE}`,
    body: () => `
<div class="eyebrow">Time to first token, sparkDash prompt</div>
<div class="bars" style="margin-top:0.9em">
${bar({ ours: true, value: '391', unit: 'ms', who: 'JSpark3, three DGX Sparks', pct: (391 / 719) * 58 })}
${bar({ ours: false, value: '719', unit: 'ms', who: 'Mia TP2 recipe, two DGX Sparks', pct: 58 })}
</div>`,
  },
  {
    id: '03-code-decode-1.49x',
    idea: '1.49x single-stream code decode, 66.3 vs 44.6 tok/s',
    source: 'HERO_FACTS[0]',
    sources: ['"1.49x"', '66.3 vs 44.6 tok/s'],
    receipt: `Single-stream code decode, same frozen screen, own fleet: three DGX Sparks vs the two-Spark Mia TP2 recipe. ${RECIPE}`,
    body: () => `
<div class="num">1.49<span class="unit">x</span></div>
<div class="label">faster single-stream code decode than the two-Spark recipe</div>
<div class="bars" style="margin-top:1.1em;--bar-h:40px;--bar-val:56px;--bar-gap:22px">
${bar({ ours: true, value: '66.3', unit: 'tok/s', who: 'JSpark3, three DGX Sparks', pct: 62 })}
${bar({ ours: false, value: '44.6', unit: 'tok/s', who: 'Mia TP2 recipe, two DGX Sparks', pct: (44.6 / 66.3) * 62 })}
</div>`,
  },
  {
    id: '04-prefill-1234',
    idea: '1,234 tok/s prefill on a 113,908-token prompt',
    source: 'BENCHMARK_FACTS[2]',
    sources: ['"1,234"', 'prefill on a 113,908-token prompt', '92.3 s to first token'],
    receipt: `One request, 92.3 s to first token, results.json in the repository. ${RECIPE}`,
    body: () => `
<div class="num">1,234<span class="unit">tok/s</span></div>
<div class="label">prefill on a 113,908-token prompt, one request, three DGX Sparks</div>`,
  },
  {
    id: '05-context-1000000',
    idea: '1,000,000-token configured context on three desktop boxes',
    source: 'BENCHMARK_FACTS[3]; RELEASE_ENVELOPE',
    sources: ['"1,000,000"', 'configured context with an FP8 KV cache', 'Configured context 1,000,000 tokens'],
    receipt: `vLLM, TP3/EP3 over a RoCE-v2 triangle, FP8 KV cache, 32 sequences, 8,192 batched tokens. GLM-5.3 Flash EXL3/TR3 4-bpw`,
    body: () => `
<div class="num num--long">1,000,000<span class="unit">tokens</span></div>
<div class="label">configured context on three desktop boxes, FP8 KV cache</div>`,
  },
  {
    id: '06-topology',
    idea: 'The topology: Rank 0 API Head, Rank 1 and 2 Headless, Legs A/B/C',
    source: 'ARCHITECTURE_CAPTION; FabricTriangle.tsx NODES and LEGS',
    sources: ['Rank 0 exposes the API; ranks 1 and 2 are headless peers.'],
    receipt: `Three RoCE-v2 fabric legs, every rank reaches each peer directly. ${RECIPE}`,
    body: ({ orient }) => topology(orient),
  },
  {
    id: '07-hero-card',
    idea: 'Final hero card: four decode and prefill numbers under one headline, for the blog OG',
    source: 'HERO_FACTS[0]; BENCHMARK_FACTS[0..2]',
    sources: ['"1.49x"', '66.3 vs 44.6 tok/s', '81.962', '66.257', '29.049', '"251"', '62.80 per stream', '"1,234"', '113,908-token prompt'],
    receipt: '',
    body: () => `
<div class="tagline">One GLM-5.3 Flash endpoint: 3 DGX Sparks, 1M context.</div>
<div class="grid">
<div class="cell"><div class="eyebrow">Single-stream code decode</div><div class="num">1.49<span class="unit">x</span></div><div class="comparison">66.3 vs 44.6 tok/s on two Sparks</div></div>
<div class="cell"><div class="eyebrow">Single-stream decode</div><div class="num">82<span class="unit">tok/s</span></div><div class="comparison">structured output; code 66.3, prose 29.0</div></div>
<div class="cell"><div class="eyebrow">Four-stream aggregate decode</div><div class="num">251<span class="unit">tok/s</span></div><div class="comparison">62.8 tok/s per stream, four streams</div></div>
<div class="cell"><div class="eyebrow">Prefill</div><div class="num">1,234<span class="unit">tok/s</span></div><div class="comparison">113,908-token prompt, one request</div></div>
</div>`,
  },
  {
    id: '07-hero-card-va',
    idea: 'Terse four-number hero card with one-line labels',
    source: 'HERO_FACTS[0..3]',
    sources: ['"1.49x"', '"391 ms"', '"251 tok/s"', '"1.8x"'],
    receipt: 'Measured: 3 DGX Sparks · GLM-5.3 Flash',
    body: () => `
<div class="tagline">GLM-5.3 Flash: 3 DGX Sparks, one endpoint, 1.49x faster.</div>
<div class="grid">
<div class="cell"><div class="num">1.49<span class="unit">x</span></div><div class="label">single-stream code decode</div></div>
<div class="cell"><div class="num">391<span class="unit">ms</span></div><div class="label">sparkDash first-token latency</div></div>
<div class="cell"><div class="num">251<span class="unit">tok/s</span></div><div class="label">four-stream aggregate decode</div></div>
<div class="cell"><div class="num">1.8<span class="unit">x</span></div><div class="label">same-task agent throughput</div></div>
</div>`,
  },
  {
    id: '07-hero-card-vb',
    idea: 'Four-number hero card with eyebrow labels and muted comparisons',
    source: 'HERO_FACTS[0..3]',
    sources: ['"1.49x"', '"391 ms"', '"251 tok/s"', '"1.8x"', '66.3 vs 44.6 tok/s', '719 ms', '146.5', '44.6 vs 24.7 tok/s'],
    receipt: '',
    body: () => `
<div class="tagline">One GLM-5.3 Flash endpoint: 3 DGX Sparks, 1M context.</div>
<div class="grid">
<div class="cell"><div class="eyebrow">Single-stream code decode</div><div class="num">1.49<span class="unit">x</span></div><div class="comparison">66.3 vs 44.6 tok/s on two Sparks</div></div>
<div class="cell"><div class="eyebrow">sparkDash first-token latency</div><div class="num">391<span class="unit">ms</span></div><div class="comparison">391 vs 719 ms on two Sparks</div></div>
<div class="cell"><div class="eyebrow">Four-stream aggregate decode</div><div class="num">251<span class="unit">tok/s</span></div><div class="comparison">251 vs 146.5 tok/s on two Sparks</div></div>
<div class="cell"><div class="eyebrow">Same-task agent throughput</div><div class="num">1.8<span class="unit">x</span></div><div class="comparison">44.6 vs 24.7 tok/s on two Sparks</div></div>
</div>`,
  },
  {
    id: '07-hero-card-vc',
    idea: 'Four-number hero card framed by its headline with URL-only footer',
    source: 'HERO_FACTS[0..3]',
    sources: ['"1.49x"', '"391 ms"', '"251 tok/s"', '"1.8x"'],
    receipt: '',
    body: () => `
<div class="tagline">3 DGX Sparks. One GLM-5.3 Flash endpoint. 1M context.</div>
<div class="grid">
<div class="cell"><div class="num">1.49<span class="unit">x</span></div><div class="label">single-stream decode vs two Sparks</div></div>
<div class="cell"><div class="num">391<span class="unit">ms</span></div><div class="label">first-token latency vs two Sparks</div></div>
<div class="cell"><div class="num">251<span class="unit">tok/s</span></div><div class="label">four-stream decode vs two Sparks</div></div>
<div class="cell"><div class="num">1.8<span class="unit">x</span></div><div class="label">same-task throughput vs two Sparks</div></div>
</div>`,
  },
  {
    id: '08-same-task-1.8x',
    idea: '1.8x throughput on the same agent task, 44.6 vs 24.7 tok/s',
    source: 'HERO_FACTS[3]; SAME_TASK rows',
    sources: ['"1.8x"', '44.6 vs 24.7 tok/s', '"44.583"', '"24.728"'],
    receipt: `Same agent prompt, independent runs: 44.583 vs 24.728 tok/s aggregate decode, three Sparks vs the current two-Spark Mia TP2 recipe`,
    body: () => `
<div class="num">1.8<span class="unit">x</span></div>
<div class="label">the throughput of the two-Spark recipe on the same agent task</div>
<div class="bars" style="margin-top:1.1em;--bar-h:40px;--bar-val:56px;--bar-gap:22px">
${bar({ ours: true, value: '44.6', unit: 'tok/s', who: 'JSpark3, three DGX Sparks', pct: 62 })}
${bar({ ours: false, value: '24.7', unit: 'tok/s', who: 'Mia TP2 recipe, two DGX Sparks', pct: (24.7 / 44.6) * 62 })}
</div>`,
  },
];

/** Portrait variants of the two strongest ideas. */
export const PORTRAIT = ['02-ttft-391-vs-719', '03-code-decode-1.49x'];

/** 1200x630 OpenGraph version of the hero card. */
export const OG = ['07-hero-card'];

/** A still of FabricTriangle.tsx: same node and leg coordinates, amber legs, one caption. */
function topology(orient) {
  const NODES = [
    { x: 160, y: 52, title: 'Rank 0', sub: 'API Head', head: true },
    { x: 52, y: 200, title: 'Rank 1', sub: 'Headless' },
    { x: 268, y: 200, title: 'Rank 2', sub: 'Headless' },
  ];
  const LEGS = [
    { a: NODES[0], b: NODES[1], x: 92, y: 122, label: 'Leg A · Rank 0 ⇄ Rank 1' },
    { a: NODES[0], b: NODES[2], x: 228, y: 122, label: 'Leg B · Rank 0 ⇄ Rank 2' },
    { a: NODES[1], b: NODES[2], x: 160, y: 200, label: 'Leg C · Rank 1 ⇄ Rank 2' },
  ];
  const svg = `<svg viewBox="0 0 320 252" style="font-family:var(--sans)">
<g stroke="var(--amber)" stroke-width="3" fill="none">${LEGS.map((l) => `<line x1="${l.a.x}" y1="${l.a.y}" x2="${l.b.x}" y2="${l.b.y}"/>`).join('')}</g>
${NODES.map((n) => `<g><circle cx="${n.x}" cy="${n.y}" r="16" fill="var(--ground)" stroke="var(--fg)" stroke-opacity="0.35" stroke-width="1.5"/><circle cx="${n.x}" cy="${n.y}" r="5" fill="var(--amber)"/>
<text x="${n.x}" y="${n.head ? n.y - 33 : n.y + 32}" text-anchor="middle" fill="var(--fg)" font-size="12" font-weight="700">${n.title}</text>
<text x="${n.x}" y="${n.head ? n.y - 20 : n.y + 45}" text-anchor="middle" fill="var(--muted)" font-size="10.5">${n.sub}</text></g>`).join('')}
${LEGS.map((l) => `<g><rect x="${l.x - 62}" y="${l.y - 10}" width="124" height="20" rx="5" fill="var(--ground)" stroke="var(--amber)" stroke-width="1"/>
<text x="${l.x}" y="${l.y + 4}" text-anchor="middle" fill="var(--amber)" font-size="10.5" font-weight="600">${l.label}</text></g>`).join('')}
</svg>`;
  if (orient === 'portrait') {
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:56px">
<div style="width:880px">${svg}</div>
<div class="label" style="margin:0;text-align:center;max-width:900px">Rank 0 exposes the API; ranks 1 and 2 are headless peers.</div></div>`;
  }
  return `<div style="display:flex;align-items:center;gap:96px">
<div style="width:760px;flex:none">${svg}</div>
<div class="label" style="margin:0">Rank 0 exposes the API; ranks 1 and 2 are headless peers.</div></div>`;
}
