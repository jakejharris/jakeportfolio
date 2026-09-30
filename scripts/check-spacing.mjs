// Run against a production build: node scripts/check-spacing.mjs http://localhost:3841
// Optional: PLAYWRIGHT_MODULE, CHROME_PATH, SPACING_BROWSER=webkit,
// SPACING_REPORT (JSON path), SPACING_SCREENSHOTS (directory), SPACING_MEASURE_ONLY=1.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const playwright = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browserName = process.env.SPACING_BROWSER || "chromium";
const browser = await playwright[browserName].launch(
  browserName === "chromium" ? { executablePath: process.env.CHROME_PATH } : {},
);
const base = (process.argv[2] || "http://localhost:3841").replace(/\/$/, "");
// Measure the visible content's border boxes, rather than the layout's padding
// boxes: nested hero padding, list padding and unused viewport height count.
const routes = [
  { route: "/posts/jspark3/", first: "main h1", last: "#external-links", tags: true, screenshots: true },
  { route: "/posts/joining-docusign/", first: "main h1", last: ".portable-text > :last-child, #external-links", tags: true, screenshots: true },
  { route: "/posts/apres-surf-club/", first: "main h1", last: ".portable-text > :last-child, #external-links", tags: true },
  { route: "/", first: ".hero-wordmark", last: "main li:last-child .pageLinkContainer", hiddenTags: true, screenshots: true },
  { route: "/tags/project-showcase/", first: "main h1", last: "main li:last-child .pageLinkContainer" },
  { route: "/tags/web-development/", first: "main h1", last: "main li:last-child .pageLinkContainer" },
  { route: "/about/", first: ".hero-wordmark", last: ".about-elsewhere .link-ledger", screenshots: true },
  { route: "/contact/", first: ".hero-wordmark", last: ".contact-local" },
  { route: "/jspark3/", first: ".hero-wordmark", last: ".spark-hub-note", screenshots: true },
  { route: "/drafts/", first: "main h1", last: "main form button" },
  { route: "/jspark3/glm/", first: ".glm-hero > div", last: ".glm-notes", header: ".glm-header", footer: ".glm-footer" },
  { route: "/jspark3/deepseek/", first: ".tempo-hero > div", last: ".tempo-notes", header: ".tempo-header", footer: ".tempo-footer" },
];
const measureGaps = (config) => {
  const visible = (selector) => [...document.querySelectorAll(selector)].find((element) => element.getBoundingClientRect().height > 0);
  const box = (element) => {
    if (!element) throw new Error(`Missing content on ${location.pathname}`);
    const rect = element.getBoundingClientRect();
    return { top: rect.top + scrollY, bottom: rect.bottom + scrollY };
  };
  const header = box(visible(config.header || ".navbar-sticky"));
  const footer = box(visible(config.footer || "[data-site-footer]"));
  // A lead image is the first content when the post has one.
  const image = config.tags && document.querySelector("main h1")?.previousElementSibling?.querySelector("img");
  const first = box(image?.parentElement || visible(config.first));
  const last = box([...document.querySelectorAll(config.last)].at(-1));
  const tags = config.tags || config.hiddenTags ? [...document.querySelectorAll("main .tag-pill, main [data-post-tags]")].map((tag) => ({
    visible: tag.getBoundingClientRect().width > 0 && tag.getBoundingClientRect().height > 0,
  })) : [];
  // Resolve the shared CSS token without changing the page's geometry.
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute; visibility:hidden; height:var(--page-edge-space)";
  document.body.append(probe);
  const edgeSpace = probe.getBoundingClientRect().height;
  probe.remove();
  const viewportHeight = innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  return { edgeSpace, viewportHeight, documentHeight, top: first.top - header.bottom, bottom: footer.top - last.bottom, header, footer, first, last, tags };
};

const assertSpacing = (gaps, label) => {
  const { top, bottom, edgeSpace, documentHeight, viewportHeight, footer } = gaps;
  assert.ok(edgeSpace > 0, `${label}: shared edge space must resolve`);
  assert.ok(Math.abs(top - edgeSpace) <= 1, `${label}: top ${top.toFixed(2)}px != shared edge ${edgeSpace.toFixed(2)}px`);
  if (documentHeight > viewportHeight + 1) {
    assert.ok(Math.abs(bottom - edgeSpace) <= 1, `${label}: overflowing bottom ${bottom.toFixed(2)}px != shared edge ${edgeSpace.toFixed(2)}px`);
  } else {
    assert.ok(bottom >= edgeSpace - 1, `${label}: short-page bottom ${bottom.toFixed(2)}px < shared edge ${edgeSpace.toFixed(2)}px`);
    assert.ok(Math.abs(footer.bottom - viewportHeight) <= 1, `${label}: short-page footer must end at viewport bottom`);
  }
};

const report = [];
const failures = [];

try {
  if (process.env.SPACING_SCREENSHOTS) await mkdir(process.env.SPACING_SCREENSHOTS, { recursive: true });
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      deviceScaleFactor: 1, isMobile: width === 390, hasTouch: width === 390,
      colorScheme: "dark",
    });
    await context.addInitScript(() => {
      localStorage.setItem("theme", "dark");
      localStorage.setItem("accent-index", "4");
    });
    const page = await context.newPage();
    try {
      for (const config of routes) {
        const response = await page.goto(base + config.route, { waitUntil: "networkidle" });
        assert.equal(response.status(), 200, `${config.route} must render`);
        await page.evaluate(() => document.fonts.ready);
        // Include the site's normal entrances, after they settle.
        await page.waitForTimeout(1800);
        const gaps = await page.evaluate(measureGaps, config);
        const row = { route: config.route, width, browser: browserName, ...gaps };
        report.push(row);
        const label = `${config.route} @ ${width}`;
        try {
          assertSpacing(gaps, label);
          if (config.tags || config.hiddenTags) {
            assert.ok(gaps.tags.every((tag) => !tag.visible), `${label}: tag UI must be hidden at every width`);
          }
          console.log(`PASS ${label}: ${gaps.top.toFixed(2)} / ${gaps.bottom.toFixed(2)} CSS px`);
        } catch (error) {
          failures.push(error.message);
          console.error(`FAIL ${error.message}`);
        }
        if (process.env.SPACING_SCREENSHOTS && config.screenshots && (width === 390 || config.tags)) {
          const name = config.route.replace(/^\/$/, "home").replace(/^\/|\/$/g, "").replaceAll("/", "-");
          await page.screenshot({ path: path.join(process.env.SPACING_SCREENSHOTS, `${name}-${width}-top.png`) });
          if (config.route === "/posts/joining-docusign/") {
            await page.screenshot({ path: path.join(process.env.SPACING_SCREENSHOTS, `${name}-${width}-full.png`), fullPage: true });
          }
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
          await page.waitForTimeout(600);
          await page.screenshot({ path: path.join(process.env.SPACING_SCREENSHOTS, `${name}-${width}-bottom.png`) });
        }
      }
      // About variants share the top edge; spare viewport height stays below content.
      await page.goto(base + "/about/", { waitUntil: "networkidle" });
      for (const length of ["Short", "Long"]) {
        await page.getByRole("radio", { name: length, exact: true }).check();
        await page.waitForTimeout(1800);
        const gaps = await page.evaluate(measureGaps, {
          first: ".hero-wordmark", last: ".about-elsewhere .link-ledger",
        });
        report.push({ route: "/about/", variant: length, width, browser: browserName, ...gaps });
        const { top, bottom } = gaps;
        try {
          assertSpacing(gaps, `About ${length} @ ${width}`);
          console.log(`PASS About ${length} @ ${width}: ${top.toFixed(2)} / ${bottom.toFixed(2)} CSS px`);
        } catch (error) { failures.push(error.message); console.error(`FAIL ${error.message}`); }
      }
    } finally { await context.close(); }
  }
  // Match the site's navigation breakpoint, including the pixels either side.
  const context = await browser.newContext({ colorScheme: "dark", reducedMotion: "reduce" });
  try {
    const page = await context.newPage();
    await page.goto(base + "/posts/jspark3/", { waitUntil: "networkidle" });
    for (const width of [767, 768]) {
      await page.setViewportSize({ width, height: 900 });
      const tags = page.locator("main .tag-pill, main [data-post-tags]");
      try {
        for (const tag of await tags.all()) assert.equal(await tag.isVisible(), false, `post tag visibility @ ${width}`);
        console.log(`PASS post tag breakpoint @ ${width}`);
      } catch (error) { failures.push(error.message); console.error(`FAIL ${error.message}`); }
    }
  } finally { await context.close(); }
} finally {
  await browser.close();
  if (process.env.SPACING_REPORT) await writeFile(process.env.SPACING_REPORT, JSON.stringify({ report, failures }, null, 2) + "\n");
}
if (failures.length && !process.env.SPACING_MEASURE_ONLY) process.exitCode = 1;
