#!/usr/bin/env node
// Render the JSpark3 stat images for X from scripts/social/cards.mjs.
//
//   node scripts/render-social.mjs            # all cards, landscape + the portrait pair
//   node scripts/render-social.mjs 02 06      # only the cards whose id starts with these
//
// Output: .social-out/<id>.png (1600x900), .social-out/<id>-portrait.png (1080x1350),
// .social-out/<id>-og.png (1200x630) for the hero card, and .social-out/thumbs/<id>.png scaled to 500px wide for the timeline check.
// The selected hero OG is also copied to public/og/jspark3.png.
//
// Playwright is not a dependency of this repo. The script looks for playwright-core
// in node_modules, then in $PLAYWRIGHT_CORE, then in the shared /tmp/fleet/pw install,
// and drives whichever Chromium ~/.cache/ms-playwright holds ($CHROME_PATH overrides).
import { createRequire } from 'node:module';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { CARDS, OG, PORTRAIT } from './social/cards.mjs';
import { shell } from './social/theme.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const out = join(root, '.social-out');
const thumbs = join(out, 'thumbs');
const publicOg = join(root, 'public', 'og', 'jspark3.png');
mkdirSync(thumbs, { recursive: true });

function loadPlaywright() {
  const require = createRequire(join(root, 'package.json'));
  const candidates = ['playwright-core', 'playwright', process.env.PLAYWRIGHT_CORE, '/tmp/fleet/pw/node_modules/playwright-core'].filter(Boolean);
  for (const c of candidates) {
    try { return require(c); } catch {}
  }
  throw new Error('playwright-core not found; set PLAYWRIGHT_CORE to an installed copy');
}

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = join(homedir(), '.cache', 'ms-playwright');
  const dirs = existsSync(cache) ? readdirSync(cache).filter((d) => d.startsWith('chromium-')).sort() : [];
  for (const d of dirs.reverse()) {
    const p = join(cache, d, 'chrome-linux', 'chrome');
    if (existsSync(p)) return p;
  }
  return undefined; // let Playwright use its own default
}

/** Every literal a card cites must appear in content.ts, verbatim. */
function checkSources(cards) {
  const content = readFileSync(join(root, 'app/(site)/jspark3/content.ts'), 'utf8');
  const missing = [];
  for (const c of cards) for (const s of c.sources) if (!content.includes(s)) missing.push(`${c.id}: ${s}`);
  if (missing.length) throw new Error(`figures not found in content.ts:\n  ${missing.join('\n  ')}`);
  for (const c of cards) {
    const text = c.receipt + c.body({ orient: 'landscape' });
    if (text.includes('—')) throw new Error(`${c.id}: em dash in copy`);
  }
}

const SIZES = { landscape: [1600, 900], portrait: [1080, 1350], og: [1200, 630] };

async function render(page, card, orient) {
  const [w, h] = SIZES[orient];
  const html = shell({ cardId: card.id, orient, body: card.body({ orient }), receipt: card.receipt });
  const suffix = orient === 'landscape' ? '' : `-${orient}`;
  const file = join(out, `${card.id}${suffix}.png`);
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: w, height: h } });
  if (orient === 'og' && card.id === '07-hero-card') {
    mkdirSync(dirname(publicOg), { recursive: true });
    copyFileSync(file, publicOg);
  }
  // timeline thumbnail: 500px wide
  const scale = 500 / w;
  await page.setViewportSize({ width: 500, height: Math.round(h * scale) });
  await page.evaluate((s) => { document.body.style.zoom = String(s); }, scale);
  await page.screenshot({ path: join(thumbs, `${card.id}${suffix}.png`) });
  return file;
}

const filter = process.argv.slice(2);
const cards = CARDS.filter((c) => !filter.length || filter.some((f) => c.id.startsWith(f)));
checkSources(cards);

const { chromium } = loadPlaywright();
const browser = await chromium.launch({ executablePath: chromePath() });
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const card of cards) {
  console.log(await render(page, card, 'landscape'));
  if (PORTRAIT.includes(card.id)) console.log(await render(page, card, 'portrait'));
  if (OG.includes(card.id)) console.log(await render(page, card, 'og'));
}
await browser.close();
