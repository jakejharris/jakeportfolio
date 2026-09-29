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
  await page.goto(base + path, { waitUntil: "networkidle" });
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
      await check(`${device} ${theme}: the water shows through the glass`, { device, theme }, async (page) => {
        for (const path of LISTS) {
          await open(page, path);
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
            return { blur: blur ? parseFloat(blur[1]) : null, stops };
          }));
          assert.ok(report.length > 0, `${path} has glass`);
          for (const { blur, stops } of report) {
            assert.ok(blur !== null && blur >= 1 && blur <= 4, `${path}: a light frost, not a smear (${blur})`);
            assert.deepEqual(stops, [], `${path}: nothing between the glass and the water`);
          }
        }
      });

      await check(`${device} ${theme}: no shadows`, { device, theme }, async (page) => {
        for (const path of PAGES) {
          await open(page, path);
          if (path === "/posts/apres-surf-club/") await page.waitForSelector("pre code");
          if (path === "/" && device === "desktop") {
            // The post preview that opens over the list.
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
