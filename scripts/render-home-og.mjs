#!/usr/bin/env node
// Render the text-only homepage share card, 1200x630.
//
//   node scripts/render-home-og.mjs
//
// Writes public/og/jake-harris-ml-researcher.jpg for Open Graph and Twitter.
// Playwright and Chromium are found by scripts/social/browser.mjs.
import { join, resolve } from 'node:path';
import { chromePath, loadPlaywright } from './social/browser.mjs';
import { INK, fontCss } from './social/theme.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const out = join(root, 'public/og/jake-harris-ml-researcher.jpg');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${fontCss()}
*{box-sizing:border-box;margin:0;padding:0}
body{width:1200px;height:630px;background:${INK.ground};color:${INK.fg};font-family:"Geist",sans-serif;-webkit-font-smoothing:antialiased}
.card{position:relative;display:flex;flex-direction:column;justify-content:center;width:1200px;height:630px;padding:0 80px;overflow:hidden}
.mark{position:absolute;top:60px;left:80px;width:14px;height:14px;background:${INK.amber}}
h1{font-family:"Sentient",Georgia,serif;font-weight:700;font-size:112px;line-height:1;letter-spacing:-.01em}
.role{margin-top:28px;font-size:38px;line-height:1.25;font-weight:500}
.site{position:absolute;left:80px;bottom:56px;font-family:"Geist Mono",monospace;font-size:20px;color:${INK.muted}}
.checks{position:absolute;right:0;bottom:0;width:144px;height:144px;opacity:.5;
  background-image:conic-gradient(${INK.rule} 25%,transparent 0 50%,${INK.rule} 0 75%,transparent 0);background-size:36px 36px}
</style></head><body><div class="card">
  <div class="mark"></div>
  <h1>Jake Harris</h1>
  <p class="role">ML Researcher</p>
  <p class="site">jakejh.com</p>
  <div class="checks"></div>
</div></body></html>`;
if (html.includes('\u2014')) throw new Error('em dash in card copy');

const { chromium } = loadPlaywright(root);
const browser = await chromium.launch({ executablePath: chromePath() });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
  console.log(`wrote ${out}`);
} finally {
  await browser.close();
}
