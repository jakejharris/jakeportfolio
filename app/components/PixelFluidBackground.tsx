"use client";

import { useEffect, useRef } from "react";
import { readCanvasColors } from "./blog-components/canvas-theme";
import { PixelFluid, type Rgb } from "./pixel-fluid/engine";
import { ISLAND_SELECTOR, measureIslands } from "./pixel-fluid/islands";
import { FLUID_DISTURB_EVENT, type FluidDisturbance } from "./pixel-fluid/disturb";

// Feature flag for pixel fluid background
const ENABLE_PIXEL_FLUID_BACKGROUND = true;

// The ambient drift flips a given cell a couple of times a second, so 30 fps
// looks the same as 60 and costs half. Ripples and dye rings get 60.
const AMBIENT_FRAME_MS = 1000 / 30;
const BUSY_FRAME_MS = 1000 / 60;
// A disturbance announced this recently explains an accent change.
const DROP_WINDOW_MS = 1000;

interface PixelFluidBackgroundProps {
  className?: string;
  heroMode?: boolean;
  /** Reserve this share of cells as still, unpatterned negative space. */
  quietShare?: number;
}

export default function PixelFluidBackground({
  className,
  heroMode = false,
  quietShare = 0,
}: PixelFluidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ENABLE_PIXEL_FLUID_BACKGROUND) return;

    const fluid = new PixelFluid(canvas, { heroMode, quietShare });
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let running = false;
    let disposed = false;
    let lastDraw = -Infinity;
    let measureFrame = 0;
    let accent: Rgb = [255, 255, 255];
    let pendingDrop: (FluidDisturbance & { at: number }) | null = null;
    let lastPointer: { x: number; y: number; at: number } | null = null;

    const draw = (now: number) => {
      lastDraw = now;
      fluid.render(now, window.scrollX, window.scrollY, window.innerHeight);
    };

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const interval = fluid.busy ? BUSY_FRAME_MS : AMBIENT_FRAME_MS;
      if (now - lastDraw >= interval - 1) draw(now);
    };

    const renderOnce = () => {
      cancelAnimationFrame(frame);
      running = false;
      if (!document.hidden && !disposed) frame = requestAnimationFrame(draw);
    };

    const start = () => {
      if (running || document.hidden || disposed) return;
      if (fluid.still) {
        renderOnce();
        return;
      }
      running = true;
      frame = requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const readColors = () => {
      const colors = readCanvasColors();
      fluid.setColors({ background: colors.bg, accent: colors.accent, isDark: colors.isDark });
      return colors.accent;
    };

    // Land moves when fonts land, the entrance settles or the layout reflows.
    const measure = () => {
      if (disposed) return;
      cancelAnimationFrame(measureFrame);
      measureFrame = requestAnimationFrame(() => {
        fluid.setIslands(measureIslands());
        if (fluid.still) renderOnce();
      });
    };

    // A phone's toolbar changes the height while scrolling; only a new width
    // can move the text, so only that re-traces it.
    let measuredWidth = -1;
    const resize = () => {
      fluid.resize(window.innerWidth, window.innerHeight);
      // Resizing clears the bitmap even when only a phone toolbar changes
      // height. Reduced motion has no animation loop to paint it again.
      if (fluid.still) renderOnce();
      if (window.innerWidth === measuredWidth) return;
      measuredWidth = window.innerWidth;
      measure();
    };

    fluid.still = motionQuery.matches;
    accent = readColors();
    resize();
    start();
    document.fonts?.ready.then(measure);

    const handleScroll = () => {
      if (fluid.still) renderOnce();
    };

    const handleVisibility = () => {
      fluid.clearPointer();
      if (document.hidden) stop();
      else start();
    };

    const handleMotion = (event: MediaQueryListEvent) => {
      stop();
      fluid.still = event.matches;
      fluid.clearPointer();
      start();
    };

    const handleAnimationEnd = (event: AnimationEvent) => {
      // View Transition pseudo-elements report the root as their target;
      // their animation does not move the text or change its glyph outlines.
      if (event.pseudoElement) return;
      const target = event.target;
      if (target instanceof Element && (target.matches(ISLAND_SELECTOR) || target.querySelector(ISLAND_SELECTOR))) {
        measure();
      }
    };

    // Cursor ripples are a desktop enhancement: a moving pointer leaves a
    // wake, a click drops a stone. Touch only splashes on a tap, so
    // scrolling never does extra work.
    const handleMouseMove = (event: MouseEvent) => {
      if (fluid.still) return;
      fluid.movePointer(event.clientX, event.clientY);
      const now = performance.now();
      if (lastPointer && now - lastPointer.at < 40) return;
      if (lastPointer) {
        const moved = Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y) / 18;
        if (moved > 0.5) fluid.splash(event.clientX, event.clientY, Math.min(0.3, moved * 0.07));
      }
      lastPointer = { x: event.clientX, y: event.clientY, at: now };
    };

    const handleMouseLeave = () => {
      fluid.clearPointer();
      lastPointer = null;
    };

    let touchStart: { x: number; y: number; at: number } | null = null;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") fluid.splash(event.clientX, event.clientY, 0.8);
      else touchStart = { x: event.clientX, y: event.clientY, at: performance.now() };
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (!touchStart || event.pointerType === "mouse") return;
      const tap = performance.now() - touchStart.at < 300
        && Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) < 10;
      touchStart = null;
      if (tap) fluid.splash(event.clientX, event.clientY, 0.8);
    };

    const handleDisturb = (event: Event) => {
      const detail = (event as CustomEvent<FluidDisturbance>).detail;
      if (!detail) return;
      if (detail.dye) pendingDrop = { ...detail, at: performance.now() };
      else fluid.splash(detail.x, detail.y, 0.9);
    };

    // Theme and accent live on <html>. A new accent announced by a swatch
    // pours in from that swatch; any other change recolors in place.
    const observer = new MutationObserver(() => {
      const previous = accent;
      accent = readColors();
      const now = performance.now();
      const changed = previous.some((channel, i) => channel !== accent[i]);
      if (changed && pendingDrop && now - pendingDrop.at < DROP_WINDOW_MS && !fluid.still) {
        fluid.dropDye(pendingDrop.x, pendingDrop.y, previous, now);
      }
      pendingDrop = null;
      if (fluid.still) renderOnce();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-accent"],
    });

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("animationend", handleAnimationEnd);
    document.fonts?.addEventListener("loadingdone", measure);
    motionQuery.addEventListener("change", handleMotion);
    window.addEventListener(FLUID_DISTURB_EVENT, handleDisturb);
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    if (finePointerQuery.matches) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      disposed = true;
      stop();
      cancelAnimationFrame(measureFrame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("animationend", handleAnimationEnd);
      document.fonts?.removeEventListener("loadingdone", measure);
      motionQuery.removeEventListener("change", handleMotion);
      window.removeEventListener(FLUID_DISTURB_EVENT, handleDisturb);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("mousemove", handleMouseMove);
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [heroMode, quietShare]);

  // Return null if feature is disabled
  if (!ENABLE_PIXEL_FLUID_BACKGROUND) {
    return null;
  }

  return (
    <div
      className={`pixel-fluid-background fixed inset-0 -z-10 overflow-hidden ${className || ""}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="pixel-fluid-canvas" />

      {/* Scanlines overlay (static background lines) */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: `linear-gradient(
            to bottom,
            rgba(255,255,255,0),
            rgba(255,255,255,0) 50%,
            rgba(0,0,0,0.03) 50%,
            rgba(0,0,0,0.03)
          )`,
          backgroundSize: "100% 3px",
        }}
      />

      {/* Static film grain overlay (Optimized Performance Data URI) */}
      <div
        className="pixel-fluid-grain absolute inset-0 pointer-events-none z-[12]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[11]"
        style={{
          background: `radial-gradient(
            circle at center,
            rgba(0,0,0,0) 50%,
            rgba(0,0,0,0.15) 100%
          )`,
        }}
      />
    </div>
  );
}
