// Production regression checks. Run against a local `next start` after building.
// Uses the matching local .next manifest to verify preview cache isolation.
// PLAYWRIGHT_MODULE / CHROME_PATH select an existing browser installation.
// NAV_BROWSER=webkit runs the same functional checks in WebKit.
// NAV_WEBHOOK_SECRET optionally checks a local webhook's cache invalidation.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:3871';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use a local production server');
const manifest = JSON.parse(readFileSync('.next/prerender-manifest.json', 'utf8'));
const post = '/posts/apres-surf-club/';
const tag = '/tags/web-development/';

for (const path of ['/', post, tag]) {
  const prerender = manifest.routes[path.replace(/\/$/, '') || '/'];
  assert.equal(prerender?.initialRevalidateSeconds, 60, `ISR missing for ${path}`);
  // A stale route can refresh in the background; wait for its next cache hit.
  let response;
  for (let attempt = 0; attempt < 20; attempt++) {
    response = await fetch(base + path);
    await response.text();
    if (response.headers.get('x-nextjs-cache') === 'HIT') break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get('x-nextjs-cache'), 'HIT', path);
  assert.match(response.headers.get('cache-control'), /s-maxage=60/, path);
}

// Even a valid framework preview cookie must never put a response in the public
// route cache, and an invalid application auth cookie must not expose a draft.
const preview = await fetch(base + post, {
  headers: { cookie: `__prerender_bypass=${manifest.preview.previewModeId}; __Host-drafts_auth=invalid` },
});
assert.match(preview.headers.get('cache-control'), /private.*no-store/);
assert.doesNotMatch(await preview.text(), /Draft Preview/);
for (const path of ['/posts/navigation-check-missing/', '/tags/navigation-check-missing/']) {
  assert.equal((await fetch(base + path)).status, 404, path);
}

if (process.env.NAV_WEBHOOK_SECRET) {
  assert.equal((await fetch(base + '/api/revalidate/', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-webhook-secret': 'incorrect' }, body: '{"_type":"post"}',
  })).status, 401);
  const response = await fetch(base + '/api/revalidate/', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-webhook-secret': process.env.NAV_WEBHOOK_SECRET }, body: '{"_type":"post"}',
  });
  assert.equal(response.status, 200);
  for (const path of ['/', post, tag]) {
    const expired = await fetch(base + path);
    assert.notEqual(expired.headers.get('x-nextjs-cache'), 'HIT', `Webhook did not expire ${path}`);
    await expired.text();
  }
}

const playwright = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browserName = process.env.NAV_BROWSER || 'chromium';
const browser = await playwright[browserName].launch(browserName === 'chromium' ? { executablePath: process.env.CHROME_PATH } : {});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base + post, { waitUntil: 'networkidle' });
  // Lazy grammars must still highlight real CMS samples, not just show code.
  await page.locator('pre code span.token').first().waitFor();
  assert(await page.locator('pre code').first().textContent());
  await page.getByRole('button', { name: 'In This Article' }).click();
  // Let the accordion finish changing the target's document position.
  await page.waitForTimeout(350);
  const outline = page.getByRole('navigation', { name: 'Table of contents' });
  const heading = outline.getByRole('button').first();
  const label = (await heading.textContent()).trim();
  await heading.click();
  await page.waitForTimeout(700);
  const target = page.locator('.portable-text :is(h1,h2,h3,h4)').filter({ hasText: label }).first();
  const box = await target.boundingBox();
  assert(box && box.y >= 0 && box.y < 300, 'Outline did not scroll to the heading');
  await page.goto(base, { waitUntil: 'networkidle' });
  const link = page.locator('main a[href^="/posts/"]').first();
  assert((await link.getAttribute('href')).endsWith('/'), 'Post link still has a hash');
  // An ordinary viewport link should obtain a complete RSC payload before click.
  const destination = new URL(await link.getAttribute('href'), base).pathname;
  await page.waitForFunction((path) => performance.getEntriesByType('resource').some((entry) => {
    const url = new URL(entry.name);
    return url.pathname === path && url.searchParams.has('_rsc') && entry.responseEnd > 0;
  }), destination);
  await link.click();
  await page.waitForURL((url) => url.pathname === destination);
  await page.locator('main .portable-text').waitFor();
  await page.goBack();
  await page.locator('#hero-title').waitFor();
  await page.goForward();
  await page.locator('main .portable-text').waitFor();
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
console.log('Navigation cache, preview isolation, missing routes, prefetch, history, outline and syntax checks passed.');
