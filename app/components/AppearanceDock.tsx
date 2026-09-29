"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { useNavbarScroll } from "./NavbarScrollContext";
import { disturbWater } from "./pixel-fluid/disturb";
import { floodTheme, isThemeFloodActive } from "../lib/pixel-tide";
import "../css/appearance-dock.css";

// Theme and accent controls, docked in the bottom right corner in the same
// square cells as the pixel water. A new accent is poured into the water from
// its swatch; a theme switch floods the page from the button. With a mouse on
// a wide screen all five swatches show; elsewhere they fold into one.

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

export default function AppearanceDock() {
  const { resolvedTheme, setTheme } = useTheme();
  const { mobileVisible } = useNavbarScroll();
  const [mounted, setMounted] = useState(false);
  const [accent, setAccent] = useState(0);
  const accentRef = useRef(0);
  const accentFrame = useRef(0);
  const requestedTheme = useRef(resolvedTheme);
  const [open, setOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
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
    return () => cancelAnimationFrame(accentFrame.current);
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

  const openPalette = () => setOpen(true);

  // Folding back only means something where the palette folds.
  const closePalette = () => {
    if (!open) return;
    flushSync(() => setOpen(false));
    toggleRef.current?.focus();
  };

  const pickAccent = (index: number, from: HTMLElement) => {
    if (index === accentRef.current) {
      closePalette();
      return;
    }
    accentRef.current = index;
    const origin = center(from);
    // Only the last pick before paint needs a pour or a page-wide restyle.
    // Read its origin before changing <html>, so a burst does not alternate
    // layout reads with global color writes hundreds of times.
    cancelAnimationFrame(accentFrame.current);
    accentFrame.current = requestAnimationFrame(() => {
      disturbWater({ ...origin, dye: true });
      const root = document.documentElement;
      if (index === 0) root.removeAttribute("data-accent");
      else root.setAttribute("data-accent", String(index));
      try {
        localStorage.setItem(STORAGE_KEY, String(index));
      } catch {}
    });
    setAccent(index);
  };

  const switchTheme = (event: MouseEvent<HTMLButtonElement>) => {
    // A capture can defer the DOM update. Toggle the last request so clicks
    // during that capture still count, even before React has rendered it.
    const next = requestedTheme.current === "dark" ? "light" : "dark";
    requestedTheme.current = next;
    const origin = center(event.currentTarget);
    disturbWater(origin);
    floodTheme(() => {
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
    }, origin.x, origin.y);
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
        <PixelIcon rows={SUN} className="appearance-dock-sun" />
        <PixelIcon rows={MOON} className="appearance-dock-moon" />
      </button>
    </div>
  );
}
