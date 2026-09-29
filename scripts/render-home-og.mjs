#!/usr/bin/env node
// Render the homepage share card: the headshot beside the name, 1200x630.
//
//   node scripts/render-home-og.mjs
//
// Reads public/images/jake-harris.jpg and writes public/og/jake-harris.jpg, which the
// site layout's Open Graph and Twitter metadata point at. Playwright and Chromium are
// found by scripts/social/browser.mjs.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromePath, loadPlaywright } from './social/browser.mjs';
import { INK, fontCss } from './social/theme.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const photo = readFileSync(join(root, 'public/images/jake-harris.jpg')).toString('base64');
const out = join(root, 'public/og/jake-harris.jpg');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${fontCss()}
*{box-sizing:border-box;margin:0;padding:0}
body{width:1200px;height:630px;background:${INK.ground};color:${INK.fg};font-family:"Geist",sans-serif;-webkit-font-smoothing:antialiased}
.card{display:grid;grid-template-columns:630px 1fr;width:1200px;height:630px;overflow:hidden}
.photo{width:630px;height:630px;object-fit:cover;display:block}
.text{position:relative;display:flex;flex-direction:column;justify-content:center;padding:0 56px 0 60px}
.mark{position:absolute;top:56px;left:60px;width:14px;height:14px;background:${INK.amber}}
h1{font-family:"Sentient",Georgia,serif;font-weight:700;font-size:84px;line-height:.95;letter-spacing:-.01em}
.role{margin-top:28px;font-size:30px;line-height:1.25;font-weight:500}
.what{margin-top:14px;font-size:22px;line-height:1.4;color:${INK.muted}}
.site{position:absolute;left:60px;bottom:52px;font-family:"Geist Mono",monospace;font-size:20px;color:${INK.muted}}
.checks{position:absolute;right:0;bottom:0;width:144px;height:144px;opacity:.5;
  background-image:conic-gradient(${INK.rule} 25%,transparent 0 50%,${INK.rule} 0 75%,transparent 0);background-size:36px 36px}
</style></head><body><div class="card">
<img class="photo" src="data:image/jpeg;base64,${photo}" alt="">
<div class="text">
  <div class="mark"></div>
  <h1>Jake Harris</h1>
  <p class="role">Software engineer</p>
  <p class="what">Agent systems and JSPARK3, open serving recipes for NVIDIA DGX Spark.</p>
  <p class="site">jakejh.com</p>
  <div class="checks"></div>
</div></div></body></html>`;
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
