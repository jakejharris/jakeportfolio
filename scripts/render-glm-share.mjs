#!/usr/bin/env node
// Render the share card of the current GLM release from its final facts.
//
//   npx tsx scripts/render-glm-share.mjs
//
// Writes public/og/jspark3-glm-<version>.png (1200x630) with the hub card's four figures for the
// default weights, each with its v1.8.4 figure when the facts measured v1.8.4 the same way, and
// records the image with the facts' sha256 in glm-share.json. The page uses the card only while
// that sha matches the synced facts, so a later sync falls back to the hub card until this reruns.
// It refuses while the facts are not final or a figure is missing.
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromePath, loadPlaywright } from './social/browser.mjs';
import { shell } from './social/theme.mjs';
import { FINAL, RELBENCH_LABEL, SOURCE, TILES_LINE, TILE_FIGURES, VERSION, captionTemplate } from '../app/(site)/jspark3/glm-facts.ts';

if (!FINAL) throw new Error('the synced release facts are not final; the page keeps the hub card');
const root = resolve(new URL('..', import.meta.url).pathname);
const escape = text => String(text).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

const cells = TILE_FIGURES.map(({ key, label, unit, set, value, weights, caption }) => {
  if (value.state !== 'value') throw new Error(`${set?.id ?? 'the default set'} has no ${key}`);
  // A concurrency figure carries its condition, as on the hub tile; the card refuses rather than show it bare.
  if (caption?.pending) throw new Error(`${key} needs its condition and the facts have no ${captionTemplate(key)?.template ?? `site_tile_captions.${key}`}`);
  if (weights?.pending) throw new Error(`${key} is from ${set?.id} and its weights have no public label`);
  return { key, label, unit, value: value.slot.text, weights: weights?.text ?? null, caption: caption?.text ?? null };
});
if (!TILES_LINE || TILES_LINE.pending) throw new Error('the facts do not say what the tiles were measured with (site_card_footer_public)');
// Six characters fill a half-width cell. Longer figures step down, all cells together, so none reaches the next column.
// A tile that names its weights takes one more line, so every figure steps down a little to keep the card's height.
const longest = Math.max(...cells.map(item => item.value.length));
const scale = longest > 9 ? 0.5 : longest > 6 ? 0.68 : cells.some(item => item.weights) ? 0.9 : 1;
const size = scale < 1 ? ` style="font-size:calc(var(--grid-num) * ${scale})"` : '';
const tile = item => `<div class="cell"><div class="eyebrow">${escape(item.label)}</div><div class="num"${size}>${escape(item.value)}<span class="unit">${escape(item.unit)}</span></div>${item.weights ? `<div class="label">${escape(item.weights)}</div>` : ''}${item.caption ? `<div class="caption">${escape(item.caption)}</div>` : ''}</div>`;
const line = text => `<div style="margin-top:10px;font-size:18px;font-weight:400;color:var(--muted)">${escape(text)}</div>`;
const body = `<div class="tagline">JSPARK3 ${escape(VERSION.text)}: GLM-5.3 Flash on three DGX Sparks.${line(`Measured with ${TILES_LINE.text}${RELBENCH_LABEL ? `, ${RELBENCH_LABEL.short.text}` : ''}.`)}</div><div class="grid">${cells.map(tile).join('')}</div>`;
if (body.includes('—')) throw new Error('em dash in card copy');
const html = shell({ cardId: '07-hero-card', orient: 'og', body, receipt: '' }).replace('<span class="word">JSpark3</span>', '<span class="word">JSPARK3</span>');

const image = `/og/jspark3-glm-${VERSION.text}.png`;
const { chromium } = loadPlaywright(root);
const browser = await chromium.launch({ executablePath: chromePath() });
const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
// Every line must sit inside the card: nothing clipped by its edge or pushed into the footer.
const clipped = await page.evaluate(() => { const main = document.querySelector('.card main'); return main.scrollHeight > main.clientHeight + 1 || main.scrollWidth > main.clientWidth + 1; });
if (clipped) { await browser.close(); throw new Error('the card copy does not fit 1200x630'); }
await page.screenshot({ path: join(root, 'public', image), clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();

writeFileSync(join(root, 'app/(site)/jspark3/glm-share.json'), `${JSON.stringify({ image, facts_sha256: SOURCE.sha256 }, null, 2)}\n`);
console.log(JSON.stringify({ image, facts_sha256: SOURCE.sha256, tiles: cells.map(item => item.key) }));
