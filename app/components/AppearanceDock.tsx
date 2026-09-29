"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { useNavbarScroll } from "./NavbarScrollContext";
import { disturbWater } from "./pixel-fluid/disturb";
import { floodTheme, isThemeFloodActive } from "../lib/pixel-tide";
import { BURST_GAP_MS, Burst, dropFlight, dropsFor, heatOf, MAX_DROPS } from "../lib/dock-play";
import "../css/appearance-dock.css";

// Theme and accent controls, docked in the bottom right corner in the same
// square cells as the pixel water. A new accent is poured into the water from
// its swatch; a theme switch floods the page from the button. With a mouse on
// a wide screen all five swatches show; elsewhere they fold into one.
//
// It is also a toy. Every press pours its swatch's color into the water, the
// color already chosen included, and presses in quick succession build: their
// rings travel out together, from the third press the cell flicks drops of
// its color out over the page, and the hotter the burst, the more of the
// water takes the paint before it washes out. The theme button rolls day and
// night in from the corner, one sweep after another.

const STORAGE_KEY = "accent-index";
const ACCENTS = ["Mono", "Red", "Blue", "Green", "Amber"];

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
// A drop in flight trails a fainter dot this many steps behind it.
const TRAIL_STEPS = 2;

function PixelIcon({ rows, className }: { rows: string[]; className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 9 9"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {rows.flatMap((row, y) =>
        [...row].map((pixel, x) =>
          pixel === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null
        )
      )}
    </svg>
  );
}

function center(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function calm() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function press(target: Element | null) {
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
  const dockRef = useRef<HTMLDivElement>(null);
  const dropsRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isDark = resolvedTheme === "dark";
  const paletteId = useId();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
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
      drops?.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    };
  }, []);

  useEffect(() => {
    requestedTheme.current = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    // During a root snapshot the browser hit-tests the captured page as
    // <html>, even with pointer-events disabled on the transition overlay.
    // Keep just the dock usable so another pick can interrupt the flood.
    const handleCapturedClick = (event: globalThis.MouseEvent) => {
      if (event.target !== document.documentElement || !isThemeFloodActive()) return;
      const buttons = dockRef.current?.querySelectorAll("button");
      if (!buttons) return;
      for (const button of buttons) {
        const rect = button.getBoundingClientRect();
        if (rect.width && rect.height && event.clientX >= rect.left && event.clientX < rect.right
          && event.clientY >= rect.top && event.clientY < rect.bottom) {
          button.focus({ preventScroll: true });
          button.click();
          return;
        }
      }
      setOpen(false);
    };
    document.addEventListener("click", handleCapturedClick);
    return () => document.removeEventListener("click", handleCapturedClick);
  }, []);

  // Ride above the site footer once it comes into view, so the dock never
  // covers its links. Page height changes on client navigation, not only on
  // scroll, so watch the body too.
  useEffect(() => {
    const footer = document.querySelector<HTMLElement>("[data-site-footer]");
    const dock = dockRef.current;
    if (!footer || !dock) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const lift = Math.max(0, window.innerHeight - footer.getBoundingClientRect().top);
        dock.style.setProperty("--dock-lift", `${Math.round(lift)}px`);
      });
    };
    const bodySize = new ResizeObserver(update);
    bodySize.observe(document.body);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      bodySize.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Close the palette on a click or tap anywhere else.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target === document.documentElement && isThemeFloodActive()) return;
      if (!dockRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  // The toggle disappears when the palette opens. Move focus in the same
  // commit so an immediate Escape reaches the palette, not the menu behind it.
  useLayoutEffect(() => {
    if (open) swatchRefs.current[accentRef.current]?.focus();
  }, [open]);

  // Every press counts toward the burst and answers in the dock: the cell
  // dips, a hot burst flicks drops of `color` and warms the dock's edge.
  // Returns how hot the burst is.
  const play = (cell: HTMLElement, color: string) => {
    const count = burst.current.press(performance.now());
    if (calm()) return 0;
    const dock = dockRef.current;
    press(cell.firstElementChild);
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
    play(event.currentTarget, "var(--accent-color)");
    setOpen(true);
  };

  // Folding back only means something where the palette folds.
  const closePalette = () => {
    if (!open) return;
    flushSync(() => setOpen(false));
    toggleRef.current?.focus();
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

  const pickAccent = (index: number, from: HTMLElement) => {
    const heat = play(from, `var(--accent-${index})`);
    // One press on the color already chosen folds the palette; pressed again
    // and again, it pours again.
    if (index === accentRef.current && burst.current.count < 2) closePalette();
    accentRef.current = index;
    pour.current = { ...center(from), heat };
    if (!accentFrame.current) accentFrame.current = requestAnimationFrame(applyAccent);
    setAccent(index);
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
  };

  const switchTheme = (event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    play(button, "currentColor");
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
      closePalette();
    } else if (step) {
      event.preventDefault();
      const index = (accentRef.current + step + ACCENTS.length) % ACCENTS.length;
      const swatch = swatchRefs.current[index];
      if (swatch) {
        swatch.focus();
        pickAccent(index, swatch);
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
        if (open && next && !event.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <span ref={dropsRef} className="appearance-dock-drops" aria-hidden="true" />
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={paletteId}
        aria-label={mounted ? `Accent color: ${ACCENTS[accent]}` : "Accent color"}
        title="Accent color"
        className="appearance-dock-cell appearance-dock-toggle"
        onClick={openPalette}
      >
        <span className="appearance-dock-swatch" style={{ background: "var(--accent-color)" }} />
      </button>
      <div
        id={paletteId}
        role="radiogroup"
        aria-label="Accent color"
        className="appearance-dock-palette"
        onKeyDown={handlePaletteKeys}
      >
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
            style={{ "--swatch-index": index } as React.CSSProperties}
            onClick={(event) => pickAccent(index, event.currentTarget)}
          >
            <span className="appearance-dock-swatch" style={{ background: `var(--accent-${index})` }} />
          </button>
        ))}
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
        <span className="appearance-dock-icon">
          <PixelIcon rows={SUN} className="appearance-dock-sun" />
          <PixelIcon rows={MOON} className="appearance-dock-moon" />
        </span>
      </button>
    </div>
  );
}
