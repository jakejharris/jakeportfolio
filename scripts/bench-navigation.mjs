// Run against `next build && next start`, never the development server.
// node scripts/bench-navigation.mjs http://localhost:3871 5 > /tmp/navigation.json
// Supply PLAYWRIGHT_MODULE / CHROME_PATH when using an existing browser install.
// NAV_POST pins a /posts/slug/ path; NAV_PROFILES=desktop,phone selects profiles.
// Each sample has a fresh browser context and a warmed server route cache.
// The phone models 4x CPU, 150ms RTT, 1.6Mbps down / 750Kbps up, DPR 3.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const [base = 'http://localhost:3871', count = '5'] = process.argv.slice(2);
const runs = Number(count);
assert(Number.isInteger(runs) && runs > 0, 'runs must be a positive integer');
const profiles = {
  desktop: { viewport: { width: 1440, height: 1000 }, cpu: 1 },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, cpu: 4 },
};
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const result = {
  version: 1, date: new Date().toISOString(), base, runs,
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  harnessSha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
  browser: browser.version(), profiles, samples: [],
};
const canonical = (href) => new URL(href, base).pathname.replace(/\/?$/, '/');
const headings = {};

async function setup(name) {
  const { cpu, ...options } = profiles[name];
  assert(options.viewport, `Unknown profile: ${name}`);
  const context = await browser.newContext(options);
  await context.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('accent-index', '4');
    window.navTasks = [];
    new PerformanceObserver((list) => window.navTasks.push(...list.getEntries().map(({ startTime, duration }) => ({ startTime, duration })))).observe({ entryTypes: ['longtask'] });
    window.navStart = 0;
    document.addEventListener('click', (event) => {
      if (event.target.closest('a')) window.navStart = performance.now();
    }, true);
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  if (name === 'phone') await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8, connectionType: 'cellular4g',
  });
  const requests = [];
  page.on('requestfinished', async (request) => {
    const timing = request.timing();
    const response = await request.response();
    requests.push({ url: request.url(), type: request.resourceType(), start: timing.startTime,
      ttfbMs: timing.responseStart >= 0 ? timing.responseStart - Math.max(0, timing.requestStart) : null,
      status: response?.status(), sizes: await request.sizes().catch(() => null) });
  });
  return { context, page, requests, errors };
}

// A paint opportunity after the destination's actual heading is visible, plus
// the page body and menu uncover. This is a DOM/RAF proxy, not a screenshot or LCP.
async function contentTime(page, path, start = 'navigation') {
  return page.evaluate(async ({ path, start, expected }) => {
    const clean = (value) => value.replace(/\/?$/, '/');
    const began = start === 'navigation' ? 0 : window.navStart;
    const deadline = performance.now() + 30000;
    let committed = null;
    const shown = (node) => {
      if (!node || !node.getClientRects().length) return false;
      for (let el = node; el; el = el.parentElement) {
        const style = getComputedStyle(el);
        if (Number(style.opacity) < 0.9 || style.visibility === 'hidden' || style.display === 'none') return false;
      }
      return true;
    };
    while (performance.now() < deadline) {
      const heading = document.querySelector('main h1');
      const ready = clean(location.pathname) === clean(path) && heading?.textContent.trim() === expected;
      if (ready && committed === null) committed = performance.now() - began;
      const body = document.querySelector('main .portable-text') || document.querySelector('main p');
      if (ready && shown(heading) && (!body || shown(body)) && !document.querySelector('main[inert]')) {
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        return { contentMs: performance.now() - began, commitMs: committed, heading: heading.textContent.trim(), start: performance.timeOrigin + began, end: performance.timeOrigin + performance.now(), scrollY };
      }
      await new Promise(requestAnimationFrame);
    }
    throw new Error(`Content timeout: ${path}, current=${location.pathname}`);
  }, { path, start, expected: headings[path] });
}

async function record(state, profile, run, route, mode, timing, since) {
  // Fixed one-second tail captures hydration, images and tasks after first content.
  await state.page.waitForTimeout(1000);
  const end = timing.end + 1000;
  const requests = state.requests.filter((entry) => entry.start >= since && entry.start <= end);
  const target = requests.find((entry) => canonical(entry.url) === route && ['document', 'fetch'].includes(entry.type));
  const tasks = await state.page.evaluate(({ start, end }) => window.navTasks.filter((entry) => {
    const time = performance.timeOrigin + entry.startTime;
    return time >= start && time <= end;
  }), { start: timing.start, end });
  result.samples.push({ profile, run, route, mode, ...timing,
    ttfbMs: target?.ttfbMs ?? null,
    transferredBytes: requests.reduce((sum, entry) => sum + (entry.sizes?.responseBodySize ?? 0) + (entry.sizes?.responseHeadersSize ?? 0), 0),
    longTasks: tasks.length, longTaskMs: tasks.reduce((sum, entry) => sum + entry.duration, 0), requests,
  });
  assert.deepEqual(state.errors, [], `Browser errors on ${route}`);
}

async function link(page, path, mobile) {
  const selector = [...new Set([path, path.replace(/\/$/, ''), `${path}#`, `${path.replace(/\/$/, '')}#`])].map((href) => `a[href="${href}"]`).join(', ');
  let anchor = page.locator(selector).filter({ visible: true }).first();
  if (await anchor.count() === 0 && mobile && ['/', '/about/', '/contact/'].includes(path)) {
    await page.locator('.site-menu-button').tap();
    anchor = page.locator(selector).filter({ visible: true }).first();
  }
  await anchor.waitFor({ state: 'visible' });
  await anchor.scrollIntoViewIfNeeded();
  // A fixed opportunity for normal viewport prefetch; no manual router.prefetch.
  await page.waitForTimeout(2000);
  return anchor;
}

async function navigate(state, profile, run, path, action = 'link') {
  let anchor;
  if (action === 'link') anchor = await link(state.page, path, profile === 'phone');
  const since = Date.now();
  if (anchor) {
    if (profile === 'phone') await anchor.tap(); else await anchor.click();
  } else {
    await state.page.evaluate((direction) => { window.navStart = performance.now(); history[direction](); }, action);
  }
  const timing = await contentTime(state.page, path, 'click');
  await record(state, profile, run, path, action, timing, since);
}

try {
  const discover = await setup('desktop');
  await discover.page.goto(base, { waitUntil: 'networkidle' });
  const post = canonical(process.env.NAV_POST || await discover.page.locator('main a[href^="/posts/"]').first().getAttribute('href'));
  await discover.page.goto(base + post, { waitUntil: 'networkidle' });
  const tag = canonical(await discover.page.locator('main a[href^="/tags/"]').first().getAttribute('href'));
  const routes = ['/', post, tag, '/about/', '/contact/', '/jspark3/'];
  result.routes = routes;
  for (const path of routes) {
    await discover.page.goto(base + path, { waitUntil: 'domcontentloaded' });
    headings[path] = (await discover.page.locator('main h1').first().textContent()).trim();
  }
  result.headings = headings;
  await discover.context.close();
  // Warm each server route independently of the browser cache/profile.
  for (const path of routes) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    await response.arrayBuffer();
  }
  for (const profile of (process.env.NAV_PROFILES || 'desktop,phone').split(',')) {
    for (let run = 0; run < runs; run++) {
      for (const path of routes) {
        const state = await setup(profile);
        const since = Date.now();
        await state.page.goto(base + path, { waitUntil: 'domcontentloaded' });
        await record(state, profile, run, path, 'document', await contentTime(state.page, path), since);
        await state.context.close();
      }
      const state = await setup(profile);
      await state.page.goto(base, { waitUntil: 'networkidle' });
      await state.page.waitForTimeout(2000);
      await navigate(state, profile, run, post);
      await navigate(state, profile, run, tag);
      await navigate(state, profile, run, post, 'back');
      await navigate(state, profile, run, tag, 'forward');
      await navigate(state, profile, run, '/');
      await navigate(state, profile, run, '/about/');
      await navigate(state, profile, run, '/contact/');
      // The hub has no site navigation link in this revision. Its document
      // sample is measured above; do not invent a client link measurement.
      await state.context.close();
      console.error(`completed ${profile} ${run + 1}/${runs}`);
    }
  }
} catch (error) {
  result.failure = error.stack;
  process.exitCode = 1;
} finally {
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}
