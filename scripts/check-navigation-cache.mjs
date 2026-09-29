// Integration test with a synthetic CMS, isolated copy of the production build,
// and ephemeral local credentials. Never sends a mutation to a real CMS.
// node scripts/check-navigation-cache.mjs /tmp/navigation-cache-check [3873]
// NAV_BROWSER_CHECKS=1 adds returning-reader and standalone HTML syntax checks.
// NAV_OUTAGE_CHECKS=1 tests a real ISR interval and cold-slug recovery on failure.
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { cp, mkdir, readFile, writeFile, symlink, open } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [output, port = '3873'] = process.argv.slice(2);
assert(output && path.isAbsolute(output), 'Supply an absolute output directory outside the repository');
const root = process.cwd();
assert(!path.resolve(output).startsWith(root + path.sep), 'Keep test artifacts outside the repository');
const base = `http://127.0.0.1:${port}`;
await mkdir(output, { recursive: true });
const build = path.join(output, 'site');
await mkdir(build); // A new directory per run preserves previous evidence.
await cp('.next', path.join(build, '.next'), { recursive: true,
  filter: (source) => path.resolve(source) !== path.resolve('.next/cache'),
});
for (const file of ['next.config.js', 'package.json']) await cp(file, path.join(build, file));
for (const folder of ['node_modules', 'public']) await symlink(path.join(root, folder), path.join(build, folder));
const statePath = path.join(output, 'cms-state.json');
const readsPath = path.join(output, 'cms-reads.jsonl');
const state = (version, count, extra = {}) => writeFile(statePath, JSON.stringify({ version, count, ...extra }));
await state('one', 41);
await writeFile(readsPath, '');
const secret = 'ab'.repeat(32);
const log = await open(path.join(output, 'server.log'), 'w');
const server = spawn(process.execPath, [
  '--require', fileURLToPath(new URL('./fixtures/navigation-cms.cjs', import.meta.url)),
  path.join(root, 'node_modules/next/dist/bin/next'), 'start', build, '-p', port,
], {
  env: { ...process.env, NEXT_PUBLIC_SANITY_PROJECT_ID: 'q1u033fj', NEXT_TELEMETRY_DISABLED: '1',
    NAV_CMS_STATE: statePath, NAV_CMS_READS: readsPath,
    SANITY_API_READ_TOKEN: 'local-fixture-only', SANITY_API_WRITE_TOKEN: 'local-fixture-only', SANITY_WEBHOOK_SECRET: 'local-fixture-webhook',
    DRAFTS_PASSCODE: 'local-fixture-passcode', DRAFTS_COOKIE_SECRET: secret,
    VIEWADMIN_TOKEN: 'local-fixture-admin', VIEW_WRITES_ENABLED: '1',
  }, stdio: ['ignore', log.fd, log.fd],
});
const get = async (route, headers) => {
  const response = await fetch(base + route, { headers });
  return { status: response.status, cache: response.headers.get('x-nextjs-cache'),
    policy: response.headers.get('cache-control'), body: await response.text() };
};
const invalidate = async (type = 'post') => {
  const response = await fetch(base + '/api/revalidate/', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-webhook-secret': 'local-fixture-webhook' }, body: JSON.stringify({ _type: type }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).revalidated, type !== 'postView');
};
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error('Test server exited; inspect server.log');
    try { ready = (await fetch(base + '/robots.txt')).ok; } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(ready, 'Test server did not start');
  // Exercise new slugs absent from generateStaticParams as well as the home page.
  const post = '/posts/navigation-cache-fixture/';
  const routes = ['/', post, '/tags/navigation-cache-fixture/'];
  await invalidate();
  for (const route of routes) {
    assert.equal((await get(route)).status, 200);
    const cached = await get(route);
    assert.equal(cached.cache, 'HIT', route);
    assert.match(cached.body, /Published one/, route);
    assert.match(cached.policy, /s-maxage=60/, route);
  }
  // The number is a client prop; the HTML waits for stored maxima before painting it.
  assert.match((await get(post, { RSC: '1' })).body, /"initialCount":41/);
  await state('two', 99);
  await invalidate('postView');
  for (const route of routes) {
    const unchanged = await get(route);
    assert.equal(unchanged.cache, 'HIT', 'View writes invalidated the content cache');
    assert.match(unchanged.body, /Published one/);
  }
  assert.match((await get(post)).body, /Published body one/, 'Content changed without cache invalidation');
  // Admin must bypass the public view-count snapshot even while the page is cached.
  const admin = await get('/api/viewadmin/', { authorization: 'Bearer local-fixture-admin' });
  assert.equal(admin.status, 200);
  assert.equal(JSON.parse(admin.body)[0].liveViewCount, 99);
  await invalidate();
  for (const route of routes) {
    const fresh = await get(route);
    assert.match(fresh.body, /Published two/, `Webhook left stale content at ${route}`);
  }
  assert.match((await get(post)).body, /Published body two/, 'Post body survived global content invalidation');
  // Sign only the local fixture's auth cookie and use its build preview cookie.
  const manifest = JSON.parse(await readFile(path.join(build, '.next/prerender-manifest.json'), 'utf8'));
  const expiry = Math.floor(Date.now() / 1000) + 600;
  const signature = createHmac('sha256', Buffer.from(secret, 'hex')).update(`cookie:${expiry}`).digest('hex');
  const bypass = `__prerender_bypass=${manifest.preview.previewModeId}`;
  const headers = { cookie: `${bypass}; __Host-drafts_auth=v1.${expiry}.${signature}` };
  const preview = await get(post, headers);
  assert.match(preview.body, /Secret draft body two/);
  assert.match(preview.policy, /private.*no-store/);
  await state('three', 101);
  assert.match((await get(post, headers)).body, /Secret draft body three/, 'Draft fetch was cached');
  for (const cookie of ['', bypass, `${bypass}; __Host-drafts_auth=invalid`]) {
    const published = await get(post, { cookie });
    assert.doesNotMatch(published.body, /Secret draft body|Private draft/, 'Draft leaked into published response');
  }
  const readLog = await readFile(readsPath, 'utf8');
  assert.match(readLog, /"draft":true/, 'Fixture never exercised the draft perspective');
  console.log('Published ISR, new slugs, post-body webhook refresh, live admin counts and authenticated draft isolation passed.');

  if (process.env.NAV_BROWSER_CHECKS === '1') {
    await state('reader', 500, { html: true });
    await invalidate('views');
    await get('/'); await get(post);
    await state('reader', 600, { html: true });
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 },
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      });
      await context.addInitScript(() => {
        window.seenCounts = [];
        new MutationObserver(() => {
          for (const element of document.querySelectorAll('main div')) {
            const match = element.textContent.match(/^(\d+) views$/);
            if (match) window.seenCounts.push(Number(match[1]));
          }
        }).observe(document, { childList: true, subtree: true, characterData: true });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const card = () => page.locator('a[aria-label="View Published reader"]').first();
      const count = () => page.getByText(/^\d+ views$/).first();
      const waitCount = (value) => page.waitForFunction((n) => [...document.querySelectorAll('main div')].some((el) => el.textContent === `${n} views`), value);
      await page.goto(base, { waitUntil: 'networkidle' });
      const homeBefore = (await card().locator('div.ms-4').innerText()).trim();
      await card().click();
      await waitCount(601);
      // Only this HTML grammar is present; no JSX/TSX/PHP alias side effects.
      await page.locator('pre code .token').first().waitFor();
      assert.match(await page.locator('pre').first().textContent(), /Hello/);
      await page.locator('a[aria-label="Jake Harris — home"]:visible').first().click();
      await page.waitForURL(base + '/');
      const homeAfter = (await card().locator('div.ms-4').innerText()).trim();
      await card().click();
      await waitCount(601);
      const seen = await page.evaluate(() => window.seenCounts);
      assert(seen.includes(601));
      assert(seen.slice(seen.indexOf(601)).every((value) => value >= 601), 'A stale number flashed after returning');
      await page.reload({ waitUntil: 'networkidle' });
      await waitCount(601);
      assert((await page.evaluate(() => window.seenCounts)).every((value) => value >= 601), 'A stale number flashed on reload');
      assert.equal(JSON.parse(await readFile(statePath, 'utf8')).count, 601, 'The dedupe window issued another write');
      assert.deepEqual(errors, []);
      console.log(`Returning reader: home ${homeBefore} → post 601 → home ${homeAfter} → post ${await count().innerText()} → reload 601; one increment; no stale-number flash; HTML tokens present.`);
    } finally {
      await browser.close();
    }
  }

  if (process.env.NAV_OUTAGE_CHECKS === '1') {
    await state('healthy', 500);
    await invalidate('views');
    await get(post);
    assert.match((await get(post, { RSC: '1' })).body, /"initialCount":500/);
    await state('outage', 700, { viewFail: true });
    const cold = '/posts/navigation-outage-fixture/';
    assert.equal((await get(cold)).status, 500, 'Cold slug cached a fallback instead of failing');
    console.log('Cold slug fails safely. Waiting for the real 60-second ISR interval.');
    await new Promise((resolve) => setTimeout(resolve, 62000));
    await get(post); // Start the failing background refresh.
    await new Promise((resolve) => setTimeout(resolve, 15000));
    assert.match((await get(post, { RSC: '1' })).body, /"initialCount":500/, 'Failed refresh replaced the last good count');
    await state('recovered', 700);
    const recovered = await get(cold, { RSC: '1' });
    assert.equal(recovered.status, 200);
    assert.match(recovered.body, /"initialCount":700/, 'Cold fallback was cached across recovery');
    console.log('View-read failure: previous ISR snapshot stays 500; cold slug recovers to 700 without a cached baseline.');
  }
} finally {
  server.kill('SIGTERM');
  await new Promise((resolve) => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
  await log.close();
}
