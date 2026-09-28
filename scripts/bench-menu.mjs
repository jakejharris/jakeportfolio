// Phone menu timings against a production build, with no other browsers/builds running.
// node scripts/bench-menu.mjs http://localhost:3871 / 5
// PLAYWRIGHT_MODULE and CHROME_PATH select the local browser installation.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const [base = "http://localhost:3871", path = "/", runs = "5"] = process.argv.slice(2);
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3,
    isMobile: true, hasTouch: true,
  });
  await context.addInitScript(() => {
    localStorage.setItem("theme", "dark");
    localStorage.setItem("accent-index", "4");
    window.recordMenu = false;
    window.menuFrames = [];
    window.menuTasks = [];
    const tick = (time) => {
      if (window.recordMenu) window.menuFrames.push(time);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    new PerformanceObserver((list) => {
      if (window.recordMenu) window.menuTasks.push(...list.getEntries().map((e) => e.duration));
    }).observe({ entryTypes: ["longtask"] });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base + path, { waitUntil: "networkidle" });
  if (process.env.MENU_BENCH_CSS) await page.addStyleTag({ content: process.env.MENU_BENCH_CSS });
  await page.waitForTimeout(3500);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const metrics = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const button = page.locator(".site-menu-button");
  const result = { base, path, runs: Number(runs), cpu: 4, dpr: 3, open: [], close: [] };
  for (let run = 0; run < Number(runs); run++) {
    for (const phase of ["open", "close"]) {
      await page.evaluate(() => { window.menuFrames = []; window.menuTasks = []; window.recordMenu = true; });
      const before = await metrics();
      await button.tap();
      await page.waitForTimeout(phase === "open" ? 700 : 600);
      const after = await metrics();
      const { frames, tasks } = await page.evaluate(() => {
        window.recordMenu = false;
        return { frames: window.menuFrames, tasks: window.menuTasks };
      });
      const gaps = frames.slice(1).map((time, i) => time - frames[i]).sort((a, b) => a - b);
      const round = (n) => Math.round(n * 10) / 10;
      result[phase].push({
        frames: frames.length,
        p95Ms: round(gaps[Math.floor(gaps.length * 0.95)] || 0),
        maxMs: round(gaps.at(-1) || 0),
        // Avoid counting floating point noise around a two-refresh (33.33ms) frame.
        over34: gaps.filter((gap) => gap > 34).length,
        taskMs: round((after.TaskDuration - before.TaskDuration) * 1000),
        styleLayoutMs: round((after.RecalcStyleDuration - before.RecalcStyleDuration + after.LayoutDuration - before.LayoutDuration) * 1000),
        longTasksMs: tasks.map(round),
      });
      await page.waitForTimeout(900);
    }
  }
  const idle = async () => {
    const before = await metrics();
    await page.waitForTimeout(4000);
    const after = await metrics();
    return Math.round((after.TaskDuration - before.TaskDuration) / (after.Timestamp - before.Timestamp) * 10000) / 10;
  };
  result.idleClosedMsPerSecond = await idle();
  await button.tap();
  await page.waitForTimeout(3500);
  result.idleOpenMsPerSecond = await idle();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
