// The glass post links and the site's no-shadow rule, in the browser.
// Run against a production build: node scripts/check-glass.mjs http://localhost:3871
// Optional: PLAYWRIGHT_MODULE, CHROME_PATH, GLASS_BROWSER=webkit, GLASS_TEST filter.
import assert from "node:assert/strict";
import test from "node:test";
const playwright = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browserName = process.env.GLASS_BROWSER || "chromium";
const chromium = browserName === "chromium";
const browser = await playwright[browserName].launch(
  chromium ? { executablePath: process.env.CHROME_PATH } : {},
);
const base = process.argv[2] || "http://localhost:3871";

const DEVICES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: chromium, hasTouch: true },
};
const LISTS = ["/", "/tags/project-showcase/"];
const PAGES = [...LISTS, "/about/", "/contact/", "/jspark3/", "/posts/apres-surf-club/"];

const check = (name, options, fn) => test(name, {
  skip: process.env.GLASS_TEST && !name.includes(process.env.GLASS_TEST),
}, async () => {
  const { device = "desktop", theme = "dark" } = options;
  const context = await browser.newContext({ ...DEVICES[device], colorScheme: theme });
  await context.addInitScript((theme) => {
    localStorage.setItem("theme", theme);
    localStorage.setItem("accent-index", "4");
  }, theme);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Leaving a page mid-prefetch makes WebKit report the aborted fetch as a
  // page error, so each page is left once its requests are done.
  let pending = 0;
  page.on("request", () => pending++);
  page.on("requestfinished", () => pending--);
  page.on("requestfailed", () => pending--);
  page.settled = async () => {
    for (let waited = 0; pending > 0 && waited < 5000; waited += 50) await page.waitForTimeout(50);
  };
  try {
    await fn(page, context);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

const open = async (page, path) => {
  await page.settled?.();
  await page.goto(base + path, { waitUntil: "load" });
  await page.waitForSelector('[role="switch"][aria-checked]');
  await page.evaluate(() => document.fonts.ready);
  // Let entrances finish: what matters is the page as it rests.
  await page.waitForFunction(() => document.getAnimations()
    .every((a) => a.playState !== "running" || a.effect.getComputedTiming().endTime === Infinity));
};

const cards = (page) => page.locator(".pageLinkContainer");

const glass = (page) => page.locator(".pageLinkContainer").first().evaluate((card) => {
  const style = getComputedStyle(card);
  const matrix = new DOMMatrixReadOnly(style.transform === "none" ? undefined : style.transform);
  return {
    glow: parseFloat(style.getPropertyValue("--glass-glow")) || 0,
    x: style.getPropertyValue("--glass-x").trim(),
    y: style.getPropertyValue("--glass-y").trim(),
    scale: matrix.a,
    backdrop: style.backdropFilter,
  };
});

try {
  for (const device of Object.keys(DEVICES)) {
    for (const theme of ["dark", "light"]) {
      await check(`${device} ${theme}: the water shows through one clean shape of glass`, { device, theme }, async (page) => {
        for (const path of LISTS) {
          await open(page, path);
          // The dock is pixel art: its corner steps across the surface radius
          // in two 2px pixels instead of curving.
          assert.match(await page.locator(".appearance-dock").evaluate((el) => getComputedStyle(el, "::before").clipPath), /^polygon\(0px 4px, 2px 4px, 2px 2px, 4px 2px, 4px 0px, /, "dock follows the surface radius");
          assert.equal(await page.locator(".appearance-dock-cell").first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius), "2px", "dock controls step down from the surface");
          const report = await page.evaluate(() => [...document.querySelectorAll(".pageLinkContainer")].map((card) => {
            const blur = /blur\(([\d.]+)px\)/.exec(getComputedStyle(card).backdropFilter);
            // Glass can only see the page through ancestors that do not start
            // a new backdrop (Chrome also counts a finished fade that holds).
            const stops = [];
            for (let el = card.parentElement; el && el !== document.documentElement; el = el.parentElement) {
              const s = getComputedStyle(el);
              if (s.opacity !== "1" || s.filter !== "none" || s.backdropFilter !== "none"
                || s.mixBlendMode !== "normal" || s.clipPath !== "none" || s.maskImage !== "none") {
                stops.push(`${el.tagName}.${el.className}`);
              }
              for (const animation of el.getAnimations()) {
                const fades = animation.effect.getKeyframes().some((frame) => "opacity" in frame);
                const holds = ["forwards", "both"].includes(animation.effect.getComputedTiming().fill);
                if (fades && holds) stops.push(`${el.tagName}.${el.className} (${animation.animationName})`);
              }
            }
            // Every layer shares the card's one rounded box: no border for
            // the frost to reach past, and a rim with the card's own inset
            // and curve, so no corner shows an edge the sides do not.
            const style = getComputedStyle(card);
            const rim = getComputedStyle(card, "::before");
            const shape = {
              border: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
              rimInset: [rim.top, rim.right, rim.bottom, rim.left],
              rimRadius: rim.borderTopLeftRadius === style.borderTopLeftRadius,
              radius: style.borderTopLeftRadius,
            };
            // A pinned badge stays beside its title, clear of the card rim.
            const badge = card.querySelector(".pinned-badge");
            const box = card.getBoundingClientRect();
            const badgeBox = badge?.getBoundingClientRect();
            const badgeInside = !badgeBox || (badgeBox.left >= box.left + 4 && badgeBox.right <= box.right - 4
              && badgeBox.top >= box.top + 4 && badgeBox.bottom <= box.bottom - 4);
            const noLegacyMark = !card.querySelector(".glass-mark");
            return { blur: blur ? parseFloat(blur[1]) : null, stops, shape, badgeInside, noLegacyMark };
          }));
          assert.ok(report.length > 0, `${path} has glass`);
          for (const { blur, stops, shape, badgeInside, noLegacyMark } of report) {
            assert.ok(blur !== null && blur >= 1 && blur <= 4, `${path}: a light frost, not a smear (${blur})`);
            assert.deepEqual(stops, [], `${path}: nothing between the glass and the water`);
            assert.deepEqual(shape, { border: ["0px", "0px", "0px", "0px"], rimInset: ["0px", "0px", "0px", "0px"], rimRadius: true, radius: "4px" }, `${path}: one shape for every layer`);
            assert.ok(badgeInside, `${path}: badge stays clear of the card rim`);
            assert.ok(noLegacyMark, `${path}: no legacy square`);
          }
        }
      });

      await check(`${device} ${theme}: no shadows`, { device, theme }, async (page) => {
        for (const path of PAGES) {
          await open(page, path);
          if (path === "/posts/apres-surf-club/") await page.waitForSelector("pre code");
          if (path === "/" && device === "desktop") {
            // The post preview that opens over the list.
            await cards(page).nth(2).scrollIntoViewIfNeeded();
            const box = await cards(page).nth(2).boundingBox();
            await page.mouse.move(box.x + 40, box.y + box.height / 2);
            await page.waitForSelector("[data-radix-popper-content-wrapper] [data-state=open]");
            await page.waitForTimeout(400);
          }
          const shadows = await page.evaluate(() => {
            document.activeElement?.blur?.();
            const layers = (value) => value.split(/,(?![^(]*\))/).map((layer) => layer.trim());
            const visible = (layer) => {
              const color = /rgba?\(([^)]+)\)/.exec(layer);
              if (!color) return !/transparent/.test(layer);
              const parts = color[1].split(/[\s,/]+/).filter(Boolean);
              return parts.length < 4 || parseFloat(parts[3]) > 0;
            };
            const found = [];
            for (const el of document.querySelectorAll("body *")) {
              for (const pseudo of [null, "::before", "::after"]) {
                const s = getComputedStyle(el, pseudo);
                if (pseudo && s.content === "none") continue;
                const box = s.boxShadow !== "none" && layers(s.boxShadow).some(visible);
                const text = s.textShadow !== "none" && layers(s.textShadow).some(visible);
                const drop = /drop-shadow/.test(s.filter);
                if (box || text || drop) {
                  found.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}${pseudo ?? ""}: ${box ? s.boxShadow : text ? s.textShadow : s.filter}`);
                }
              }
            }
            return found;
          });
          assert.deepEqual(shadows, [], path);
        }
      });
    }
  }


  await check("pinned badges: no layout changes across sizes, themes and accents", {}, async (page) => {
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of LISTS) {
        await open(page, path);
        for (const theme of ["dark", "light"]) {
          await page.evaluate(theme => document.documentElement.classList.toggle("dark", theme === "dark"), theme);
          for (const accent of [0, 1, 2, 3, 4]) {
            await page.evaluate(accent => { document.documentElement.dataset.accent = String(accent); }, accent);
            const report = await page.locator(".pinned-badge").evaluateAll(badges => badges.map(badge => {
              const card = badge.closest(".pageLinkContainer");
              const anchor = badge.parentElement;
              const title = anchor.parentElement;
              const box = card.getBoundingClientRect();
              const badgeBox = badge.getBoundingClientRect();
              const measure = node => {
                const rect = el => {
                  const r = el.getBoundingClientRect();
                  return [r.x - box.x, r.y - box.y, r.width, r.height];
                };
                const range = document.createRange();
                range.selectNode(node);
                return { card: [card.getBoundingClientRect().width, card.getBoundingClientRect().height],
                  title: rect(title), meta: rect(title.nextElementSibling),
                  text: [...range.getClientRects()].map(r => [r.x - box.x, r.y - box.y, r.width, r.height]) };
              };
              const decorated = measure(anchor.firstChild);
              const node = document.createTextNode(anchor.firstChild.textContent);
              anchor.replaceWith(node);
              const original = measure(node);
              node.replaceWith(anchor);
              return { decorated, original, label: card.getAttribute("aria-label"),
                width: badgeBox.width, height: badgeBox.height,
                inside: badgeBox.left >= box.left + 4 && badgeBox.right <= box.right - 4 && badgeBox.top >= box.top + 4 && badgeBox.bottom <= box.bottom - 4,
                clearOfType: decorated.text.every(r => badgeBox.left >= box.left + r[0] + r[2] + 3),
                hidden: badge.getAttribute("aria-hidden") };
            }));
            assert.ok(report.length > 0, `${path}: pinned badges are present`);
            assert.equal(await page.locator(".glass-mark").count(), 0);
            for (const entry of report) {
              assert.deepEqual(entry.decorated, entry.original, `${width} ${theme} ${accent} ${path}: original card, title, text and metadata geometry`);
              assert.ok(entry.width <= 28 && entry.height <= 16 && entry.width > 6);
              assert.equal(entry.inside, true, "badge stays in existing air inside the card");
              assert.equal(entry.clearOfType, true, "badge does not cover any title text");
              assert.match(entry.label, /^View pinned post: /);
              assert.equal(entry.hidden, "true", "post link announces the pinned status once");
            }
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, "/");
    const pinned = page.locator(".pageLinkContainer").filter({ has: page.locator(".pinned-badge") }).first();
    await pinned.focus();
    const href = await pinned.getAttribute("href");
    await page.keyboard.press("Enter");
    await page.waitForURL(new URL(href, base).href);
  });

  if (chromium) await check("pinned badges: preference reductions and forced colors preserve the mark", {}, async (page, context) => {
    const cdp = await context.newCDPSession(page);
    for (const features of [
      [{ name: "prefers-reduced-motion", value: "reduce" }],
      [{ name: "prefers-reduced-transparency", value: "reduce" }],
      [{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-reduced-transparency", value: "reduce" }],
      [{ name: "forced-colors", value: "active" }],
    ]) {
      await cdp.send("Emulation.setEmulatedMedia", { features });
      await open(page, "/");
      const report = await page.locator(".pinned-badge").evaluateAll(badges => badges.map(badge => ({
        visible: getComputedStyle(badge).display !== "none" && getComputedStyle(badge).visibility === "visible",
        moving: badge.getAnimations({ subtree: true }).filter(a => a.playState === "running").length,
        label: badge.closest("a").getAttribute("aria-label"),
      })));
      assert.ok(report.length > 0);
      for (const entry of report) {
        assert.equal(entry.visible, true);
        assert.equal(entry.moving, 0);
        assert.match(entry.label, /^View pinned post: /);
      }
    }
  });

  await check("desktop: hover and press light the glass", {}, async (page) => {
    await open(page, "/");
    const card = cards(page).nth(3);
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    const url = page.url();
    await page.mouse.move(box.x + 120, box.y + 20, { steps: 4 });
    await page.waitForTimeout(700);
    const hover = await card.evaluate((el) => {
      const s = getComputedStyle(el);
      return { glow: parseFloat(s.getPropertyValue("--glass-glow")), x: s.getPropertyValue("--glass-x").trim(), y: s.getPropertyValue("--glass-y").trim(), scale: new DOMMatrixReadOnly(s.transform).a };
    });
    assert.ok(Math.abs(hover.glow - 0.45) < 0.02, `hover glow ${hover.glow}`);
    assert.ok(hover.scale > 1, "the glass lifts");
    assert.ok(Math.abs(parseFloat(hover.x) - 120) <= 3 && Math.abs(parseFloat(hover.y) - 20) <= 3, `light at the pointer (${hover.x}, ${hover.y})`);
    await page.mouse.down();
    await page.waitForTimeout(250);
    const press = await card.evaluate((el) => {
      const s = getComputedStyle(el);
      return { glow: parseFloat(s.getPropertyValue("--glass-glow")), scale: new DOMMatrixReadOnly(s.transform).a };
    });
    assert.equal(press.glow, 1);
    assert.ok(press.scale < 1, "the glass gives under the press");
    // Released off the glass, it is not a click.
    await page.mouse.move(4, 4);
    await page.mouse.up();
    await page.waitForTimeout(800);
    assert.equal(page.url(), url);
    const rest = await card.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue("--glass-glow")));
    assert.equal(rest, 0);
  });

  await check("phone: a touch lights the glass from the finger", { device: "phone" }, async (page, context) => {
    await open(page, "/");
    const card = cards(page).nth(2);
    const box = await card.boundingBox();
    const x = box.x + 60;
    const y = box.y + box.height / 2;
    if (chromium) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      await page.waitForTimeout(150);
      const light = await card.evaluate((el) => [el.style.getPropertyValue("--glass-x"), el.style.getPropertyValue("--glass-y")]);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
      assert.deepEqual(light, [`${Math.round(x - box.x)}px`, `${Math.round(y - box.y)}px`]);
    } else {
      await page.touchscreen.tap(x, y);
      await page.waitForURL(/\/posts\//);
    }
  });

  await check("reduced motion: the glass lights without moving", {}, async (page) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, "/");
    const box = await cards(page).first().boundingBox();
    await page.mouse.move(box.x + 60, box.y + 20);
    await page.waitForTimeout(100);
    assert.equal((await glass(page)).scale, 1);
    await page.mouse.down();
    await page.waitForTimeout(100);
    const pressed = await glass(page);
    assert.equal(pressed.scale, 1);
    assert.equal(pressed.glow, 1);
    await page.mouse.move(4, 4);
    await page.mouse.up();
  });

  if (chromium) await check("forced colors: each link is solid with a plain outline", {}, async (page) => {
    await page.emulateMedia({ forcedColors: "active" });
    await open(page, "/");
    const style = await cards(page).first().evaluate((el) => {
      const s = getComputedStyle(el);
      return { border: s.borderTopColor, width: s.borderTopWidth, rim: getComputedStyle(el, "::before").display, backdrop: s.backdropFilter, background: s.backgroundColor };
    });
    assert.notEqual(style.border, "rgba(0, 0, 0, 0)");
    assert.match(style.background, /^rgb\(/, "a solid link");
    assert.equal(style.width, "1px");
    assert.equal(style.rim, "none");
    assert.equal(style.backdrop, "none");
  });

  if (chromium) {
    await check("reduced transparency: the glass turns solid", {}, async (page, context) => {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
      });
      await open(page, "/");
      const style = await cards(page).first().evaluate((el) => {
        const s = getComputedStyle(el);
        return { backdrop: s.backdropFilter, background: s.backgroundColor };
      });
      assert.equal(style.backdrop, "none");
      assert.match(style.background, /^rgb\(/, "an opaque fill");
    });
  }
} finally {
  await browser.close();
}
