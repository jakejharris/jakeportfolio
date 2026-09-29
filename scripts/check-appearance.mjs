// Browser regression checks against a running production build.
// Supply PLAYWRIGHT_MODULE and CHROME_PATH if they are not installed locally.
// node scripts/check-appearance.mjs http://localhost:3871
// CPU=4 slows Chrome's CPU four times. BROWSER=webkit runs WebKit instead.
// LONG_MS sets how long the long spam run lasts (default 12000).
import assert from "node:assert/strict";
import test from "node:test";
const playwright = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright-core"
);
const webkit = process.env.BROWSER === "webkit";
const browser = webkit
  ? await playwright.webkit.launch()
  : await playwright.chromium.launch({
      executablePath: process.env.CHROME_PATH,
    });
const base = process.argv[2] || "http://localhost:3871";
const cpu = Number(process.env.CPU || 1);
const longMs = Number(process.env.LONG_MS || 12000);
// Drop nodes in the air at once: MAX_DROPS in app/lib/dock-play.ts.
const MAX_DROP_NODES = 24;
// app/lib/dock-play.ts BURST_GAP_MS and app/lib/pixel-tide.ts CALM_MS.
const BURST_GAP_MS = 450;
const CALM_MS = 400;
// After the last press: rings cross the screen, drops land and the wash
// fades well inside this.
const SETTLE_MS = 2800;

try {
  await test("blocked storage keeps the page and appearance controls usable", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      for (const name of ["localStorage", "sessionStorage"]) {
        Object.defineProperty(window, name, {
          get() { throw new DOMException("Storage is blocked", "SecurityError"); },
        });
      }
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto(base, { waitUntil: "networkidle" });
      await page.locator("[data-swatch='2']").click();
      await page.waitForFunction(() => document.documentElement.dataset.accent === "2");
      const theme = page.locator(".appearance-dock-theme");
      const previous = await theme.getAttribute("aria-checked");
      await theme.click();
      await page.waitForFunction((previous) =>
        document.querySelector(".appearance-dock-theme").getAttribute("aria-checked") !== previous, previous);
      await page.waitForTimeout(1500);
      await page.locator("nav a[href='/about/']:visible").click();
      await page.waitForURL("**/about/");
      await page.locator("main h1").waitFor();
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });

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
      window.longTasks = [];
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            window.longTasks.push(Math.round(entry.duration));
        }).observe({ type: "longtask" });
      } catch {}
      // The dock and the water, as the checks see them. `colored` counts
      // strongly colored pixels on the sea: glints at rest, paint in a burst.
      window.dockProbe = () => {
        const canvas = document.querySelector(".pixel-fluid-canvas");
        let colored = 0;
        if (canvas?.width) {
          const data = canvas
            .getContext("2d")
            .getImageData(0, 0, canvas.width, canvas.height).data;
          for (let i = 0; i < data.length; i += 4) {
            const high = Math.max(data[i], data[i + 1], data[i + 2]);
            const low = Math.min(data[i], data[i + 1], data[i + 2]);
            if (high - low > 60) colored++;
          }
        }
        const dock = document.querySelector(".appearance-dock");
        return {
          colored,
          drops: document.querySelectorAll(".appearance-dock-drop").length,
          hot: dock.hasAttribute("data-hot"),
          open: dock.hasAttribute("data-open"),
          active: window.transitionCounts.active,
        };
      };
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
    const label = phone ? "phone" : "desktop";
    page.on("pageerror", (e) => errors.push(e.message));
    if (cpu > 1 && !webkit) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
    }
    await page.goto(base, { waitUntil: "networkidle" });

    // Press by coordinates, as a finger or a mouse does.
    const tap = async (selector) => {
      const box = await page.locator(selector).boundingBox();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      if (phone) await page.touchscreen.tap(x, y);
      else await page.mouse.click(x, y);
    };
    const swatch = (index) => `[data-swatch="${index}"]`;
    const probe = () => page.evaluate(() => window.dockProbe());
    const accentNow = () =>
      page.evaluate(() => document.documentElement.getAttribute("data-accent") ?? "0");
    // On a phone the palette folds into one swatch; open it when folded.
    const unfold = async () => {
      if (phone && !(await probe()).open) {
        await tap(".appearance-dock-toggle");
        await page.waitForFunction(() => window.dockProbe().open);
      }
    };
    // Everything the dock started has finished.
    const rest = async () => {
      await page.waitForFunction(
        () => {
          const now = window.dockProbe();
          return now.drops === 0 && !now.hot && now.active === 0;
        },
        null,
        { timeout: 20000 },
      );
      await page.waitForTimeout(SETTLE_MS);
    };
    // The page is back to normal: no drops, no heat, no capture, no frozen
    // transitions, and the heading answers to a click where it stands.
    const settled = () =>
      page.evaluate(() => {
        const now = window.dockProbe();
        const heading = document.querySelector("h1");
        const box = heading?.getBoundingClientRect();
        const hit = box
          ? document.elementFromPoint(box.left + 4, box.top + box.height / 2)
          : null;
        return {
          ...now,
          // The theme switch's own style that holds transitions off.
          frozen: [...document.head.querySelectorAll("style")].some((style) =>
            style.textContent.startsWith("*,*::before,*::after{"),
          ),
          heading: !heading || heading.contains(hit),
        };
      });
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

    await test(`${label} a burst of picks paints the water, then settles`, async () => {
      await rest();
      await unfold();
      // Compare calm water in the same accent on both sides. Whole-cell
      // blue glints are colored even without any burst paint;
      // a mono baseline would incorrectly count those as paint left behind.
      await tap(swatch(2));
      await rest();
      await unfold();
      const before = await probe();
      const peak = { drops: 0, colored: 0 };
      // A lone first press on the chosen color would fold a phone's palette.
      const order = [1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2];
      if ((await accentNow()) === "1") order.unshift(3);
      for (const index of order) {
        await tap(swatch(index));
        const now = await probe();
        peak.drops = Math.max(peak.drops, now.drops);
        peak.colored = Math.max(peak.colored, now.colored);
        assert.ok(now.drops <= MAX_DROP_NODES, `drops stay bounded (${now.drops})`);
        assert.equal(now.active, 0, "picking a color never captures the page");
      }
      for (let i = 0; i < 12; i++) {
        await page.waitForTimeout(100);
        peak.colored = Math.max(peak.colored, (await probe()).colored);
      }
      assert.ok(peak.drops > 0, "a hot burst flicks drops");
      assert.ok(
        peak.colored > before.colored * 2 + 20,
        `the water takes the paint (${before.colored} -> ${peak.colored})`,
      );
      await rest();
      const after = await settled();
      assert.ok(
        after.colored <= Math.max(before.colored, 10) * 2 + 20,
        `and washes out (${peak.colored} -> ${after.colored})`,
      );
      assert.equal(after.frozen, false);
      assert.equal(after.heading, true);
      assert.equal(await page.locator(swatch(2)).getAttribute("aria-checked"), "true");
      assert.equal(await accentNow(), "2");
      assert.equal(await page.evaluate(() => localStorage.getItem("accent-index")), "2");
    });

    if (!phone)
      await test("desktop pressing the chosen color pours it again and changes nothing", async () => {
        await rest();
        const current = await accentNow();
        const before = await probe();
        await tap(swatch(current));
        let peak = before.colored;
        for (let i = 0; i < 8; i++) {
          await page.waitForTimeout(50);
          peak = Math.max(peak, (await probe()).colored);
        }
        assert.ok(peak > before.colored + 20, `a ring pours (${before.colored} -> ${peak})`);
        assert.equal(await accentNow(), current);
        assert.equal(await page.locator(swatch(current)).getAttribute("aria-checked"), "true");
      });

    if (phone)
      await test("phone one press on the chosen color folds the palette, a burst plays", async () => {
        await rest();
        await unfold();
        await page.waitForTimeout(BURST_GAP_MS + 100);
        const current = await accentNow();
        await tap(swatch(current));
        await page.waitForFunction(() => !window.dockProbe().open);
        await page.waitForTimeout(BURST_GAP_MS + 100);
        await tap(".appearance-dock-toggle");
        for (let i = 0; i < 5; i++) await tap(swatch(current));
        assert.equal((await probe()).open, true, "a burst keeps the palette open");
        assert.equal(await accentNow(), current);
        await page.waitForTimeout(BURST_GAP_MS + 100);
        await tap(swatch(current));
        await page.waitForFunction(() => !window.dockProbe().open);
        assert.equal(
          await page.evaluate(() => document.activeElement?.classList.contains("appearance-dock-toggle")),
          true,
          "folding hands focus to the toggle",
        );
      });

    if (!phone)
      await test("desktop holding an arrow key walks the palette and ends where it stops", async () => {
        await rest();
        const start = Number(await accentNow());
        await page.focus(swatch(start));
        for (let i = 0; i < 23; i++) await page.keyboard.press("ArrowRight");
        const expected = (start + 23) % 5;
        await page.waitForTimeout(100);
        assert.equal(
          await page.evaluate(() => document.activeElement?.getAttribute("data-swatch")),
          String(expected),
        );
        assert.equal(await page.locator(swatch(expected)).getAttribute("aria-checked"), "true");
        assert.equal(await page.locator("[role=radio][tabindex='0']").count(), 1);
        assert.equal(await accentNow(), String(expected));
        assert.equal(
          await page.evaluate(() => localStorage.getItem("accent-index")),
          String(expected),
        );
      });

    await test(`${label} long spam at ${cpu}x CPU ends settled and right`, async () => {
      await rest();
      await page.evaluate(() => {
        window.transitionCounts.peak = 0;
        window.longTasks.length = 0;
      });
      const errorsBefore = errors.length;
      const startDark = await page.evaluate(() =>
        document.documentElement.classList.contains("dark"),
      );
      // Around the palette, the chosen color again and again, and the theme
      // button, as fast as input arrives.
      const pattern = [1, 2, "t", 3, 3, 3, 4, "t", 0, 2, 2, "t", 1, 4, "t", "t"];
      let presses = 0;
      let themePresses = 0;
      let last = null;
      let most = { drops: 0, active: 0 };
      const end = Date.now() + longMs;
      while (Date.now() < end) {
        const step = pattern[presses % pattern.length];
        if (step === "t") {
          await tap("[role=switch]");
          themePresses++;
        } else {
          await unfold();
          await tap(swatch(step));
          last = step;
        }
        presses++;
        if (presses % 6 === 0) {
          const now = await probe();
          most = { drops: Math.max(most.drops, now.drops), active: Math.max(most.active, now.active) };
          assert.ok(now.drops <= MAX_DROP_NODES, `drops stay bounded (${now.drops})`);
          assert.ok(now.active <= 1, "one theme flood at a time");
        }
      }
      const stopped = Date.now();
      await page.waitForFunction(() => window.transitionCounts.active === 0, null, {
        timeout: 20000,
      });
      const floodsDone = Date.now() - stopped;
      await rest();
      const after = await settled();
      const expectedDark = themePresses % 2 ? !startDark : startDark;
      const tasks = await page.evaluate(() => window.longTasks);
      const peak = await page.evaluate(() => window.transitionCounts.peak);
      console.log(
        `# ${label} long spam: ${presses} presses (${themePresses} theme) in ${longMs} ms at ${cpu}x;` +
          ` most drops ${most.drops}, peak transitions ${peak}, last flood done ${floodsDone} ms after the last press,` +
          ` long tasks ${tasks.length} (longest ${Math.max(0, ...tasks)} ms)`,
      );
      assert.equal(peak, 1, "never two unsettled transitions");
      assert.ok(floodsDone < 2000, "the theme lands soon after the last press");
      assert.equal(after.drops, 0);
      assert.equal(after.hot, false);
      assert.equal(after.frozen, false);
      assert.equal(after.heading, true, "the page answers to clicks again");
      assert.equal(await theme.getAttribute("aria-checked"), String(expectedDark));
      assert.equal(
        await page.evaluate(() => document.documentElement.classList.contains("dark")),
        expectedDark,
      );
      assert.equal(
        await page.evaluate(() => localStorage.getItem("theme")),
        expectedDark ? "dark" : "light",
      );
      assert.equal(await page.locator(swatch(last)).getAttribute("aria-checked"), "true");
      assert.equal(await accentNow(), String(last));
      assert.equal(
        await page.evaluate(() => localStorage.getItem("accent-index")),
        String(last),
      );
      assert.deepEqual(errors.slice(errorsBefore), []);
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

    await test(`${label} reduced motion: no drops, no rings, theme switches held apart`, async () => {
      await rest();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForTimeout(100);
      await unfold();
      // Compare the same idle accent at both ends. Starting from mono
      // otherwise counts ordinary colored crest glints as painted rings.
      await tap(swatch(3));
      await unfold(); // A first press on the selected swatch folds the phone palette.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const before = await probe();
      let most = { drops: 0, colored: before.colored };
      const order = [1, 2, 3, 4, 0, 1, 2, 3];
      if ((await accentNow()) === "1") order.unshift(4);
      for (const index of order) {
        await tap(swatch(index));
        const now = await probe();
        most = { drops: Math.max(most.drops, now.drops), colored: Math.max(most.colored, now.colored) };
      }
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(100);
        most.colored = Math.max(most.colored, (await probe()).colored);
      }
      assert.equal(most.drops, 0, "no drops");
      assert.ok(
        most.colored <= Math.max(before.colored, 10) * 2 + 20,
        `no rings (${before.colored} -> ${most.colored})`,
      );
      assert.equal(await accentNow(), "3");
      const startDark = await page.evaluate(() => {
        const root = document.documentElement;
        window.themeFlips = 0;
        let dark = root.classList.contains("dark");
        new MutationObserver(() => {
          if (root.classList.contains("dark") !== dark) {
            dark = !dark;
            window.themeFlips++;
          }
        }).observe(root, { attributes: true, attributeFilter: ["class"] });
        return dark;
      });
      const total = await page.evaluate(() => window.transitionCounts.total);
      const started = Date.now();
      for (let i = 0; i < 7; i++) await tap("[role=switch]");
      const spent = Date.now() - started;
      await page.waitForTimeout(CALM_MS + 200);
      const flips = await page.evaluate(() => window.themeFlips);
      assert.ok(flips >= 1 && flips <= Math.ceil(spent / CALM_MS) + 1, `held apart (${flips} in ${spent} ms)`);
      assert.equal(
        await page.evaluate(() => document.documentElement.classList.contains("dark")),
        !startDark,
        "ends on the last press",
      );
      assert.equal(await page.evaluate(() => window.transitionCounts.total), total, "never captures");
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

  await test("phone taps leave no focus ring in the dock; keys still show one", async () => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: !webkit,
      hasTouch: true,
    });
    await context.addInitScript(() => {
      localStorage.setItem("theme", "dark");
      localStorage.setItem("accent-index", "1");
      // iOS Safari does not focus a tapped button, so script focus that
      // follows a tap has no earlier focus to go by. Stand in for that here.
      document.addEventListener("mousedown", (event) => {
        if (event.target.closest("a, button")) event.preventDefault();
      }, true);
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base, { waitUntil: "networkidle" });
    const tap = async (selector) => {
      const box = await page.locator(selector).boundingBox();
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    };
    const open = () => page.evaluate(() => document.querySelector(".appearance-dock").hasAttribute("data-open"));
    // The focused control and whether a ring is drawn on it.
    const focus = () => page.evaluate(() => {
      const active = document.activeElement;
      return {
        control: active.getAttribute("data-swatch") ?? (active.classList.contains("appearance-dock-toggle") ? "toggle" : active.tagName),
        ring: getComputedStyle(active).outlineStyle !== "none",
      };
    });
    await tap(".appearance-dock-toggle");
    await page.waitForFunction(() => document.querySelector(".appearance-dock").hasAttribute("data-open"));
    assert.deepEqual(await focus(), { control: "1", ring: false }, "unfolding by tap");
    await page.waitForTimeout(BURST_GAP_MS + 100);
    await tap('[data-swatch="1"]');
    await page.waitForFunction(() => !document.querySelector(".appearance-dock").hasAttribute("data-open"));
    assert.deepEqual(await focus(), { control: "toggle", ring: false }, "folding by tap");
    await page.waitForTimeout(BURST_GAP_MS + 100);
    await page.focus(".appearance-dock-toggle");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector(".appearance-dock").hasAttribute("data-open"));
    assert.deepEqual(await focus(), { control: "1", ring: true }, "unfolding by key");
    await page.keyboard.press("ArrowRight");
    assert.deepEqual(await focus(), { control: "2", ring: true }, "arrow key");
    await page.keyboard.press("Escape");
    assert.equal(await open(), false);
    assert.deepEqual(await focus(), { control: "toggle", ring: true }, "folding by Escape");
    assert.deepEqual(errors, []);
    await context.close();
  });

  await test("desktop a burst paints a reading page's shore, then it settles", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    if (cpu > 1 && !webkit) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
    }
    await page.goto(`${base}/about/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3500);
    const colored = () =>
      page.evaluate(() => {
        const canvas = document.querySelector(".pixel-shore-canvas");
        const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] && Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) > 60) count++;
        }
        return count;
      });
    const before = await colored();
    let peak = before;
    for (const index of [1, 2, 3, 1, 2, 3, 1, 2, 3, 1]) {
      const box = await page.locator(`[data-swatch="${index}"]`).boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      peak = Math.max(peak, await colored());
    }
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(100);
      peak = Math.max(peak, await colored());
    }
    assert.ok(peak > before + 50, `the shore takes the paint (${before} -> ${peak})`);
    await page.waitForTimeout(SETTLE_MS + 1500);
    const after = await colored();
    assert.ok(after <= before + 10, `and washes out (${after})`);
    assert.deepEqual(errors, []);
    await context.close();
  });
} finally {
  await browser.close();
}
