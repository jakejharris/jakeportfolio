// Run against a production build: node scripts/check-menu.mjs http://localhost:3871
// Optional: PLAYWRIGHT_MODULE, CHROME_PATH, MENU_BROWSER=webkit, MENU_TEST filter.
import assert from "node:assert/strict";
import test from "node:test";
const playwright = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browserName = process.env.MENU_BROWSER || "chromium";
const browser = await playwright[browserName].launch(
  browserName === "chromium" ? { executablePath: process.env.CHROME_PATH } : {},
);
const base = process.argv[2] || "http://localhost:3871";
const check = async (name, fn) => test(name, {
  skip: process.env.MENU_TEST && !name.includes(process.env.MENU_TEST),
}, async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3,
    isMobile: true, hasTouch: true,
  });
  await context.addInitScript(() => localStorage.setItem("theme", "dark"));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector(".site-menu-button"));
    await fn(page, context);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});
const toggle = (page) => page.locator(".site-menu-button").evaluate((button) => button.click());
const waitOpen = (page) => page.waitForFunction(() => {
  const menu = document.querySelector(".site-menu");
  return !menu.hidden && !menu.style.clipPath;
});
const waitClosed = (page) => page.waitForFunction(() => document.querySelector(".site-menu").hidden);
const state = (page) => page.evaluate(() => ({
  expanded: document.querySelector(".site-menu-button").getAttribute("aria-expanded"),
  hidden: document.querySelector(".site-menu").hidden,
  locked: document.documentElement.hasAttribute("data-menu-open"),
  inert: document.querySelector("main").inert,
}));
const openState = { expanded: "true", hidden: false, locked: true, inert: true };
const closedState = { expanded: "false", hidden: true, locked: false, inert: false };

async function heldNavigation(page, action) {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let requested;
  const request = new Promise((resolve) => { requested = resolve; });
  await page.route(/\/about\/?\?_rsc=/, async (route) => {
    requested();
    await gate;
    await route.continue().catch(() => {});
  });
  try {
    await toggle(page);
    await waitOpen(page);
    await page.locator('.site-menu-link[href="/about/"]').click();
    await Promise.race([request, new Promise((_, reject) => setTimeout(() => reject(new Error("navigation was not intercepted")), 5000))]);
    await action(release);
  } finally {
    release();
  }
}

try {
  await check("Escape then reopen survives the delayed page arrival", async (page) => {
    await heldNavigation(page, async (release) => {
      await page.keyboard.press("Escape");
      await waitClosed(page);
      await toggle(page);
      await waitOpen(page);
      release();
      await page.waitForURL("**/about/");
      await page.waitForTimeout(700);
      assert.deepEqual(await state(page), openState);
      assert.equal(await page.locator('.site-menu-link[href="/about/"]').getAttribute("aria-current"), "page");
    });
  });

  await check("timeout then reopen survives the delayed page arrival", async (page) => {
    await heldNavigation(page, async (release) => {
      await waitClosed(page);
      await toggle(page);
      await waitOpen(page);
      release();
      await page.waitForURL("**/about/");
      await page.waitForTimeout(700);
      assert.deepEqual(await state(page), openState);
    });
  });

  await check("reopening clears a canceled destination marker", async (page) => {
    await heldNavigation(page, async () => {
      await toggle(page);
      await toggle(page);
      await waitOpen(page);
      assert.equal(await page.locator(".site-menu-link[data-here]").innerText(), "Home");
    });
  });

  await check("large text keeps the water aligned when the words scroll", async (page) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 320, height: 568 });
    await page.addStyleTag({ content: ".site-menu-link { font-size: 112px !important; }" });
    await toggle(page);
    await waitOpen(page);
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".site-menu-nav").getAttribute("data-scrolls"), "");
    await page.evaluate(() => {
      const canvas = document.querySelector(".site-menu-sea");
      const ctx = canvas.getContext("2d");
      window.menuPixelsBeforeScroll = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const nav = document.querySelector(".site-menu-nav");
      nav.scrollTop = nav.scrollHeight;
    });
    // Native input also wakes WebKit's compositor; merely assigning scrollTop
    // in a headless, reduced-motion page can defer scroll events and rAF.
    await page.mouse.move(160, 280);
    await page.waitForFunction(() => {
      const nav = document.querySelector(".site-menu-nav");
      const canvas = document.querySelector(".site-menu-sea");
      const ctx = canvas.getContext("2d");
      const after = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      return nav.scrollTop > 0 && window.menuPixelsBeforeScroll.some((value, i) => value !== after[i]);
    }, null, { timeout: 2000 });
    assert.equal(await page.locator(".site-menu-nav").evaluate((nav) => nav.scrollWidth <= nav.clientWidth), true);
  });

  await check("text resized while open enables touch scrolling", async (page) => {
    await toggle(page);
    await waitOpen(page);
    await page.addStyleTag({ content: ".site-menu-link { font-size: 224px !important; }" });
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".site-menu-nav").getAttribute("data-scrolls"), "");
  });

  await check("200 percent root text keeps the menu inside the phone viewport", async (page) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addStyleTag({ content: ":root { font-size: 32px !important; }" });
    await toggle(page);
    await waitOpen(page);
    const box = await page.locator(".site-menu").boundingBox();
    assert.equal(box.width, 320);
    assert.equal(box.height, 568);
    assert.equal(await page.locator(".site-menu-nav").evaluate((nav) => nav.scrollWidth <= nav.clientWidth), true);
  });

  await check("opening traces the menu words once when fonts are ready", async (page) => {
    // Let the homepage's own entrance animations finish tracing its heading.
    await page.waitForTimeout(2500);
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.menuTraces = 0;
      const read = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function (...args) {
        window.menuTraces++;
        return read.apply(this, args);
      };
    });
    await toggle(page);
    await waitOpen(page);
    assert.equal(await page.evaluate(() => window.menuTraces), 1);
  });

  await check("reduced motion enabled during a wave settles it immediately", async (page) => {
    await page.evaluate(() => {
      window.pauseMenuFrames = false;
      const frame = requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) => frame((time) => {
        if (!window.pauseMenuFrames) callback(time);
      });
    });
    await toggle(page);
    await page.waitForTimeout(40);
    await page.evaluate(() => { window.pauseMenuFrames = true; });
    assert.notEqual(await page.locator(".site-menu").evaluate((menu) => menu.style.clipPath), "");
    await page.emulateMedia({ reducedMotion: "reduce" });
    // Hold animation callbacks so simply finishing the wave cannot pass.
    // Native rendering and media-query delivery remain live in both engines.
    await page.waitForFunction(() => !document.querySelector(".site-menu").style.clipPath, null, { polling: 20, timeout: 2000 });
    assert.deepEqual(await state(page), openState);
    assert.equal(await page.locator('.site-menu-icon rect[x="0"][y="0"]').count(), 1, "the icon settles to its X too");
  });

  await check("rapid requests settle, release resources and preserve page scroll", async (page, context) => {
    if (browserName === "chromium") {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    }
    await page.evaluate(() => window.scrollTo(0, 400));
    const scroll = await page.evaluate(() => window.scrollY);
    for (const count of [301, 302, 31, 32]) {
      const wasOpen = (await state(page)).expanded === "true";
      await page.evaluate((count) => {
        for (let i = 0; i < count; i++) document.querySelector(".site-menu-button").click();
      }, count);
      const open = count % 2 ? !wasOpen : wasOpen;
      await (open ? waitOpen(page) : waitClosed(page));
      assert.deepEqual(await state(page), open ? openState : closedState);
    }
    if ((await state(page)).expanded !== "true") { await toggle(page); await waitOpen(page); }
    await page.keyboard.press("Escape");
    await waitClosed(page);
    assert.deepEqual(await state(page), closedState);
    assert.equal(await page.evaluate(() => window.scrollY), scroll);
    assert.equal(await page.evaluate(() => document.activeElement.className), "site-menu-button");
  });

  await check("desktop resize and browser history close and unlock the menu", async (page) => {
    await toggle(page);
    await waitOpen(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await waitClosed(page);
    assert.deepEqual(await state(page), closedState);
    await page.setViewportSize({ width: 390, height: 844 });
    await toggle(page);
    await waitOpen(page);
    await page.locator('.site-menu-link[href="/about/"]').click();
    await page.waitForURL("**/about/");
    await waitClosed(page);
    await toggle(page);
    await waitOpen(page);
    await page.goBack();
    await waitClosed(page);
    assert.deepEqual(await state(page), closedState);
    await toggle(page);
    await waitOpen(page);
    await page.goForward();
    await waitClosed(page);
    assert.deepEqual(await state(page), closedState);
  });

  await check("unsupported clip paths open and close without a wave", async (page) => {
    await page.evaluate(() => {
      const supports = CSS.supports.bind(CSS);
      CSS.supports = (...args) => args[0] === "clip-path" ? false : supports(...args);
    });
    await toggle(page);
    assert.deepEqual(await state(page), openState);
    await toggle(page);
    assert.deepEqual(await state(page), closedState);
  });

  await check("theme and accent requests during waves remain bounded", async (page) => {
    await page.evaluate(() => {
      window.menuTransitions = { active: 0, peak: 0 };
      if (!document.startViewTransition) return;
      const start = document.startViewTransition.bind(document);
      document.startViewTransition = (apply) => {
        const counts = window.menuTransitions;
        counts.peak = Math.max(counts.peak, ++counts.active);
        const transition = start(apply);
        transition.finished.then(() => counts.active--, () => counts.active--);
        return transition;
      };
    });
    for (let i = 0; i < 8; i++) {
      await toggle(page);
      await page.waitForTimeout(70);
      await page.evaluate((i) => {
        document.querySelector('[role="switch"]').click();
        document.querySelector(`[data-swatch="${i % 5}"]`).click();
      }, i);
    }
    await waitClosed(page);
    await page.waitForFunction(() => window.menuTransitions.active === 0);
    await page.waitForFunction(() => document.documentElement.getAttribute("data-accent") === "2");
    assert.ok(await page.evaluate(() => window.menuTransitions.peak <= 1));
    assert.deepEqual(await state(page), closedState);
    assert.equal(await page.locator("html").getAttribute("data-accent"), "2");
    assert.equal(await page.locator('[role="switch"]').getAttribute("aria-checked"), "true");
  });

  await check("keyboard access and page isolation survive opening and closing", async (page) => {
    const heading = await page.locator("h1").first().innerText();
    await page.locator(".site-menu-button").focus();
    await page.keyboard.press("Enter");
    await waitOpen(page);
    assert.equal(await page.evaluate(() => document.activeElement.textContent), "Home");
    const tree = await page.locator("body").ariaSnapshot();
    assert.ok(tree.includes('navigation "Menu"'));
    assert.ok(!tree.includes(heading));
    for (const word of ["JSPARK3", "About", "Contact", "Source"]) {
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement.textContent), word);
    }
    await page.locator(".appearance-dock-toggle").click();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".appearance-dock").getAttribute("data-open"), null);
    assert.deepEqual(await state(page), openState, "the first Escape only folds the palette");
    await page.keyboard.press("Escape");
    await waitClosed(page);
    assert.equal(await page.evaluate(() => document.activeElement.className), "site-menu-button");
    assert.deepEqual(await state(page), closedState);
  });

  await check("closed and unmounted menus release their canvas callbacks and page lock", async (page) => {
    await page.evaluate(() => {
      window.menuDraws = 0;
      const paint = CanvasRenderingContext2D.prototype.putImageData;
      CanvasRenderingContext2D.prototype.putImageData = function (...args) {
        if (this.canvas.className.startsWith("site-menu-")) window.menuDraws++;
        return paint.apply(this, args);
      };
    });
    for (let i = 0; i < 8; i++) {
      await toggle(page);
      await page.waitForTimeout(35);
    }
    await waitClosed(page);
    const draws = await page.evaluate(() => window.menuDraws);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.menuDraws), draws);
    await toggle(page);
    await waitOpen(page);
    // These layouts intentionally omit PortfolioChrome; Next's native
    // history integration updates usePathname and unmounts the open menu.
    await page.evaluate(() => history.pushState(null, "", "/jspark3/glm/"));
    await page.waitForFunction(() => !document.querySelector(".site-menu"));
    assert.equal(await page.locator("html").getAttribute("data-menu-open"), null);
    assert.equal(await page.locator("main").getAttribute("inert"), null);
    const afterUnmount = await page.evaluate(() => window.menuDraws);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.menuDraws), afterUnmount);
  });
} finally {
  await browser.close();
}
