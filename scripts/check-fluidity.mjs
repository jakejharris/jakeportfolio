// Page-change behaviour against a production build:
//   node scripts/check-fluidity.mjs http://localhost:3861
// Optional: PLAYWRIGHT_MODULE, CHROME_PATH, FLUIDITY_BROWSER=webkit, FLUIDITY_TEST filter.
import assert from "node:assert/strict";
import test from "node:test";
const playwright = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browserName = process.env.FLUIDITY_BROWSER || "chromium";
const browser = await playwright[browserName].launch(
  browserName === "chromium" ? { executablePath: process.env.CHROME_PATH } : {},
);
const base = (process.argv[2] || "http://localhost:3861").replace(/\/$/, "");
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const desktop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };

const check = (name, options, fn) => test(name, {
  skip: process.env.FLUIDITY_TEST && !name.includes(process.env.FLUIDITY_TEST),
}, async () => {
  const context = await browser.newContext(options.device || desktop);
  await context.addInitScript(() => {
    localStorage.setItem("theme", "dark");
    // Every layout shift the water itself causes, to prove there are none.
    window.waterShifts = [];
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          for (const source of entry.sources || []) {
            if (source.node?.closest?.("[data-water-layer]")) window.waterShifts.push(entry.value);
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
  });
  const page = await context.newPage();
  if (options.reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(base + (options.path || "/"), { waitUntil: "networkidle" });
    await fn(page, context);
    assert.deepEqual(await page.evaluate(() => window.waterShifts), [], "the water never shifts the layout");
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

const water = (page) => page.evaluate(() => ({
  sea: document.querySelector(".pixel-fluid-background")?.dataset.water,
  shore: document.querySelector(".pixel-shore")?.dataset.water,
}));
const waitShore = (page) => page.waitForFunction(() => document.querySelector(".pixel-shore")?.dataset.water === "on");
const waitSea = (page) => page.waitForFunction(() => document.querySelector(".pixel-fluid-background")?.dataset.water === "on");
const firstPost = (page) => page.locator("main a.pageLinkContainer[href^='/posts/']").first();
// Press where a reader would: Playwright's own click scrolls the element into
// view first, which is not something a reader does.
async function press(page, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("nothing to press");
  const x = box.x + Math.min(box.width / 2, 60);
  const y = box.y + box.height / 2;
  if ((await page.evaluate(() => navigator.maxTouchPoints)) > 0) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

// Hold the next page's server response until `release` is called.
async function hold(page, pattern) {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let requested;
  const request = new Promise((resolve) => { requested = resolve; });
  await page.route(pattern, async (route) => {
    requested();
    await gate;
    await route.continue().catch(() => {});
  });
  return { release, request };
}

try {
  await check("each page gets its own water, from one layer that stays mounted", {}, async (page) => {
    await waitSea(page);
    assert.deepEqual(await water(page), { sea: "on", shore: "off" });
    const layer = await page.evaluateHandle(() => document.querySelector(".pixel-fluid-background"));
    await press(page, firstPost(page));
    await page.waitForURL("**/posts/**");
    await waitShore(page);
    await page.waitForTimeout(400);
    assert.deepEqual(await water(page), { sea: "off", shore: "on" });
    await press(page, page.locator("nav a[href='/about/']:visible"));
    await page.waitForURL("**/about/");
    await waitShore(page);
    await press(page, page.locator("nav a[href='/']:visible"));
    await page.waitForURL(base + "/");
    await waitSea(page);
    assert.equal(await layer.evaluate((node) => node.isConnected), true, "the water was not remounted");
  });

  for (const [label, device] of [["desktop", desktop], ["phone", phone]]) {
    await check(`the shore keeps clear of every line of text (${label})`, { device, path: "/posts/joining-docusign/" }, async (page) => {
      await waitShore(page);
      await page.waitForTimeout(3500);
      const closest = await page.evaluate(() => {
        const canvas = document.querySelector(".pixel-shore-canvas");
        const box = canvas.getBoundingClientRect();
        const scale = box.width / canvas.width;
        const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        // Independent of the water's own tracing: every text line and image
        // on the page, measured fresh.
        const ink = [];
        const walker = document.createTreeWalker(document.querySelector("[data-page-frame]"), NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.nodeValue.trim()) continue;
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) if (rect.width && rect.height) ink.push(rect);
        }
        for (const img of document.querySelectorAll("[data-page-frame] img")) ink.push(img.getBoundingClientRect());
        let min = Infinity;
        let dots = 0;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            if (!data[(y * canvas.width + x) * 4 + 3]) continue;
            dots++;
            const cx = box.left + (x + 0.5) * scale;
            const cy = box.top + (y + 0.5) * scale;
            for (const rect of ink) {
              const dx = Math.max(rect.left - cx, 0, cx - rect.right);
              const dy = Math.max(rect.top - cy, 0, cy - rect.bottom);
              min = Math.min(min, Math.hypot(dx, dy));
            }
          }
        }
        return { min, dots };
      });
      if (label === "desktop") assert.ok(closest.dots > 0, "the margins have water");
      assert.ok(closest.min >= 30, `a dot came within ${closest.min.toFixed(1)}px of the text`);
    });
  }

  await check("back and forward return to the exact place, content already there", { device: phone }, async (page) => {
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(300);
    const home = await page.evaluate(() => window.scrollY);
    // A card in the middle of the screen, where a thumb would tap it.
    const index = await page.locator("main a.pageLinkContainer[href^='/posts/']").evaluateAll((links) =>
      links.findIndex((link) => {
        const rect = link.getBoundingClientRect();
        return rect.top > 200 && rect.bottom < window.innerHeight - 150;
      }),
    );
    assert.ok(index >= 0, "a card is in view");
    const link = page.locator("main a.pageLinkContainer[href^='/posts/']").nth(index);
    const href = await link.getAttribute("href");
    await press(page, link);
    await page.waitForURL("**/posts/**");
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(300);
    const post = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => {
      // The first frame after the page changes: where it is and what shows.
      window.firstFrame = null;
      const observer = new MutationObserver(() => {
        if (window.firstFrame) return;
        requestAnimationFrame(() => {
          const entering = [...document.querySelectorAll(".page-enter, .page-enter-2, .page-enter-3, .hero-wordmark")];
          window.firstFrame = {
            y: window.scrollY,
            path: location.pathname,
            faded: entering.filter((element) => parseFloat(getComputedStyle(element).opacity) < 0.99).length,
          };
        });
      });
      observer.observe(document.querySelector("[data-page-frame]"), { childList: true, subtree: true });
    });
    await page.goBack();
    await page.waitForFunction(() => window.firstFrame);
    const back = await page.evaluate(() => window.firstFrame);
    assert.equal(back.path, "/");
    assert.equal(back.y, home, "back restores the homepage position in the first frame");
    assert.equal(back.faded, 0, "nothing fades back in");
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("href"));
    assert.equal(focused, href, "focus goes back to the link the reader left through");
    await page.evaluate(() => { window.firstFrame = null; });
    await page.goForward();
    await page.waitForFunction(() => window.firstFrame);
    const forward = await page.evaluate(() => window.firstFrame);
    assert.equal(forward.y, post, "forward restores the post position in the first frame");
    assert.equal(forward.faded, 0);
    const nav = await page.locator("nav.navbar-sticky:visible").evaluate((element) => getComputedStyle(element).transform);
    assert.ok(nav === "none" || nav.endsWith(", 0)"), "the navbar stays in view after a restore");
  });

  await check("a new page starts at its heading for keyboards and screen readers", {}, async (page) => {
    const link = firstPost(page);
    await link.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL("**/posts/**");
    await page.waitForFunction(() => document.activeElement?.tagName === "H1");
    const heading = await page.evaluate(() => ({
      tabindex: document.activeElement.getAttribute("tabindex"),
      text: document.activeElement.textContent.trim().length > 0,
      outline: getComputedStyle(document.activeElement).outlineStyle,
    }));
    assert.deepEqual(heading, { tabindex: "-1", text: true, outline: "none" });
    await page.keyboard.press("Tab");
    const next = await page.evaluate(() => document.activeElement.closest("main") !== null);
    assert.equal(next, true, "Tab continues into the page, not back at the top");
  });

  await check("a slow page dims the one being left and the navbar points ahead", { path: "/posts/joining-docusign/" }, async (page) => {
    // Hold the homepage's data from before the page loads: the navbar link
    // prefetches it, and a finished prefetch would make the tap instant.
    const { release } = await hold(page, /\/\?_rsc=/);
    await page.goto(base + "/posts/joining-docusign/", { waitUntil: "domcontentloaded" });
    await waitShore(page);
    const home = page.locator("nav a[href='/']:visible");
    await press(page, home);
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => location.pathname), "/posts/joining-docusign/", "the homepage is still on its way");
    const waiting = await page.evaluate(() => ({
      leaving: document.querySelector("[data-page-frame]").hasAttribute("data-leaving"),
      opacity: parseFloat(getComputedStyle(document.querySelector("[data-page-frame]")).opacity),
    }));
    assert.equal(waiting.leaving, true);
    assert.ok(waiting.opacity < 0.75, `still bright at ${waiting.opacity}`);
    assert.equal(await home.evaluate((link) => link.classList.contains("nav-active")), true, "the navbar points home at the tap");
    assert.equal(await home.getAttribute("aria-current"), null, "aria-current still names the page on screen");
    release();
    await page.waitForURL(base + "/");
    await page.waitForTimeout(100);
    const arrived = await page.evaluate(() => ({
      leaving: document.querySelector("[data-page-frame]").hasAttribute("data-leaving"),
      opacity: getComputedStyle(document.querySelector("[data-page-frame]")).opacity,
    }));
    assert.deepEqual(arrived, { leaving: false, opacity: "1" });
    assert.equal(await home.getAttribute("aria-current"), "page");
  });

  await check("rapid taps end on the last page asked for, with its water", { device: phone }, async (page, context) => {
    if (browserName === "chromium") {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    }
    const targets = await page.locator("main a.pageLinkContainer[href^='/posts/']").evaluateAll(
      (links) => links.slice(0, 6).map((link) => link.getAttribute("href")),
    );
    await page.evaluate(async (hrefs) => {
      for (let round = 0; round < 4; round++) {
        for (const href of hrefs) {
          const link = document.querySelector(`main a[href='${href}']`);
          if (link) link.click();
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      }
      document.querySelector("nav a[href='/']")?.click();
      await new Promise((resolve) => setTimeout(resolve, 25));
    }, targets);
    // The last request above was home; ask for one post to end somewhere new.
    await page.evaluate(() => document.querySelector("main a[href^='/posts/']")?.click());
    const last = await page.evaluate(() => document.querySelector("main a[href^='/posts/']")?.getAttribute("href").split("#")[0]);
    await page.waitForURL(`**${last}`);
    await waitShore(page);
    await page.waitForTimeout(3500);
    const settled = await page.evaluate(() => ({
      leaving: document.querySelector("[data-page-frame]").hasAttribute("data-leaving"),
      sea: document.querySelector(".pixel-fluid-background").dataset.water,
      shore: document.querySelector(".pixel-shore").dataset.water,
    }));
    assert.deepEqual(settled, { leaving: false, sea: "off", shore: "on" });
  });

  await check("the shore rests once it settles, and wakes on a tap in open water", { path: "/posts/joining-docusign/" }, async (page) => {
    await waitShore(page);
    await page.waitForTimeout(3500);
    await page.evaluate(() => {
      window.shoreWrites = 0;
      const put = CanvasRenderingContext2D.prototype.putImageData;
      CanvasRenderingContext2D.prototype.putImageData = function (...args) {
        if (this.canvas.classList.contains("pixel-shore-canvas")) window.shoreWrites++;
        return put.apply(this, args);
      };
    });
    await page.waitForTimeout(2000);
    assert.equal(await page.evaluate(() => window.shoreWrites), 0, "a still shore draws nothing");
    await page.mouse.click(120, 500);
    await page.waitForTimeout(300);
    assert.ok(await page.evaluate(() => window.shoreWrites) > 0, "a tap in the margin moves the water");
  });

  await check("reduced motion: pages arrive at once and the water holds still", { reducedMotion: true }, async (page) => {
    await press(page, firstPost(page));
    await page.waitForURL("**/posts/**");
    await waitShore(page);
    await page.waitForTimeout(300);
    const running = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
    assert.equal(running, 0, "no animation runs");
    await page.evaluate(() => {
      window.shoreWrites = 0;
      const put = CanvasRenderingContext2D.prototype.putImageData;
      CanvasRenderingContext2D.prototype.putImageData = function (...args) {
        window.shoreWrites++;
        return put.apply(this, args);
      };
    });
    await page.waitForTimeout(1000);
    assert.equal(await page.evaluate(() => window.shoreWrites), 0);
  });

  await check("two visits to the same page keep their own places in history", { path: "/posts/compression-as-intelligence/" }, async (page) => {
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(300);
    await press(page, page.locator("nav a[href='/']:visible"));
    await page.waitForURL(base + "/");
    await page.waitForTimeout(600);
    await page.goto(base + "/posts/compression-as-intelligence/", { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo(0, 1600));
    await page.waitForTimeout(300);
    await page.goBack();
    await page.waitForURL(base + "/");
    await page.waitForTimeout(300);
    await page.goBack();
    await page.waitForURL("**/compression-as-intelligence/");
    await page.waitForTimeout(800);
    assert.equal(await page.evaluate(() => Math.round(window.scrollY)), 600, "the first visit comes back where it was left");
  });

  await check("choosing the current page while another loads leaves nothing dimmed", { path: "/about/" }, async (page) => {
    // As above: hold the homepage from before any prefetch can finish.
    const { release } = await hold(page, /\/\?_rsc=/);
    await page.goto(base + "/about/", { waitUntil: "domcontentloaded" });
    await waitShore(page);
    await press(page, page.locator("nav a[href='/']:visible"));
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => document.querySelector("[data-page-frame]").hasAttribute("data-leaving")), true, "the homepage is pending");
    await press(page, page.locator("nav a[href='/about/']:visible"));
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => ({
      path: location.pathname,
      leaving: document.querySelector("[data-page-frame]").hasAttribute("data-leaving"),
      pointing: document.querySelector("nav a[href='/about/'] .animated-underline")?.classList.contains("nav-active"),
      shore: document.querySelector(".pixel-shore").dataset.water,
    }));
    release();
    assert.deepEqual(after, { path: "/about/", leaving: false, pointing: true, shore: "on" });
  });

  await check("back across a jump to an anchor returns to the place before it", { path: "/jspark3/deepseek/" }, async (page) => {
    const anchor = page.locator("a[href='#results']", { hasText: "Benchmarks" });
    await page.evaluate(() => window.scrollTo(0, 180));
    await page.waitForTimeout(300);
    const box = await anchor.boundingBox();
    if (!box || box.y < 0 || box.y > 850) await anchor.evaluate((link) => link.click());
    else await press(page, anchor);
    await page.waitForFunction(() => location.hash.length > 1);
    await page.waitForTimeout(300);
    await page.goBack();
    await page.waitForFunction(() => !location.hash);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => Math.round(window.scrollY)), 180);
  });

  await check("back across an anchor jump taken from the top returns to the top", { path: "/jspark3/deepseek/" }, async (page) => {
    // Never scrolled: the page has no scroll event to remember it by.
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    await page.locator("a[href='#results']", { hasText: "Benchmarks" }).evaluate((link) => link.click());
    await page.waitForFunction(() => location.hash === "#results" && window.scrollY > 100);
    await page.goBack();
    await page.waitForFunction(() => !location.hash);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => Math.round(window.scrollY)), 0);
  });

  await check("back after a keyboard trip through the navbar hands focus back to it", { path: "/about/" }, async (page) => {
    await page.locator("nav a[href='/contact/']:visible").focus();
    await page.keyboard.press("Enter");
    await page.waitForURL("**/contact/");
    await page.waitForFunction(() => document.activeElement?.tagName === "H1");
    await page.goBack();
    await page.waitForURL("**/about/");
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("href")), "/contact/");
  });

  await check("the mobile menu still leaves through its own water", { device: phone }, async (page) => {
    await press(page, page.locator(".site-menu-button"));
    await page.waitForFunction(() => {
      const menu = document.querySelector(".site-menu");
      return !menu.hidden && !menu.style.clipPath;
    });
    await press(page, page.locator(".site-menu-link[href='/about/']"));
    await page.waitForURL("**/about/");
    await page.waitForFunction(() => document.querySelector(".site-menu").hidden, null, { timeout: 4000 });
    await waitShore(page);
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("site-menu-button")), true);
  });
} finally {
  await browser.close();
}
