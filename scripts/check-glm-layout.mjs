#!/usr/bin/env node
// Check the rendered release at narrow, tablet and desktop widths. Start the site first:
//   node scripts/check-glm-layout.mjs --base-url http://127.0.0.1:3457 --out /tmp/glm-layout
// Uses the same optional Playwright install/Chromium lookup as the share renderer.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { chromePath, loadPlaywright } from './social/browser.mjs';

const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
if (!args.includes('--base-url') || !args.includes('--out')) throw new Error('Pass --base-url and --out');
const base = new URL(option('--base-url'));
const output = resolve(option('--out'));
mkdirSync(output, { recursive: true });
const { chromium } = loadPlaywright(process.cwd());
const browser = await chromium.launch({ executablePath: chromePath() });
const result = { browser: browser.version(), base: base.origin, errors: [], widths: [] };
try {
  for (const width of [320, 390, 520, 521, 768, 800, 801, 900, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 }, deviceScaleFactor: 1 });
    page.on('pageerror', error => result.errors.push({ width, message: error.message }));
    // Do not send analytics or API mutations while checking rendering.
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.origin === base.origin && !url.pathname.startsWith('/api/') ? route.continue() : route.abort();
    });
    await page.goto(new URL('/jspark3/glm/', base).href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const measured = await page.evaluate(() => {
      const main = document.querySelector('.glm2');
      if (!main) throw new Error('GLM facts page did not render');
      const cards = '.glm2-variant, .glm2-defs, .glm-chart, .glm-figure, .glm-tile, .glm2-issues li';
      const excluded = 'pre, svg, .glm-sr-only, .jsv-sr-only, [hidden]';
      const failures = [];
      let fragments = 0;
      let columnFragments = 0;
      let elements = 0;
      const box = element => {
        const rect = element.getBoundingClientRect();
        const css = getComputedStyle(element);
        return {
          left: rect.left + parseFloat(css.borderLeftWidth) + parseFloat(css.paddingLeft),
          right: rect.right - parseFloat(css.borderRightWidth) - parseFloat(css.paddingRight),
          top: rect.top + parseFloat(css.borderTopWidth) + parseFloat(css.paddingTop),
          bottom: rect.bottom - parseFloat(css.borderBottomWidth) - parseFloat(css.paddingBottom),
        };
      };
      const check = (rect, limit, element, kind, text) => {
        // Glyph bounds can exceed a deliberately tight line box vertically; columns constrain horizontal flow.
        if (rect.left < limit.left - 1 || rect.right > limit.right + 1 || (kind.startsWith('card ') && (rect.top < limit.top - 1 || rect.bottom > limit.bottom + 1))) {
          failures.push({ kind, container: element.id || element.className || element.tagName, text: text.trim().slice(0, 120), rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }, limit });
        }
      };
      for (const element of main.querySelectorAll('.glm-bar > *, .glm2-variant dd, .glm2-defs dd, .glm2-nobreak, .glm2-disk li, .glm2-costs dd > span')) {
        if (!element.checkVisibility() || element.closest(excluded)) continue;
        const card = element.closest(cards);
        if (!card) continue;
        elements++;
        check(element.getBoundingClientRect(), box(card), card, 'card element', element.textContent);
      }
      const walk = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walk.nextNode())) {
        if (!node.textContent.trim()) continue;
        const parent = node.parentElement;
        if (!parent || parent.closest(excluded) || !parent.checkVisibility()) continue;
        const card = parent.closest(cards);
        if (!card) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const column = parent.closest('dd, .glm-bar-value, .glm-bar-name');
        for (const rect of range.getClientRects()) {
          if (!rect.width || !rect.height) continue;
          fragments++;
          check(rect, box(card), card, 'card text', node.textContent);
          if (column) {
            columnFragments++;
            check(rect, box(column), column, 'column text', node.textContent);
          }
        }
      }
      // Border boxes alone cannot catch nowrap text leaking out of its grid cell (the original tablet defect).
      const absent = [...main.querySelectorAll('.glm2-set-rows .glm-bar[data-state="absent"] .glm-bar-value')].map(element => ({
        text: element.textContent, width: element.clientWidth, scroll: element.scrollWidth,
      }));
      for (const label of absent) if (label.scroll > label.width + 1) failures.push({ kind: 'absent value overflow', ...label });
      const documentWidth = document.scrollingElement.scrollWidth;
      if (documentWidth > innerWidth) failures.push({ kind: 'viewport', documentWidth, viewport: innerWidth });
      const badImages = [...main.querySelectorAll('img')].filter(img => !img.complete || !img.naturalWidth).map(img => img.getAttribute('src'));
      const code = [...main.querySelectorAll('#known-issue-15 code')].map(element => element.textContent);
      if (!code.includes('prompt_tokens_details.cached_tokens')) failures.push({ kind: 'copied code changed', code });
      return { width: innerWidth, documentWidth, cards: main.querySelectorAll(cards).length, elements, fragments, columnFragments, absent, badImages, failures };
    });
    result.widths.push(measured);
    for (const [name, selector] of [
      ['weights', '.glm2-variants'],
      ['sets-reply', '#remeasured-2026-10-03-sets-reply'],
      ['install', '.glm2-costs'],
      ['issue15', '#known-issue-15'],
    ]) await page.locator(selector).screenshot({ path: join(output, `${name}-${width}.png`) });
    console.log(`${measured.failures.length || measured.badImages.length ? 'FAIL' : 'PASS'} ${width}px: document ${measured.documentWidth}px, ${measured.cards} cards, ${measured.elements} elements, ${measured.fragments} text fragments, ${measured.columnFragments} column fragments, ${measured.failures.length} violations`);
    await page.close();
  }
} finally {
  await browser.close();
  writeFileSync(join(output, 'bounds.json'), `${JSON.stringify(result, null, 2)}\n`);
}
if (result.errors.length || result.widths.some(row => row.failures.length || row.badImages.length)) process.exitCode = 1;
