"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, KeyboardEvent, MouseEvent } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { useNavbarScroll } from "./NavbarScrollContext";
import { disturbWater } from "./pixel-fluid/disturb";
import { focusQuietly } from "../lib/focus-intent";
import { floodTheme, isThemeFloodActive } from "../lib/pixel-tide";
import { BURST_GAP_MS, Burst, dropFlight, dropsFor, FOLD_MS, heatOf, MAX_DROPS } from "../lib/dock-play";
import "../css/appearance-dock.css";

// Theme and accent controls, docked in the bottom right corner as a little
// window from a 16-bit game, drawn in 2px pixels around the pixel water's
// square cells. Folded, it shows the chosen color and the theme button, which
// is always there and never moves. A press on the color unrolls the palette
// to its left: the window opens a few frames at a time while the strip of
// colors slides under it, so the chosen one travels from the fold to its
// place, wearing the cursor. A new accent is poured into the water from its
// swatch; a theme switch floods the page from the button. Once a color is
// picked and the presses stop, the palette rolls back up by itself.
//
// It is also a toy. Every press pours its swatch's color into the water, the
// color already chosen included, and presses in quick succession build: their
// rings travel out together, from the third press the cell flicks drops of
// its color out over the page, and the hotter the burst, the more of the
// water takes the paint before it washes out. The theme button rolls day and
// night in from the corner, one sweep after another.

const STORAGE_KEY = "accent-index";
const ACCENTS = ["Mono", "Red", "Blue", "Green", "Amber"];
// The dock hops above the site footer once the footer is this close below
// the screen, so it is out of the way before the footer arrives.
const LIFT_AHEAD = 64;

// 9 x 9 pixel icons, one string per row.
const SUN = [
  "....#....",
  ".#.....#.",
  "...###...",
  "..#####..",
  "#.#####.#",
  "..#####..",
  "...###...",
  ".#.....#.",
  "....#....",
];
const MOON = [
  "...##....",
  "..##.....",
  ".###.....",
  ".###.....",
  ".####....",
  ".#####..#",
  "..#######",
  "...#####.",
  "....###..",
];

// A pressed cell's content dips and springs back in pixel steps: 18px to 14,
// then 20, then 18.
const PRESS: Keyframe[] = [
  { transform: "scale(0.7778)", easing: "steps(1, end)" },
  { transform: "scale(1.1111)", offset: 0.4, easing: "steps(1, end)" },
  { transform: "scale(1)" },
];
const PRESS_MS = 150;
// The theme button's new icon rises into its cell in three 6px steps, at the
// menu button's 45ms a frame.
const RISE: Keyframe[] = [
  { transform: "translateY(100%)", easing: "steps(3, jump-start)" },
  { transform: "translateY(0)" },
];
const RISE_MS = 135;
// A drop in flight trails a fainter dot this many steps behind it.
const TRAIL_STEPS = 2;
// React 18 writes `inert` only from a string; its types already expect
// React 19's boolean.
const INERT = { inert: "" } as unknown as HTMLAttributes<HTMLDivElement>;

/** One path through the lit pixels of `rows`, a run of a row at a time. */
function pixelPath(rows: string[]) {
  let path = "";
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== "#") continue;
      const start = x;
      while (row[x + 1] === "#") x++;
      const run = x - start + 1;
      path += `M${start} ${y}h${run}v1h-${run}z`;
    }
  });
  return path;
}

function PixelIcon({ rows, className }: { rows: string[]; className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 9 9"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path d={pixelPath(rows)} />
    </svg>
  );
}

// The sun and moon never change, so they are made once and React passes over
// them whenever the dock renders again.
const THEME_ICONS = (
  <span className="appearance-dock-icon">
    <PixelIcon rows={SUN} className="appearance-dock-sun" />
    <PixelIcon rows={MOON} className="appearance-dock-moon" />
  </span>
);

function center(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function calm() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function press(target: Element | null | undefined) {
  if (!target) return;
  for (const animation of target.getAnimations()) animation.cancel();
  target.animate(PRESS, { duration: PRESS_MS });
}

/**
 * Flick `count` drops of `color` from `from` out over the page. Each hops
 * across the lattice's dots with a fainter dot trailing it, and lands in
 * the water: a ripple, wherever there is water.
 */
function fling(layer: HTMLElement, from: HTMLElement, color: string, count: number) {
  if (!count || layer.childElementCount >= MAX_DROPS) return;
  const { x, y } = center(from);
  const box = layer.getBoundingClientRect();
  for (let i = 0; i < count && layer.childElementCount + 2 <= MAX_DROPS; i++) {
    const flight = dropFlight(x, y);
    const frames: Keyframe[] = flight.path.map(({ x: dx, y: dy }) => ({
      transform: `translate(${dx}px, ${dy}px)`,
      easing: "steps(1, end)",
    }));
    const step = flight.duration / (frames.length - 1);
    for (const trail of [false, true]) {
      const drop = document.createElement("span");
      drop.className = "appearance-dock-drop";
      drop.style.background = color;
      drop.style.left = `${flight.left - box.left}px`;
      drop.style.top = `${flight.top - box.top}px`;
      if (trail) drop.style.opacity = "0.4";
      layer.append(drop);
      const animation = drop.animate(frames, {
        duration: flight.duration,
        delay: trail ? step * TRAIL_STEPS : 0,
        fill: "both",
      });
      animation.onfinish = () => {
        drop.remove();
        if (!trail) disturbWater({ x: flight.x, y: flight.y });
      };
      animation.oncancel = () => drop.remove();
    }
  }
}

export default function AppearanceDock() {
  const { resolvedTheme, setTheme } = useTheme();
  const { mobileVisible } = useNavbarScroll();
  const [mounted, setMounted] = useState(false);
  const [accent, setAccent] = useState(0);
  const accentRef = useRef(0);
  const accentFrame = useRef(0);
  // The pour waiting for the next frame: where from, and how hot.
  const pour = useRef<{ x: number; y: number; heat: number } | null>(null);
  const requestedTheme = useRef(resolvedTheme);
  const burst = useRef(new Burst());
  const cooling = useRef(0);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  // Folding by itself: armed by a pick with a pointer, held off while a
  // mouse rests on the dock.
  const foldTimer = useRef(0);
  const picked = useRef(false);
  const resting = useRef(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const dropsRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isDark = resolvedTheme === "dark";
  const paletteId = useId();

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // A blocked preference store must not prevent the page from mounting.
    }
    const active = stored ?? document.documentElement.getAttribute("data-accent");
    const index = active === null ? 0 : parseInt(active, 10);
    if (index >= 0 && index < ACCENTS.length) {
      accentRef.current = index;
      setAccent(index);
    }
    setMounted(true);
    const drops = dropsRef.current;
    return () => {
      cancelAnimationFrame(accentFrame.current);
      window.clearTimeout(cooling.current);
      window.clearTimeout(foldTimer.current);
      drops?.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    };
  }, []);

  useEffect(() => {
    requestedTheme.current = resolvedTheme;
  }, [resolvedTheme]);

  // Roll the palette back up into the chosen color. `refocus` hands focus to
  // the toggle, so a key press still reaches the dock.
  const fold = useCallback((refocus: boolean) => {
    window.clearTimeout(foldTimer.current);
    picked.current = false;
    if (!openRef.current) return;
    openRef.current = false;
    flushSync(() => setOpen(false));
    if (refocus) focusQuietly(toggleRef.current);
  }, []);

  // After a pick with a pointer the palette folds once the presses stop, but
  // not from under a resting mouse: then it waits for the mouse to leave.
  const foldLater = useCallback(() => {
    window.clearTimeout(foldTimer.current);
    if (!picked.current || !openRef.current || resting.current) return;
    foldTimer.current = window.setTimeout(() => {
      // Focus left on a folded color would fall to the page.
      fold(swatchRefs.current.some((swatch) => swatch === document.activeElement));
    }, FOLD_MS);
  }, [fold]);

  useEffect(() => {
    // During a root snapshot the browser hit-tests the captured page as
    // <html>, even with pointer-events disabled on the transition overlay.
    // Keep just the dock usable so another pick can join the flood.
    const forward = (x: number, y: number) => {
      const buttons = dockRef.current?.querySelectorAll("button");
      if (!buttons) return;
      for (const button of buttons) {
        // Folded colors and the toggle under the open palette still have a
        // box, but nothing there to press.
        if (button.closest("[inert]") || getComputedStyle(button).visibility === "hidden") continue;
        const rect = button.getBoundingClientRect();
        if (rect.width && rect.height && x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom) {
          focusQuietly(button);
          // A press like any other, so a pick here can fold the palette.
          button.dispatchEvent(new globalThis.MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
          return;
        }
      }
      fold(false);
    };
    const captured = (event: Event) => event.target === document.documentElement && isThemeFloodActive();
    // WebKit does not turn a tap on <html> into a click at all, so a touch
    // that lands and lifts in place is forwarded as it lifts, and a click
    // that may still follow it is let go.
    let touch: { id: number; x: number; y: number; at: number } | null = null;
    let tapped = -Infinity;
    const handleCapturedDown = (event: PointerEvent) => {
      touch = event.pointerType !== "mouse" && captured(event)
        ? { id: event.pointerId, x: event.clientX, y: event.clientY, at: event.timeStamp }
        : null;
    };
    const handleCapturedUp = (event: PointerEvent) => {
      const down = touch;
      touch = null;
      // The flood may have ended since the touch landed; it still counts.
      if (!down || down.id !== event.pointerId || event.target !== document.documentElement) return;
      if (event.timeStamp - down.at > 500 || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 10) return;
      tapped = performance.now();
      forward(event.clientX, event.clientY);
    };
    const handleCapturedClick = (event: globalThis.MouseEvent) => {
      if (!captured(event) || performance.now() - tapped < 700) return;
      forward(event.clientX, event.clientY);
    };
    document.addEventListener("pointerdown", handleCapturedDown);
    document.addEventListener("pointerup", handleCapturedUp);
    document.addEventListener("click", handleCapturedClick);
    return () => {
      document.removeEventListener("pointerdown", handleCapturedDown);
      document.removeEventListener("pointerup", handleCapturedUp);
      document.removeEventListener("click", handleCapturedClick);
    };
  }, [fold]);

  // Ride above the site footer while it is near, so the dock never covers its
  // links: one hop up as the footer comes, one back down as it goes. Nothing
  // runs while the page scrolls, and a page that opens with its footer in
  // view starts out lifted, without a hop.
  useEffect(() => {
    const footer = document.querySelector<HTMLElement>("[data-site-footer]");
    const dock = dockRef.current;
    if (!footer || !dock || typeof IntersectionObserver === "undefined") return;
    let first = true;
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const lift = entry.isIntersecting ? Math.round(entry.boundingClientRect.height) : 0;
        if (first) {
          first = false;
          dock.dataset.still = "";
          frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => delete dock.dataset.still);
          });
        }
        dock.style.setProperty("--dock-lift", `${lift}px`);
        dock.toggleAttribute("data-ashore", lift > 0);
      },
      { rootMargin: `0px 0px ${LIFT_AHEAD}px 0px` },
    );
    observer.observe(footer);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  // Fold the palette on a press anywhere else.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target === document.documentElement && isThemeFloodActive()) return;
      if (!dockRef.current?.contains(event.target as Node)) fold(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, fold]);

  // The toggle is hidden while the palette is open. Move focus in the same
  // commit so an immediate Escape reaches the palette, not the menu behind it.
  useLayoutEffect(() => {
    if (open) focusQuietly(swatchRefs.current[accentRef.current]);
  }, [open]);

  // Every press counts toward the burst and answers in the dock: `dip`, the
  // pressed cell's content, dips; a hot burst flicks drops of `color` and
  // warms the dock's frame. Returns how hot the burst is.
  const play = (cell: HTMLElement, color: string, dip = cell.firstElementChild) => {
    window.clearTimeout(foldTimer.current);
    const count = burst.current.press(performance.now());
    if (calm()) return 0;
    const dock = dockRef.current;
    press(dip);
    if (dropsRef.current) fling(dropsRef.current, cell, color, dropsFor(count));
    if (dock && count > 2) {
      dock.dataset.hot = "";
      dock.style.setProperty("--dock-heat", String(heatOf(count)));
      dock.style.setProperty("--dock-ink", color);
      window.clearTimeout(cooling.current);
      cooling.current = window.setTimeout(() => {
        delete dock.dataset.hot;
        dock.style.setProperty("--dock-heat", "0");
      }, BURST_GAP_MS);
    }
    return heatOf(count);
  };

  const openPalette = (event: MouseEvent<HTMLButtonElement>) => {
    // The folded window shows the chosen color, so that is what dips.
    play(event.currentTarget, "var(--accent-color)", swatchRefs.current[accentRef.current]?.firstElementChild);
    picked.current = false;
    openRef.current = true;
    setOpen(true);
  };

  // Only the last press before paint needs a pour or a page-wide restyle.
  // Its origin is read before <html> changes, so a burst does not alternate
  // layout reads with global color writes hundreds of times.
  const applyAccent = () => {
    accentFrame.current = 0;
    const origin = pour.current;
    pour.current = null;
    const index = accentRef.current;
    const root = document.documentElement;
    const again = (root.getAttribute("data-accent") ?? "0") === String(index);
    if (origin) disturbWater({ x: origin.x, y: origin.y, dye: true, again, heat: origin.heat });
    if (!again) {
      if (index === 0) root.removeAttribute("data-accent");
      else root.setAttribute("data-accent", String(index));
    }
    // Saved even when unchanged: a first visit's color becomes a choice.
    try {
      localStorage.setItem(STORAGE_KEY, String(index));
    } catch {}
  };

  // `pointer`: picked with a finger or a mouse, rather than with keys.
  const pickAccent = (index: number, from: HTMLElement, pointer: boolean) => {
    const heat = play(from, `var(--accent-${index})`);
    // One press on the color already chosen folds the palette; pressed again
    // and again, it pours again.
    const done = index === accentRef.current && burst.current.count < 2;
    accentRef.current = index;
    pour.current = { ...center(from), heat };
    if (!accentFrame.current) accentFrame.current = requestAnimationFrame(applyAccent);
    setAccent(index);
    if (done) {
      fold(true);
      return;
    }
    // Keys walk the palette and leave it open.
    picked.current = pointer;
    foldLater();
  };

  // Theme requests only change what the page should end up as; the flood
  // applies the newest one when the browser is ready for it.
  const shownTheme = () => (document.documentElement.classList.contains("dark") ? "dark" : "light");

  const applyTheme = () => {
    const next = requestedTheme.current === "dark" ? "dark" : "light";
    // Switch <html> right away, as next-themes would a frame later, so the
    // new page is already in the new theme when the flood starts. CSS
    // transitions stay off during the switch, like disableTransitionOnChange.
    const root = document.documentElement;
    const freeze = document.createElement("style");
    freeze.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.appendChild(freeze);
    root.classList.remove("light", "dark");
    root.classList.add(next);
    root.style.colorScheme = next;
    flushSync(() => setTheme(next));
    window.getComputedStyle(document.body);
    setTimeout(() => freeze.remove(), 1);
    // The new sky's icon rises into the button.
    if (!calm()) {
      dockRef.current
        ?.querySelector(next === "dark" ? ".appearance-dock-sun" : ".appearance-dock-moon")
        ?.animate(RISE, RISE_MS);
    }
  };

  const switchTheme = (event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    play(button, "currentColor");
    foldLater();
    requestedTheme.current = (requestedTheme.current ?? shownTheme()) === "dark" ? "light" : "dark";
    const origin = center(button);
    disturbWater(origin);
    floodTheme(applyTheme, origin.x, origin.y, () => requestedTheme.current !== shownTheme());
  };

  // Arrow keys move through the palette and pick as they go, like any radio
  // group. Escape folds it back into the single swatch.
  const handlePaletteKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (event.key === "Escape") {
      event.preventDefault();
      fold(true);
    } else if (step) {
      event.preventDefault();
      const index = (accentRef.current + step + ACCENTS.length) % ACCENTS.length;
      const swatch = swatchRefs.current[index];
      if (swatch) {
        focusQuietly(swatch);
        pickAccent(index, swatch, false);
      }
    }
  };

  return (
    <div
      ref={dockRef}
      role="group"
      aria-label="Appearance"
      className="appearance-dock"
      data-open={open || undefined}
      data-tucked={!mobileVisible || undefined}
      onBlur={(event) => {
        // Only a focus move to somewhere else closes it. Safari moves focus to
        // nothing when a button is clicked, which must not count.
        const next = event.relatedTarget as Node | null;
        if (open && next && !event.currentTarget.contains(next)) fold(false);
      }}
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        resting.current = true;
        window.clearTimeout(foldTimer.current);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return;
        resting.current = false;
        foldLater();
      }}
    >
      <span ref={dropsRef} className="appearance-dock-drops" aria-hidden="true" />
      {/* The palette's window: one cell wide when folded, five when open. */}
      <div className="appearance-dock-reel">
        <div
          id={paletteId}
          role="radiogroup"
          aria-label="Accent color"
          className="appearance-dock-palette"
          onKeyDown={handlePaletteKeys}
          // Folded, the strip only shows the chosen color through the window;
          // none of it can be reached until it opens.
          {...(open ? null : INERT)}
        >
          <span className="appearance-dock-cursor" aria-hidden="true" />
          {ACCENTS.map((name, index) => (
            <button
              key={name}
              ref={(element) => {
                swatchRefs.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={accent === index}
              aria-label={name}
              title={name}
              tabIndex={accent === index ? 0 : -1}
              className="appearance-dock-cell"
              data-swatch={index}
              onClick={(event) => pickAccent(index, event.currentTarget, event.detail > 0)}
            >
              <span className="appearance-dock-swatch" style={{ "--swatch": `var(--accent-${index})` } as CSSProperties} />
            </button>
          ))}
        </div>
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls={paletteId}
          aria-label={mounted ? `Accent color: ${ACCENTS[accent]}` : "Accent color"}
          title="Accent color"
          className="appearance-dock-cell appearance-dock-toggle"
          onClick={openPalette}
        />
      </div>
      <span className="appearance-dock-rule" aria-hidden="true" />
      <button
        type="button"
        role="switch"
        aria-checked={mounted ? isDark : undefined}
        aria-label="Dark mode"
        title={mounted ? (isDark ? "Switch to light" : "Switch to dark") : "Theme"}
        className="appearance-dock-cell appearance-dock-theme"
        onClick={switchTheme}
      >
        {THEME_ICONS}
      </button>
    </div>
  );
}
