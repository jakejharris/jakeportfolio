// Production-only idle benchmark. Pass one or two origins and a sample count:
// node scripts/bench-water.mjs http://localhost:3851 http://localhost:3852 3
// Two origins run in alternating order. Chrome phone, DPR 3, CPU 4x.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const origins = process.argv.slice(2).filter((value) => value.startsWith('http'));
const runs = Number(process.argv.at(-1));
assert(origins.length && Number.isInteger(runs) && runs > 0);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const samples = [];
try {
  for (let run = 0; run < runs; run++) {
    for (const origin of run % 2 ? [...origins].reverse() : origins) {
      for (const path of ['/', '/posts/joining-docusign/']) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 },
          deviceScaleFactor: 3, isMobile: true, hasTouch: true });
        await context.addInitScript(() => {
          localStorage.setItem('theme', 'dark');
          localStorage.setItem('accent-index', '4');
          window.waterWrites = 0;
          const original = CanvasRenderingContext2D.prototype.putImageData;
          CanvasRenderingContext2D.prototype.putImageData = function (...args) {
            if (this.canvas.matches('[class*="fluid-canvas"], .pixel-shore-canvas')) window.waterWrites++;
            return original.apply(this, args);
          };
          window.waterTasks = [];
          new PerformanceObserver((list) => window.waterTasks.push(...list.getEntries().map(
            ({ startTime, duration }) => ({ startTime, duration })))).observe({ type: 'longtask' });
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await cdp.send('Performance.enable');
        await page.goto(origin + path, { waitUntil: 'networkidle' });
        await page.waitForTimeout(path === '/' ? 15000 : 6000);
        const read = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(
          ({ name, value }) => [name, value]));
        const before = await read();
        const start = await page.evaluate(() => {
          window.waterWrites = 0;
          return performance.now();
        });
        await page.waitForTimeout(5000);
        const after = await read();
        const drawn = await page.evaluate((start) => ({ writes: window.waterWrites,
          longTasks: window.waterTasks.filter((task) => task.startTime >= start),
          elapsedMs: performance.now() - start }), start);
        const seconds = after.Timestamp - before.Timestamp;
        samples.push({ origin, path, run, ...drawn,
          taskMsPerSecond: (after.TaskDuration - before.TaskDuration) * 1000 / seconds,
          scriptMsPerSecond: (after.ScriptDuration - before.ScriptDuration) * 1000 / seconds,
          layoutMsPerSecond: (after.LayoutDuration - before.LayoutDuration) * 1000 / seconds,
          styleMsPerSecond: (after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000 / seconds,
          writesPerSecond: drawn.writes / seconds, errors });
        assert.deepEqual(errors, []);
        await context.close();
      }
    }
  }
} finally {
  console.log(JSON.stringify({ browser: browser.version(), cpu: 4, samples }, null, 2));
  await browser.close();
}
