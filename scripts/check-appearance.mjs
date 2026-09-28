// Browser regression checks against a running production build.
// Supply PLAYWRIGHT_MODULE and CHROME_PATH if they are not installed locally.
// node scripts/check-appearance.mjs http://localhost:3871
import assert from "node:assert/strict";
import test from "node:test";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright-core"
);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
});
const base = process.argv[2] || "http://localhost:3871";

try {
  for (const phone of [false, true]) {
    const context = await browser.newContext(
      phone
        ? {
            viewport: { width: 390, height: 844 },
            isMobile: true,
            hasTouch: true,
          }
        : { viewport: { width: 1440, height: 900 } },
    );
    await context.addInitScript(() => {
      localStorage.setItem("theme", "dark");
      localStorage.setItem("accent-index", "4");
      window.transitionCounts = { active: 0, peak: 0, total: 0 };
      window.themeClicks = 0;
      document.addEventListener(
        "click",
        (event) => {
          if (event.target.closest?.("[role=switch]")) window.themeClicks++;
        },
        true,
      );
      if (document.startViewTransition) {
        const start = document.startViewTransition.bind(document);
        document.startViewTransition = (apply) => {
          const counts = window.transitionCounts;
          counts.total++;
          counts.peak = Math.max(counts.peak, ++counts.active);
          const transition = start(apply);
          transition.finished.then(
            () => counts.active--,
            () => counts.active--,
          );
          return transition;
        };
      }
    });
    const page = await context.newPage();
    const errors = [];
    const theme = page.locator("[role=switch]");
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForFunction(
      () =>
        document
          .querySelector("[role=switch]")
          ?.getAttribute("aria-checked") === "true",
    );

    await test(`${phone ? "phone" : "desktop"} rapid theme requests`, async () => {
      // Include even bursts: reading only the rendered theme loses their parity.
      for (const clicks of [300, 301, 302]) {
        const expectedDark = await page.evaluate((clicks) => {
          const initial = document.documentElement.classList.contains("dark");
          const button = document.querySelector("[role=switch]");
          for (let i = 0; i < clicks; i++) button.click();
          return clicks % 2 ? !initial : initial;
        }, clicks);
        await page.waitForFunction(() => window.transitionCounts.active === 0);
        assert.equal(
          await page.locator("[role=switch]").getAttribute("aria-checked"),
          String(expectedDark),
        );
        assert.equal(
          await page.evaluate(() => localStorage.getItem("theme")),
          expectedDark ? "dark" : "light",
        );
        assert.equal(
          await page.evaluate(() => window.transitionCounts.peak),
          1,
          "bound unsettled transitions",
        );
      }
    });

    await test(`${phone ? "phone" : "desktop"} rapid accent requests`, async () => {
      // Returning to the original accent within one task must not be mistaken
      // for an unchanged selection because React has not rendered yet.
      await page.evaluate(() => {
        for (let i = 0; i < 303; i++)
          document.querySelector(`[data-swatch="${i % 5}"]`).click();
        document.querySelector('[data-swatch="4"]').click();
      });
      await page.waitForTimeout(100);
      assert.equal(
        await page.locator('[data-swatch="4"]').getAttribute("aria-checked"),
        "true",
      );
      assert.equal(
        await page.evaluate(() =>
          document.documentElement.getAttribute("data-accent"),
        ),
        "4",
      );
      assert.equal(
        await page.evaluate(() => localStorage.getItem("accent-index")),
        "4",
      );
    });

    await test(`${phone ? "phone" : "desktop"} pointer input`, async () => {
      // Exercise genuine pointer input as well as same-task handler bursts.
      const initial = await theme.getAttribute("aria-checked");
      const clicksBefore = await page.evaluate(() => {
        window.transitionCounts.peak = 0;
        return window.themeClicks;
      });
      for (let i = 0; i < 201; i++) {
        const box = await theme.boundingBox();
        if (phone)
          await page.touchscreen.tap(
            box.x + box.width / 2,
            box.y + box.height / 2,
          );
        else
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
      await page.waitForFunction(() => window.transitionCounts.active === 0);
      assert.equal(await page.evaluate(() => window.transitionCounts.peak), 1);
      assert.equal(
        (await page.evaluate(() => window.themeClicks)) - clicksBefore,
        201,
        "flood snapshots must not swallow clicks",
      );
      assert.equal(
        await theme.getAttribute("aria-checked"),
        String(initial !== "true"),
      );

      if (phone) await page.locator(".appearance-dock-toggle").tap();
      for (let i = 0; i < 201; i++) {
        const box = await page
          .locator(`[data-swatch="${i % 5}"]`)
          .boundingBox();
        if (phone)
          await page.touchscreen.tap(
            box.x + box.width / 2,
            box.y + box.height / 2,
          );
        else
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
      await page.waitForTimeout(100);
      assert.equal(
        await page.locator('[data-swatch="0"]').getAttribute("aria-checked"),
        "true",
      );
      assert.equal(
        await page.evaluate(() =>
          document.documentElement.getAttribute("data-accent"),
        ),
        null,
      );
    });

    await test(`${phone ? "phone" : "desktop"} pseudo-element animation does not trace islands`, async () => {
      const traces = await page.evaluate(async () => {
        let count = 0;
        const original = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function (...args) {
          count++;
          return original.apply(this, args);
        };
        document.documentElement.dispatchEvent(
          new AnimationEvent("animationend", {
            pseudoElement: "::view-transition-group(root)",
            bubbles: true,
          }),
        );
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        CanvasRenderingContext2D.prototype.getImageData = original;
        return count;
      });
      assert.equal(traces, 0);
    });

    await test(`${phone ? "phone" : "desktop"} reduced motion and height resize`, async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForTimeout(100);
      const started = await page.evaluate(() => window.transitionCounts.total);
      await theme.evaluate((b) => b.click());
      assert.equal(
        await page.evaluate(() => window.transitionCounts.total),
        started,
        "reduced motion skips capture",
      );
      await page.waitForTimeout(100);
      await page.setViewportSize({ width: phone ? 390 : 1440, height: 700 });
      await page.waitForTimeout(100);
      assert.equal(
        await page.evaluate(() => {
          const canvas = document.querySelector(".pixel-fluid-canvas");
          return canvas
            .getContext("2d")
            .getImageData(0, 0, canvas.width, canvas.height)
            .data.some((v, i) => i % 4 === 3 && v !== 0);
        }),
        true,
        "reduced-motion height resize repaints the canvas",
      );
    });

    await test(`${phone ? "phone" : "desktop"} unsupported API`, async () => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.evaluate(() => {
        document.startViewTransition = undefined;
      });
      const previous = await theme.getAttribute("aria-checked");
      await theme.evaluate((b) => b.click());
      await page.waitForFunction(
        (previous) =>
          document
            .querySelector("[role=switch]")
            .getAttribute("aria-checked") !== previous,
        previous,
      );
    });
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally {
  await browser.close();
}
