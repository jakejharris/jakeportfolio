#!/usr/bin/env node
// Render the /jspark3/ hub share image at 1200x630.
import { resolve, join } from 'node:path';
import { chromePath, loadPlaywright } from './social/browser.mjs';
import { shell, markSvg } from './social/theme.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const image = join(root, 'public/og/jspark3-hub-v2.png');
const body = `
  <div class="message">
    <div class="kicker">MODEL SERVING · DGX SPARK</div>
    <h1>One model server<br><span>on three DGX Sparks.</span></h1>
    <div class="rule"></div>
    <p>JSpark3 brings three machines together<br>to serve one model.</p>
  </div>
  <div class="hero-mark">${markSvg()}</div>`;
const html = shell({ cardId: 'hub', orient: 'og', body, receipt: '' })
  .replace('</style>', `
    .card[data-card="hub"]{position:relative;padding:54px 66px 52px;background:#0a0a0a}
    .card[data-card="hub"] header{position:relative;z-index:1;gap:12px}
    .card[data-card="hub"] header svg{width:44px;height:44px}
    .card[data-card="hub"] header .word{font-size:42px}
    .card[data-card="hub"] main{position:relative;z-index:1;justify-content:center}
    .card[data-card="hub"] .message{position:relative;z-index:2}
    .card[data-card="hub"] .kicker{font:600 17px/1.2 var(--mono);letter-spacing:.12em;color:var(--amber);margin-bottom:24px}
    .card[data-card="hub"] h1{font:700 65px/1.04 var(--sans);letter-spacing:-.045em;color:var(--fg)}
    .card[data-card="hub"] h1 span{color:var(--amber)}
    .card[data-card="hub"] .rule{width:74px;height:3px;background:var(--amber);margin:30px 0 22px}
    .card[data-card="hub"] p{font:400 23px/1.35 var(--sans);color:var(--muted)}
    .card[data-card="hub"] .hero-mark{position:absolute;right:-130px;top:24px;width:450px;height:450px;color:var(--amber);opacity:.14;transform:rotate(-15deg)}
    .card[data-card="hub"] .hero-mark svg{width:100%;height:100%}
    .card[data-card="hub"] footer{position:relative;z-index:1;justify-content:flex-end;font-size:18px}
    .card[data-card="hub"] footer .receipt{display:none}
  </style>`);

const { chromium } = loadPlaywright(root);
const browser = await chromium.launch({ executablePath: chromePath() });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: image, clip: { x: 0, y: 0, width: 1200, height: 630 } });
} finally {
  await browser.close();
}
console.log(image);
