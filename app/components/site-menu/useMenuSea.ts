"use client";

// The water inside the menu: the page background's engine, with the menu's
// words as its only islands. It runs while the menu is on screen and stops
// the moment it leaves. Fingers leave a wake in it (there is nothing to
// scroll), a tap drops a stone, and a new accent pours in from its swatch.

import { useLayoutEffect, useRef, type RefObject } from "react";
import { readCanvasColors } from "../blog-components/canvas-theme";
import { CELL, PixelFluid, type FluidColors, type Rgb } from "../pixel-fluid/engine";
import { measureIslands, type IslandField } from "../pixel-fluid/islands";
import { FLUID_DISTURB_EVENT, type FluidDisturbance } from "../pixel-fluid/disturb";

export const MENU_ISLAND = "[data-menu-island]";

const AMBIENT_FRAME_MS = 1000 / 30;
const BUSY_FRAME_MS = 1000 / 60;
// The swell rises while the tide comes in.
const RAMP_MS = 900;
// A disturbance announced this recently explains an accent change.
const DROP_WINDOW_MS = 1000;

function fluidColors(): FluidColors {
  const colors = readCanvasColors();
  return { background: colors.bg, accent: colors.accent, isDark: colors.isDark };
}

export function useMenuSea(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  surfaceRef: RefObject<HTMLElement | null>,
  active: boolean,
  onColors: (colors: FluidColors) => void
) {
  const onColorsRef = useRef(onColors);
  onColorsRef.current = onColors;

  // Layout effect: the first frame is drawn before the menu first paints.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!active || !canvas || !surface) return;
    const nav = surface.querySelector<HTMLElement>(".site-menu-nav");

    const fluid = new PixelFluid(canvas, { heroMode: false, quietShare: 0, rampMs: RAMP_MS });
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let lastDraw = -Infinity;
    let disposed = false;
    let accent: Rgb = [255, 255, 255];
    let pendingDrop: (FluidDisturbance & { at: number }) | null = null;
    let wake: { x: number; y: number; at: number } | null = null;
    let pressed = false;
    let islands: IslandField | null = null;
    let layout = "";
    let height = 0;

    const draw = (now: number) => {
      lastDraw = now;
      // The water stays fixed; only the words can scroll at large text sizes.
      fluid.render(now, 0, 0, height);
    };

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now - lastDraw >= (fluid.busy ? BUSY_FRAME_MS : AMBIENT_FRAME_MS) - 1) draw(now);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      if (disposed || document.hidden) return;
      if (fluid.still) frame = requestAnimationFrame(draw);
      else frame = requestAnimationFrame(loop);
    };

    const readColors = () => {
      const colors = fluidColors();
      fluid.setColors(colors);
      onColorsRef.current(colors);
      return colors.accent;
    };

    const placeIslands = () => {
      fluid.setIslands(islands ? { ...islands, top: islands.top - (nav?.scrollTop ?? 0) } : null);
    };

    const measure = () => {
      if (disposed) return;
      nav?.toggleAttribute("data-scrolls", nav.scrollHeight > nav.clientHeight + 1);
      // ResizeObserver delivers an initial notification too. Avoid tracing
      // every glyph twice on open, or when a resize has not moved the words.
      const nextLayout = Array.from(surface.querySelectorAll(MENU_ISLAND), (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return [rect.x, rect.y + (nav?.scrollTop ?? 0), rect.width, rect.height, style.font, style.letterSpacing].join(",");
      }).join(";");
      if (nextLayout === layout) return;
      layout = nextLayout;
      const field = measureIslands(MENU_ISLAND);
      if (field) {
        field.left -= window.scrollX;
        field.top += (nav?.scrollTop ?? 0) - window.scrollY;
      }
      islands = field;
      placeIslands();
    };

    const resize = () => {
      // The desktop media query hides the surface before React cleans up
      // this effect. A resize event can arrive in that interval.
      if (!surface.clientWidth || !surface.clientHeight) return;
      height = surface.clientHeight;
      fluid.resize(surface.clientWidth, height);
      measure();
      draw(performance.now());
    };

    fluid.still = motionQuery.matches;
    accent = readColors();
    resize();
    start();
    const handleLayout = () => {
      if (disposed) return;
      measure();
      if (fluid.still) draw(performance.now());
    };
    const handleFonts = () => {
      if (disposed) return;
      layout = "";
      handleLayout();
    };
    if (document.fonts?.status === "loading") document.fonts.ready.then(handleFonts);
    const resizeObserver = new ResizeObserver(handleLayout);
    if (nav) {
      resizeObserver.observe(nav);
      Array.from(nav.children).forEach((child) => resizeObserver.observe(child));
    }
    const handleScroll = () => {
      placeIslands();
      if (fluid.still) start();
    };

    const handleVisibility = () => {
      if (document.hidden) cancelAnimationFrame(frame);
      else start();
    };

    const handleMotion = (event: MediaQueryListEvent) => {
      fluid.still = event.matches;
      fluid.clearPointer();
      start();
    };

    const handleDisturb = (event: Event) => {
      const detail = (event as CustomEvent<FluidDisturbance>).detail;
      if (!detail) return;
      if (detail.dye) pendingDrop = { ...detail, at: performance.now() };
      else fluid.splash(detail.x, detail.y, 0.9);
    };

    const observer = new MutationObserver(() => {
      const previous = accent;
      accent = readColors();
      const now = performance.now();
      const changed = previous.some((channel, i) => channel !== accent[i]);
      if (changed && pendingDrop && now - pendingDrop.at < DROP_WINDOW_MS && !fluid.still) {
        fluid.dropDye(pendingDrop.x, pendingDrop.y, previous, now);
      }
      pendingDrop = null;
      if (fluid.still) start();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-accent"],
    });

    // A finger drawn through the water leaves a wake, a mouse too, and any
    // press drops a stone where it lands.
    const handleDown = (event: PointerEvent) => {
      pressed = event.pointerType !== "mouse";
      wake = { x: event.clientX, y: event.clientY, at: performance.now() };
      fluid.splash(event.clientX, event.clientY, 0.8);
    };
    const handleMove = (event: PointerEvent) => {
      if (fluid.still) return;
      if (event.pointerType === "mouse") fluid.movePointer(event.clientX, event.clientY);
      else if (!pressed) return;
      const now = performance.now();
      if (wake && now - wake.at < 40) return;
      if (wake) {
        const moved = Math.hypot(event.clientX - wake.x, event.clientY - wake.y) / CELL;
        if (moved > 0.5) fluid.splash(event.clientX, event.clientY, Math.min(0.3, moved * 0.07));
      }
      wake = { x: event.clientX, y: event.clientY, at: now };
    };
    const handleUp = () => {
      pressed = false;
    };
    const handleLeave = () => {
      fluid.clearPointer();
      wake = null;
    };

    window.addEventListener("resize", resize);
    nav?.addEventListener("scroll", handleScroll, { passive: true });
    document.fonts?.addEventListener("loadingdone", handleFonts);
    document.addEventListener("visibilitychange", handleVisibility);
    motionQuery.addEventListener("change", handleMotion);
    window.addEventListener(FLUID_DISTURB_EVENT, handleDisturb);
    surface.addEventListener("pointerdown", handleDown, { passive: true });
    surface.addEventListener("pointermove", handleMove, { passive: true });
    surface.addEventListener("pointerup", handleUp, { passive: true });
    surface.addEventListener("pointercancel", handleUp, { passive: true });
    surface.addEventListener("pointerleave", handleLeave, { passive: true });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      nav?.removeEventListener("scroll", handleScroll);
      document.fonts?.removeEventListener("loadingdone", handleFonts);
      document.removeEventListener("visibilitychange", handleVisibility);
      motionQuery.removeEventListener("change", handleMotion);
      window.removeEventListener(FLUID_DISTURB_EVENT, handleDisturb);
      surface.removeEventListener("pointerdown", handleDown);
      surface.removeEventListener("pointermove", handleMove);
      surface.removeEventListener("pointerup", handleUp);
      surface.removeEventListener("pointercancel", handleUp);
      surface.removeEventListener("pointerleave", handleLeave);
    };
  }, [active, canvasRef, surfaceRef]);
}
