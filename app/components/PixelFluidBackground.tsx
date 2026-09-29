"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { readCanvasColors } from "./blog-components/canvas-theme";
import type { Rgb } from "./pixel-fluid/engine";
import { ISLAND_SELECTOR } from "./pixel-fluid/islands";
import { FLUID_DISTURB_EVENT, type FluidDisturbance } from "./pixel-fluid/disturb";
import { isSea, waterShape } from "./pixel-fluid/shapes";
import { SiteWater } from "./pixel-fluid/water";
import {
  NAV_ARRIVE_EVENT,
  NAV_DEPART_EVENT,
  type NavArrival,
  type NavDeparture,
} from "./navigation/navigation-events";
import "../css/water.css";

// Feature flag for pixel fluid background
const ENABLE_PIXEL_FLUID_BACKGROUND = true;

// A disturbance announced this recently explains an accent change.
const DROP_WINDOW_MS = 1000;
// The page's land settles after layout changes stop for this long.
const LAND_SETTLE_MS = 120;

/**
 * The pixel water under every page of the site. Mounted once in the site
 * layout, it takes its shape from the route (see pixel-fluid/shapes.ts) and
 * moves with page changes instead of being replaced by them.
 */
export default function PixelFluidBackground() {
  const pathname = usePathname();
  // The first shape is rendered on the server, so the right layer shows
  // before any script runs. Later shapes are applied by the water itself.
  const initial = useRef(waterShape(pathname)).current;
  const seaFrameRef = useRef<HTMLDivElement>(null);
  const seaRef = useRef<HTMLCanvasElement>(null);
  const shoreFrameRef = useRef<HTMLDivElement>(null);
  const shoreRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const seaFrame = seaFrameRef.current;
    const seaCanvas = seaRef.current;
    const shoreFrame = shoreFrameRef.current;
    const shoreCanvas = shoreRef.current;
    if (!seaFrame || !seaCanvas || !shoreFrame || !shoreCanvas || !ENABLE_PIXEL_FLUID_BACKGROUND) return;

    const root = document.documentElement;
    const main = shoreFrame.parentElement;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    // The mobile menu brings its own water over the whole page. This one
    // rests from the moment the menu starts to open until it has left.
    const covered = () => root.hasAttribute("data-menu-open");
    const water = new SiteWater(
      { seaFrame, seaCanvas, shoreFrame, shoreCanvas },
      waterShape(window.location.pathname),
      () => !document.hidden && !covered()
    );
    let accent: Rgb = [255, 255, 255];
    let pendingDrop: (FluidDisturbance & { at: number }) | null = null;
    let lastPointer: { x: number; y: number; at: number } | null = null;
    let islandFrame = 0;
    let landTimer = 0;

    const readColors = () => {
      const colors = readCanvasColors();
      water.setColors({ background: colors.bg, accent: colors.accent, isDark: colors.isDark });
      return colors.accent;
    };

    // Land moves when fonts land, entrances settle or the layout reflows.
    const measureIslands = () => {
      cancelAnimationFrame(islandFrame);
      islandFrame = requestAnimationFrame(() => water.measureSeaIslands());
    };
    const measureLand = () => {
      window.clearTimeout(landTimer);
      landTimer = window.setTimeout(() => water.measureShore(), LAND_SETTLE_MS);
    };

    // A phone's toolbar changes the height while scrolling; only a new width
    // can move the text, so only that re-traces it.
    let measuredWidth = -1;
    const resize = () => {
      water.resize(window.innerWidth, window.innerHeight);
      if (window.innerWidth === measuredWidth) return;
      measuredWidth = window.innerWidth;
      measureIslands();
      measureLand();
    };

    water.still = motionQuery.matches;
    accent = readColors();
    resize();
    water.load();
    document.fonts?.ready.then(() => {
      measureIslands();
      measureLand();
    });

    const handleScroll = () => water.scrolled();

    const handleVisibility = () => {
      water.clearPointer();
      if (document.hidden) water.stop();
      else water.kick();
    };

    const handleMotion = (event: MediaQueryListEvent) => {
      water.still = event.matches;
      water.kick();
    };

    const handleAnimationEnd = (event: AnimationEvent) => {
      // View Transition pseudo-elements report the root as their target;
      // their animation does not move the text or change its glyph outlines.
      if (event.pseudoElement) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.matches(ISLAND_SELECTOR) || target.querySelector(ISLAND_SELECTOR)) measureIslands();
      // Entrances slide content into place; the shore traces where it ends up.
      if (main?.contains(target)) measureLand();
    };

    // Cursor ripples are a desktop enhancement: a moving pointer leaves a
    // wake, a click drops a stone. Touch only splashes on a tap, so
    // scrolling never does extra work.
    const handleMouseMove = (event: MouseEvent) => {
      if (water.still) return;
      water.pointer(event.clientX, event.clientY);
      const now = performance.now();
      if (lastPointer && now - lastPointer.at < 40) return;
      if (lastPointer) {
        const moved = Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y) / 18;
        if (moved > 0.5) water.splash(event.clientX, event.clientY, Math.min(0.3, moved * 0.07));
      }
      lastPointer = { x: event.clientX, y: event.clientY, at: now };
    };

    const handleMouseLeave = () => {
      water.clearPointer();
      lastPointer = null;
    };

    let touchStart: { x: number; y: number; at: number } | null = null;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") water.splash(event.clientX, event.clientY, 0.8);
      else touchStart = { x: event.clientX, y: event.clientY, at: performance.now() };
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (!touchStart || event.pointerType === "mouse") return;
      const tap = performance.now() - touchStart.at < 300
        && Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) < 10;
      touchStart = null;
      if (tap) water.splash(event.clientX, event.clientY, 0.8);
    };

    const handleDisturb = (event: Event) => {
      const detail = (event as CustomEvent<FluidDisturbance>).detail;
      if (!detail) return;
      // The same accent again: <html> will not change, so pour it now.
      if (detail.dye && detail.again) {
        if (!water.still) water.dropDye(detail.x, detail.y, accent, detail.heat);
      } else if (detail.dye) pendingDrop = { ...detail, at: performance.now() };
      else water.splash(detail.x, detail.y, 0.9);
    };

    const handleDepart = (event: Event) => {
      const detail = (event as CustomEvent<NavDeparture>).detail;
      if (detail) water.depart(detail.x, detail.y);
    };

    const handleArrive = (event: Event) => {
      const detail = (event as CustomEvent<NavArrival>).detail;
      if (!detail) return;
      water.arrive({
        shape: waterShape(detail.pathname),
        kind: detail.kind,
        x: detail.x,
        y: detail.y,
        covered: detail.covered,
      });
    };

    // Theme and accent live on <html>. A new accent announced by a swatch
    // pours in from that swatch; any other change recolors in place.
    const observer = new MutationObserver(() => {
      const previous = accent;
      accent = readColors();
      const now = performance.now();
      const changed = previous.some((channel, i) => channel !== accent[i]);
      if (changed && pendingDrop && now - pendingDrop.at < DROP_WINDOW_MS && !water.still) {
        water.dropDye(pendingDrop.x, pendingDrop.y, previous, pendingDrop.heat);
      }
      pendingDrop = null;
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-accent"] });
    const menuObserver = new MutationObserver(() => (covered() ? water.stop() : water.kick()));
    menuObserver.observe(root, { attributes: true, attributeFilter: ["data-menu-open"] });
    // The page's content changing size (images, fonts, a new page) moves the
    // shore's land.
    const contentSize = new ResizeObserver(measureLand);
    if (main) contentSize.observe(main);

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("animationend", handleAnimationEnd);
    document.fonts?.addEventListener("loadingdone", measureIslands);
    document.fonts?.addEventListener("loadingdone", measureLand);
    motionQuery.addEventListener("change", handleMotion);
    window.addEventListener(FLUID_DISTURB_EVENT, handleDisturb);
    window.addEventListener(NAV_DEPART_EVENT, handleDepart);
    window.addEventListener(NAV_ARRIVE_EVENT, handleArrive);
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    if (finePointerQuery.matches) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
      root.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      water.dispose();
      cancelAnimationFrame(islandFrame);
      window.clearTimeout(landTimer);
      observer.disconnect();
      menuObserver.disconnect();
      contentSize.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("animationend", handleAnimationEnd);
      document.fonts?.removeEventListener("loadingdone", measureIslands);
      document.fonts?.removeEventListener("loadingdone", measureLand);
      motionQuery.removeEventListener("change", handleMotion);
      window.removeEventListener(FLUID_DISTURB_EVENT, handleDisturb);
      window.removeEventListener(NAV_DEPART_EVENT, handleDepart);
      window.removeEventListener(NAV_ARRIVE_EVENT, handleArrive);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("mousemove", handleMouseMove);
      root.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // Return null if feature is disabled
  if (!ENABLE_PIXEL_FLUID_BACKGROUND) {
    return null;
  }

  return (
    <>
      <div
        ref={seaFrameRef}
        className="pixel-fluid-background fixed inset-0 -z-10 overflow-hidden"
        data-water={isSea(initial) ? "on" : "off"}
        data-water-layer=""
        aria-hidden="true"
      >
        <canvas ref={seaRef} className="pixel-fluid-canvas" />
      </div>
      {/* The shore shows once its page is traced and its canvas sized. */}
      <div ref={shoreFrameRef} className="pixel-shore" data-water="off" data-water-layer="" aria-hidden="true">
        <canvas ref={shoreRef} className="pixel-shore-canvas" />
      </div>
    </>
  );
}
