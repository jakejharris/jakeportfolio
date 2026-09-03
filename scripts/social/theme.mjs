// Shared ground, ink and type for the JSpark3 social images.
// Every colour is a token from app/globals.css in dark mode with the amber
// accent (data-accent="4"); nothing here is invented.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const INK = {
  ground: 'hsl(0 0% 3.9%)', // .dark --background
  fg: 'hsl(0 0% 98%)', // .dark --foreground
  muted: 'hsl(0 0% 63.9%)', // .dark --muted-foreground
  rule: 'hsl(0 0% 14.9%)', // .dark --muted
  amber: 'hsl(35 70% 60%)', // .dark[data-accent="4"] --accent-color
  reference: 'hsl(0 0% 28%)', // the other recipe's bar: a neutral grey, no colour
};

const root = resolve(new URL('../..', import.meta.url).pathname);

function fontFace(family, file, weight, mono = false) {
  const buf = readFileSync(resolve(root, file));
  const b64 = buf.toString('base64');
  return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${b64}) format("woff2");font-weight:${weight};font-style:normal;font-display:block;}`;
}

/** The site's stack: Geist Sans for copy, Geist Mono for the receipt, Sentient for the wordmark. */
export function fontCss() {
  return [
    fontFace('Geist', 'node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2', '100 900'),
    fontFace('Geist Mono', 'node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2', '100 900'),
    fontFace('Sentient', 'public/fonts/Sentient-Bold.woff2', '700'),
  ].join('\n');
}

export function baseCss() {
  return `
:root{
  --ground:${INK.ground};--fg:${INK.fg};--muted:${INK.muted};--rule:${INK.rule};
  --amber:${INK.amber};--ref:${INK.reference};
  --sans:"Geist",ui-sans-serif,system-ui,sans-serif;
  --mono:"Geist Mono",ui-monospace,monospace;
  --wordmark:"Sentient",ui-serif,Georgia,serif;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--ground);color:var(--fg);font-family:var(--sans);-webkit-font-smoothing:antialiased}
.card{width:var(--w);height:var(--h);padding:var(--pad);display:flex;flex-direction:column;background:var(--ground);overflow:hidden}
.card main{flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0}

/* corner mark */
.brand{display:flex;align-items:center;gap:var(--brand-gap);color:var(--amber)}
.brand svg{width:var(--mark);height:var(--mark);display:block}
.brand .word{font-family:var(--wordmark);font-weight:700;font-size:var(--word);line-height:1;color:var(--fg);letter-spacing:-0.01em}

/* footer receipt */
footer{display:flex;justify-content:space-between;align-items:baseline;gap:48px;font-family:var(--mono);font-size:var(--receipt);line-height:1.35;color:var(--muted)}
footer .site{flex:none;color:var(--fg)}

/* the number */
.num{font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-0.035em;line-height:0.88;color:var(--amber);font-size:var(--num);white-space:nowrap}
.num .unit{font-size:0.34em;letter-spacing:-0.01em;color:var(--fg);margin-left:0.08em;font-weight:600}
.num--long{font-size:calc(var(--num) * 0.72)}
.label{margin-top:0.55em;font-size:var(--label);line-height:1.15;font-weight:500;color:var(--fg);max-width:100%}
.caption{margin-top:0.5em;font-size:var(--caption);line-height:1.25;color:var(--muted)}
.eyebrow{font-size:var(--caption);line-height:1.2;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted)}

/* bars: flat rectangles, value at the end, nothing else */
.bars{display:flex;flex-direction:column;gap:var(--bar-gap);width:100%}
.bar{display:grid;grid-template-columns:1fr;row-gap:0.28em}
.bar .track{display:flex;align-items:center;gap:0.35em;height:var(--bar-h)}
.bar .fill{height:100%;background:var(--ref);flex:none}
.bar.ours .fill{background:var(--amber)}
.bar .value{font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-0.03em;font-size:var(--bar-val);line-height:1;color:var(--fg);white-space:nowrap}
.bar.ours .value{color:var(--amber)}
.bar .value .unit{font-size:0.5em;font-weight:600;color:var(--muted);margin-left:0.12em;letter-spacing:0}
.bar .who{font-size:var(--caption);color:var(--muted);line-height:1.2}

/* four-segment strip for the aggregate card */
.segs{display:flex;gap:10px;width:100%;margin-top:var(--seg-top)}
.seg{flex:1}
.seg .fill{height:var(--seg-h);background:var(--amber)}
.seg .v{margin-top:0.4em;font-variant-numeric:tabular-nums;font-size:var(--caption);color:var(--muted)}

/* hero grid card */
.grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--grid-gap)}
.grid .cell .num{font-size:var(--grid-num)}
.grid .cell .label{font-size:var(--grid-label);margin-top:0.45em;font-weight:500}
.tagline{font-size:var(--label);font-weight:500;line-height:1.15;margin-bottom:var(--grid-gap)}

/* hero copy experiments: card-scoped so the original series does not move */
.card[data-card="07-hero-card"] .eyebrow,.card[data-card="07-hero-card-vb"] .eyebrow{font-size:var(--eyebrow,22px);margin-bottom:var(--eyebrow-gap,12px)}
.card[data-card="07-hero-card"] .comparison,.card[data-card="07-hero-card-vb"] .comparison{margin-top:var(--cmp-gap,10px);font-size:var(--cmp,24px);line-height:1.2;color:var(--muted);white-space:nowrap}
.card[data-card="07-hero-card"] footer,.card[data-card="07-hero-card-vc"] footer{justify-content:flex-end}
.card[data-card="07-hero-card"] footer .receipt,.card[data-card="07-hero-card-vc"] footer .receipt{display:none}

/* landscape 1600x900 */
.card[data-orient="landscape"]{--w:1600px;--h:900px;--pad:88px 96px 80px;--mark:46px;--word:36px;--brand-gap:14px;
  --receipt:21px;--num:330px;--label:46px;--caption:28px;--bar-h:88px;--bar-gap:44px;--bar-val:150px;
  --seg-top:56px;--seg-h:22px;--grid-gap:44px;--grid-num:170px;--grid-label:26px}
/* og 1200x630 */
.card[data-orient="og"]{--w:1200px;--h:630px;--pad:60px 68px 56px;--mark:32px;--word:26px;--brand-gap:10px;
  --receipt:16px;--num:230px;--label:32px;--caption:20px;--bar-h:62px;--bar-gap:30px;--bar-val:104px;
  --seg-top:40px;--seg-h:16px;--grid-gap:30px;--grid-num:120px;--grid-label:18px;--eyebrow:16px;--eyebrow-gap:8px;--cmp:17px;--cmp-gap:7px}
/* portrait 1080x1350 */
.card[data-orient="portrait"]{--w:1080px;--h:1350px;--pad:88px 80px 80px;--mark:46px;--word:36px;--brand-gap:14px;
  --receipt:19px;--num:270px;--label:44px;--caption:27px;--bar-h:96px;--bar-gap:60px;--bar-val:120px;
  --seg-top:64px;--seg-h:26px;--grid-gap:48px;--grid-num:150px;--grid-label:25px}
`;
}

/** The flat JSpark3 mark: three dots on three rods, apex up (JSpark3Mark.tsx geometry). */
export function markSvg() {
  const CX = 20, CY = 22, R = 16.5, DOT = 4.2, ROD = 2.4;
  const pts = [-90, 30, 150].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
  });
  const f = (n) => n.toFixed(2);
  const path = `M${f(pts[0][0])} ${f(pts[0][1])} L${f(pts[1][0])} ${f(pts[1][1])} L${f(pts[2][0])} ${f(pts[2][1])} Z`;
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="${path}" fill="none" stroke="currentColor" stroke-width="${ROD}" stroke-linejoin="round"/>${pts
    .map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${DOT}" fill="currentColor"/>`)
    .join('')}</svg>`;
}

export function shell({ cardId, orient, body, receipt }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss()}${baseCss()}</style></head>
<body><div class="card" data-card="${cardId}" data-orient="${orient}">
<header class="brand">${markSvg()}<span class="word">JSpark3</span></header>
<main>${body}</main>
<footer><span class="receipt">${receipt}</span><span class="site">jakejh.com/jspark3</span></footer>
</div></body></html>`;
}
