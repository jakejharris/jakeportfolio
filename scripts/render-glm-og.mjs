#!/usr/bin/env node
// Render the /jspark3/glm/ share card from the filled glm-release.json.
//
//   node scripts/render-glm-og.mjs
//
// Writes public/og/jspark3-glm-<version>.png (1200x630) and sets social_image in
// glm-release.json, so the page's metadata uses it. It refuses while any headline
// band is still a placeholder, and when the release's own start is missing from the
// numbers: no other start stands in for it. Until it runs, the page keeps the neutral hub card.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromePath, loadPlaywright } from './social/browser.mjs';
import { shell } from './social/theme.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const file = join(root, 'app/(site)/jspark3/glm-release.json');
const text = readFileSync(file, 'utf8');
const glm = JSON.parse(text);
if (glm.placeholder || glm.headline.rows.some((row) => row.lo === null || row.hi === null)) throw new Error('glm-release.json still holds placeholders; fill it first');
if (glm.headline.missing || !glm.headline.rows.length) throw new Error('no measured start of this release is in the numbers; keep the neutral hub card');

// Every digit as written, with a thousands separator; nothing is rounded (release-copy.ts valueText).
const format = (n) => {
  const [whole, fraction] = String(n).split('.');
  return `${whole.replace(/\B(?=(\d{3})+$)/g, ',')}${fraction ? `.${fraction}` : ''}`;
};
const band = (row) => (row.lo === row.hi ? format(row.lo) : `${format(row.lo)}–${format(row.hi)}`);
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const counted = (count, noun) => `${WORDS[count] ?? count} ${noun}${count === 1 ? '' : 's'}`;
const bandLine = `${glm.version} with stock weights: ${counted(glm.headline.serving_starts, 'serving start')}, ${counted(glm.headline.sweeps, 'sweep')}. Each figure is the range across those sweeps.`;
const streams = (c) => (c === 'c1' ? 'one stream' : `${c.slice(1)} streams`);
const rows = glm.headline.rows;
const decode = rows.filter((row) => row.label === 'Decode').sort((a, b) => Number(a.concurrency.slice(1)) - Number(b.concurrency.slice(1)));
// Up to four cells: the single figures (prefill), one-stream decode, then the highest-concurrency decode rows.
const cells = [...new Set([...rows.filter((row) => row.label !== 'Decode').slice(0, 1), decode[0], ...decode.slice(-2)].filter(Boolean))].slice(0, 4);
// Six characters fill a half-width cell. Longer bands step down, all cells together, so none reaches the next column.
const longest = Math.max(...cells.map((row) => band(row).length));
const scale = longest > 9 ? 0.5 : longest > 6 ? 0.68 : 1;
const size = scale < 1 ? ` style="font-size:calc(var(--grid-num) * ${scale})"` : '';
const cell = (row) => {
  const label = row.label === 'Decode' && row.concurrency !== 'c1' ? `Decode · ${streams(row.concurrency)}, all combined` : `${row.label} · ${streams(row.concurrency)}`;
  const comparison = row.v1_1 === null ? '' : `v1.1: ${format(row.v1_1)} ${row.unit}`;
  return `<div class="cell"><div class="eyebrow">${label}</div><div class="num"${size}>${band(row)}<span class="unit">${row.unit}</span></div><div class="comparison">${comparison}</div></div>`;
};
const title = glm.name ? `JSPARK3 ${glm.version} ${glm.name}` : `JSPARK3 ${glm.version}`;
const body = `<div class="tagline">${title}: GLM-5.3 Flash on three DGX Sparks.<div style="margin-top:10px;font-size:18px;font-weight:400;color:var(--muted)">${bandLine}</div></div><div class="grid">${cells.map(cell).join('')}</div>`;
if (body.includes('—')) throw new Error('em dash in card copy');
// The shared shell keeps the original series' wordmark; this card uses the current casing.
const html = shell({ cardId: '07-hero-card', orient: 'og', body, receipt: '' }).replace('<span class="word">JSpark3</span>', '<span class="word">JSPARK3</span>');

const image = `/og/jspark3-glm-${glm.version}.png`;
const { chromium } = loadPlaywright(root);
const browser = await chromium.launch({ executablePath: chromePath() });
const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(root, 'public', image), clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();

writeFileSync(file, text.replace(/"social_image": (null|"[^"]*")/, `"social_image": "${image}"`));
console.log(JSON.stringify({ image, cells: cells.map((row) => row.id) }));
