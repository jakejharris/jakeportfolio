#!/usr/bin/env node
// Render the share card of the current GLM release from its final facts.
//
//   npx tsx scripts/render-glm-share.mjs
//
// Writes public/og/jspark3-glm-<version>.png (1200x630) with the GLM page's hero figures, as the hub's
// latest card shows them (remeasured-figures.ts): each with its label, and the line saying what they were
// measured with. It records the image with the facts' sha256 and the figures in glm-share.json. The page
// uses the card only while both match, so a later sync or a new hero falls back to the hub card until this
// reruns. It refuses while the facts are not final or a figure is missing.
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromePath, loadPlaywright } from './social/browser.mjs';
import { shell } from './social/theme.mjs';
import { FINAL, RELBENCH_LABEL, SOURCE, TILES_LINE, VERSION, captionTemplate } from '../app/(site)/jspark3/glm-facts.ts';
import { HERO_FIGURES, HERO_LINE, HERO_MEASURED, HERO_SIGNATURE, HERO_TILES } from '../app/(site)/jspark3/v2/remeasured-figures.ts';

if (!FINAL) throw new Error('the synced release facts are not final; the page keeps the hub card');
const root = resolve(new URL('..', import.meta.url).pathname);
const escape = text => String(text).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

const cells = [...HERO_FIGURES.map(({ key, label, unit, value, caption }) => ({ key, label, unit, value, weights: null, caption })), ...HERO_TILES.map(({ key, label, unit, set, value, weights, caption }) => {
  if (value.state !== 'value') throw new Error(`${set?.id ?? 'the default set'} has no ${key}`);
  // A concurrency figure carries its condition, as on the hub tile; the card refuses rather than show it bare.
  if (caption?.pending) throw new Error(`${key} needs its condition and the facts have no ${captionTemplate(key)?.template ?? `site_tile_captions.${key}`}`);
  if (weights?.pending) throw new Error(`${key} is from ${set?.id} and its weights have no public label`);
  return { key, label, unit, value: value.slot.text, weights: weights?.text ?? null, caption: caption?.text ?? null };
})];
if (!HERO_LINE && (!TILES_LINE || TILES_LINE.pending)) throw new Error('the facts do not say what the tiles were measured with (site_card_footer_public)');
// Six characters fill a half-width cell. Longer figures step down, all cells together, so none reaches the next column.
// A tile that names its weights takes one more line, so every figure steps down a little to keep the card's height.
const longest = Math.max(...cells.map(item => item.value.length));
const scale = longest > 9 ? 0.5 : longest > 6 ? 0.68 : cells.some(item => item.weights) ? 0.9 : 1;
const size = step => (scale * step < 1 ? ` style="font-size:calc(var(--grid-num) * ${scale * step})"` : '');
const tile = step => item => `<div class="cell"><div class="eyebrow">${escape(item.label)}</div><div class="num"${size(step)}>${escape(item.value)}<span class="unit">${escape(item.unit)}</span></div>${item.weights ? `<div class="label">${escape(item.weights)}</div>` : ''}${item.caption ? `<div class="caption"${step < 1 ? ` style="font-size:calc(var(--caption) * ${Math.max(step, 0.85)})"` : ''}>${escape(item.caption)}</div>` : ''}</div>`;
const line = text => `<div style="margin-top:10px;font-size:18px;font-weight:400;color:var(--muted)">${escape(text)}</div>`;
const measured = HERO_MEASURED ?? `Measured with ${TILES_LINE.text}${RELBENCH_LABEL ? `, ${RELBENCH_LABEL.short.text}` : ''}.`;
// The wordmark row reads JSPARK3; the title names the product as its prose does.
const body = step => `<div class="tagline">JSpark3 ${escape(VERSION.text)}: GLM-5.3 Flash on three DGX Sparks.${line(measured)}</div><div class="grid">${cells.map(tile(step)).join('')}</div>`;
if (body(1).includes(String.fromCodePoint(0x2014))) throw new Error('em dash in card copy');
const html = step => shell({ cardId: '07-hero-card', orient: 'og', body: body(step), receipt: '' }).replace('<span class="word">JSpark3</span>', '<span class="word">JSPARK3</span>');

const image = `/og/jspark3-glm-${VERSION.text}.png`;
const { chromium } = loadPlaywright(root);
const browser = await chromium.launch({ executablePath: chromePath() });
const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.setViewportSize({ width: 1200, height: 630 });
// Every line must sit inside the card: nothing clipped by its edge or pushed into the footer. A figure's label
// is never cut to fit: when the labels take more lines, the figures and labels step down, all together, until they fit.
let fitted = null;
for (const step of [1, 0.9, 0.8, 0.7]) {
  await page.setContent(html(step), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const clipped = await page.evaluate(() => { const main = document.querySelector('.card main'); return main.scrollHeight > main.clientHeight + 1 || main.scrollWidth > main.clientWidth + 1; });
  if (!clipped) { fitted = step; break; }
}
if (fitted === null) { await browser.close(); throw new Error('the card copy does not fit 1200x630'); }
await page.screenshot({ path: join(root, 'public', image), clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();

writeFileSync(join(root, 'app/(site)/jspark3/glm-share.json'), `${JSON.stringify({ image, facts_sha256: SOURCE.sha256, figures: HERO_SIGNATURE }, null, 2)}\n`);
console.log(JSON.stringify({ image, facts_sha256: SOURCE.sha256, tiles: cells.map(item => item.key), figure_scale: scale * fitted }));
