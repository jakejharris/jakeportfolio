// Run against a production build: node scripts/check-tags.mjs http://localhost:3851
// Optional: PLAYWRIGHT_MODULE, CHROME_PATH, TAGS_REPORT, TAGS_SCREENSHOTS.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const playwright = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browser = await playwright.chromium.launch({ executablePath: process.env.CHROME_PATH });
const base = (process.argv[2] || "http://localhost:3851").replace(/\/$/, "");
const report = [];
const failures = [];

try {
  if (process.env.TAGS_SCREENSHOTS) await mkdir(process.env.TAGS_SCREENSHOTS, { recursive: true });
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
    try {
      const page = await context.newPage();
      for (const route of ["/posts/jspark3/", "/posts/joining-docusign/", "/", "/tags/web-development/"]) {
        const response = await page.goto(base + route, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(1800);
        const tags = page.locator("main .tag-pill, main [data-post-tags]");
        const visibleTags = (await Promise.all((await tags.all()).map((tag) => tag.isVisible()))).filter(Boolean).length;
        const postLinks = await page.locator('main li a[href^="/posts/"]').count();
        const seoTags = await page.locator('meta[property="article:tag"]').count();
        report.push({ route, width, status: response.status(), visibleTags, postLinks, seoTags });
        try {
          assert.equal(response.status(), 200, `${route} @ ${width}: must render`);
          if (route.startsWith("/tags/")) {
            assert.ok(postLinks > 0, `${route} @ ${width}: tag archive must render its list`);
            assert.ok(await page.locator("main h1").isVisible(), "tag archive heading must remain visible");
          } else {
            assert.equal(visibleTags, 0, `${route} @ ${width}: no visible tag UI`);
            if (route.startsWith("/posts/")) {
              assert.ok(seoTags > 0, `${route}: tagged fixture must retain SEO tags`);
              assert.equal(await page.locator("[data-post-tags]").count(), 0, "no empty post tag row");
              const keywords = await page.locator('script[type="application/ld+json"]').allTextContents();
              assert.ok(keywords.some((text) => JSON.parse(text)["@graph"]?.some((node) => node["@type"] === "BlogPosting" && node.keywords?.length > 0)), "structured data must retain tag keywords");
            } else {
              assert.ok(postLinks > 0, "home must render its list");
            }
          }
          console.log(`PASS ${route} @ ${width}`);
        } catch (error) {
          failures.push(error.message);
          console.error(`FAIL ${error.message}`);
        }
        if (process.env.TAGS_SCREENSHOTS && ["/posts/jspark3/", "/"].includes(route)) {
          const name = route === "/" ? "home" : "posts-jspark3";
          await page.screenshot({ path: path.join(process.env.TAGS_SCREENSHOTS, `${name}-${width}-top.png`) });
        }
      }
    } finally { await context.close(); }
  }
} finally {
  await browser.close();
  if (process.env.TAGS_REPORT) await writeFile(process.env.TAGS_REPORT, JSON.stringify({ report, failures }, null, 2) + "\n");
}
if (failures.length) process.exitCode = 1;
