"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useTheme } from "next-themes";
import { useReducedMotion } from "@/app/hooks/use-reduced-motion";

// Feature flag for pixel fluid background
const ENABLE_PIXEL_FLUID_BACKGROUND = true;

// Same colors as AccentPicker for consistency
const COLORS = [
  { name: "Default", light: "0 0% 9%", dark: "0 0% 98%" },
  { name: "Red", light: "0 72% 50%", dark: "0 60% 65%" },
  { name: "Blue", light: "217 80% 50%", dark: "217 70% 65%" },
  { name: "Green", light: "160 65% 40%", dark: "160 50% 55%" },
  { name: "Amber", light: "35 90% 48%", dark: "35 70% 60%" },
];

// Parse HSL string to get hue value
function parseHue(hslString: string): number {
  const parts = hslString.split(" ");
  return parseFloat(parts[0]) || 0;
}

// Parse HSL string to get saturation
function parseSaturation(hslString: string): number {
  const parts = hslString.split(" ");
  return parseFloat(parts[1]?.replace("%", "")) || 0;
}

interface PixelFluidBackgroundProps {
  className?: string;
}

export default function PixelFluidBackground({ className }: PixelFluidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const frameIntervalRef = useRef(22); // Default 45fps (~22ms), mobile will be 33ms (30fps)
  const pointerRef = useRef({ x: -1000, y: -1000, active: false });
  const configRef = useRef({
    pixelSize: 18,
    speed: 0.012,
    baseHue: 215,
    baseSaturation: 80,
    waveScale: 0.09,
    isGrayscale: false,
    grayscaleInverted: false,
  });
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);

  // Wait for theme to resolve (avoid hydration mismatch)
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  // Get the current accent color based on data-accent attribute
  const getAccentColor = useCallback(() => {
    const accentAttr = document.documentElement.getAttribute("data-accent");
    const accentIndex = accentAttr ? parseInt(accentAttr, 10) : 0;
    const validIndex = accentIndex >= 0 && accentIndex <= 4 ? accentIndex : 0;
    const color = COLORS[validIndex];
    return { colorString: isDark ? color.dark : color.light, index: validIndex };
  }, [isDark]);

  // Update base hue from accent color
  const updateBaseHue = useCallback(() => {
    const { colorString, index } = getAccentColor();
    const hue = parseHue(colorString);
    const saturation = parseSaturation(colorString);

    if (index === 0 || saturation === 0) {
      configRef.current.isGrayscale = true;
      configRef.current.grayscaleInverted = !isDark;
      configRef.current.baseHue = 0;
      configRef.current.baseSaturation = 0;
    } else {
      configRef.current.isGrayscale = false;
      configRef.current.grayscaleInverted = false;
      configRef.current.baseHue = hue;
      configRef.current.baseSaturation = saturation;
    }
  }, [getAccentColor, isDark]);

  // Wave height calculation with interactive ripple
  const getWaveHeight = useCallback((x: number, y: number, t: number) => {
    const scale = configRef.current.waveScale;
    const pointer = pointerRef.current;

    // Base ocean swell
    const w1 = Math.sin(x * scale + t);
    const w2 = Math.cos(y * scale * 0.7 - t * 0.4);
    const w3 = Math.sin((x - y) * scale * 0.5 + t * 0.3);

    let h = (w1 + w2 + w3 + 3) / 6;

    // Interactive ripple effect
    if (pointer.active) {
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Ripple radius: 15 blocks
      if (dist < 15) {
        const ripple = Math.cos(dist * 0.6 - t * 4) * 0.25;
        const decay = 1 - dist / 15;
        h -= ripple * decay;
      }
    }

    return h;
  }, []);

  // Draw function with frame rate throttling
  const draw = useCallback((timestamp?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Frame rate throttling - skip frame if not enough time has passed
    const now = timestamp || performance.now();
    const elapsed = now - lastFrameTimeRef.current;
    if (elapsed < frameIntervalRef.current) {
      if (isVisible && !reducedMotion) {
        animationRef.current = requestAnimationFrame(draw);
      }
      return;
    }
    lastFrameTimeRef.current = now - (elapsed % frameIntervalRef.current);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { pixelSize, baseHue, baseSaturation, isGrayscale, grayscaleInverted } = configRef.current;
    const cols = Math.ceil(canvas.width / pixelSize);
    const rows = Math.ceil(canvas.height / pixelSize);

    // Background color based on theme
    const bgColor = isDark ? "#0a0a0a" : "#ffffff";

    // Fill background first
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Foam colors for dithering (theme-aware)
    const foamLight1 = isDark ? "#1a1a1a" : "#f1f5f9";
    const foamLight2 = isDark ? "#252525" : "#e2e8f0";

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const noiseVal = getWaveHeight(x, y, timeRef.current);
        let color: string | null = null;

        // 1. Pure background (skip drawing for performance)
        if (noiseVal < 0.45) {
          continue;
        }
        // 2. Dithered transition (foam) with checkerboard pattern
        else if (noiseVal < 0.58) {
          const isEven = (x + y) % 2 === 0;

          if (noiseVal < 0.52) {
            // Lightest foam
            color = isEven ? bgColor : foamLight1;
          } else {
            // Denser foam
            color = isEven ? foamLight1 : foamLight2;
          }
        }
        // 3. Water body
        else {
          const norm = (noiseVal - 0.58) * 2.4;

          // Highlight glints on peaks
          if (noiseVal > 0.85 && (x * y) % 17 === 0) {
            color = isDark ? "#ffffff" : "#ffffff";
          } else if (isGrayscale) {
            // Grayscale rendering
            let light: number;
            if (grayscaleInverted) {
              // Light mode: subtle grey shades
              light = isDark ? 30 - norm * 20 : 88 - norm * 12;
            } else {
              // Dark mode: lighter shades
              light = isDark ? 85 - norm * 25 : 95 - norm * 20;
            }
            light = Math.floor(light / 6) * 6;
            color = `hsl(0, 0%, ${light}%)`;
          } else {
            // Colored rendering
            const hue = baseHue + norm * 10;
            const sat = 70 + norm * 25;
            let light = 85 - norm * 55;
            light = Math.floor(light / 6) * 6;

            // Adjust for dark mode
            if (isDark) {
              light = Math.min(light + 15, 80);
            }

            color = `hsl(${hue}, ${sat}%, ${light}%)`;
          }
        }

        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(
            x * pixelSize,
            y * pixelSize,
            pixelSize + 0.5,
            pixelSize + 0.5
          );
        }
      }
    }

    timeRef.current += configRef.current.speed;
    // Only continue animation if visible and motion is allowed
    if (isVisible && !reducedMotion) {
      animationRef.current = requestAnimationFrame(draw);
    }
  }, [isDark, getWaveHeight, isVisible, reducedMotion]);

  // Resize handler - also adjusts speed and frame rate based on screen size
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Slower animation on desktop, faster on mobile
    // Original speed was 0.02; mobile is 30% slower, desktop is 60% slower
    const isMobile = window.innerWidth < 768;
    configRef.current.speed = isMobile ? 0.014 : 0.008;

    // Frame rate throttling: 30fps on mobile (~33ms), 45fps on desktop (~22ms)
    frameIntervalRef.current = isMobile ? 33 : 22;
  }, []);

  // Pointer update handler
  const updatePointer = useCallback((e: MouseEvent | TouchEvent) => {
    let x: number, y: number;

    if ("touches" in e && e.touches.length > 0) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else if ("clientX" in e) {
      x = e.clientX;
      y = e.clientY;
    } else {
      return;
    }

    // Convert screen pixels to grid coordinates
    pointerRef.current.x = x / configRef.current.pixelSize;
    pointerRef.current.y = y / configRef.current.pixelSize;
    pointerRef.current.active = true;
  }, []);

  const clearPointer = useCallback(() => {
    pointerRef.current.active = false;
  }, []);

  useEffect(() => {
    // Initial setup
    updateBaseHue();
    resize();

    // Only start animation if motion is allowed
    if (!reducedMotion) {
      animationRef.current = requestAnimationFrame(draw);
    } else {
      // For reduced motion, draw a single static frame
      draw();
    }

    // Handle resize
    window.addEventListener("resize", resize);

    // Handle pointer/touch interaction (only if motion is allowed)
    if (!reducedMotion) {
      window.addEventListener("mousemove", updatePointer);
      window.addEventListener("touchmove", updatePointer, { passive: true });
      window.addEventListener("touchstart", updatePointer, { passive: true });
      window.addEventListener("touchend", clearPointer);
      window.addEventListener("mouseleave", clearPointer);
    }

    // Handle visibility changes (pause animation when tab is hidden)
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setIsVisible(visible);
      if (visible && !reducedMotion) {
        // Resume animation when tab becomes visible again
        animationRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Watch for accent changes via MutationObserver with debouncing
    let mutationTimeout: NodeJS.Timeout | null = null;
    const observer = new MutationObserver((mutations) => {
      // Debounce: only process after 50ms of no changes
      if (mutationTimeout) {
        clearTimeout(mutationTimeout);
      }
      mutationTimeout = setTimeout(() => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === "data-accent" || mutation.attributeName === "class") {
            updateBaseHue();
          }
        });
      }, 50);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-accent", "class"],
    });

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (mutationTimeout) {
        clearTimeout(mutationTimeout);
      }
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", updatePointer);
      window.removeEventListener("touchmove", updatePointer);
      window.removeEventListener("touchstart", updatePointer);
      window.removeEventListener("touchend", clearPointer);
      window.removeEventListener("mouseleave", clearPointer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observer.disconnect();
    };
  }, [draw, resize, updateBaseHue, updatePointer, clearPointer, reducedMotion]);

  // Re-update hue when theme changes
  useEffect(() => {
    if (mounted) {
      updateBaseHue();
    }
  }, [mounted, resolvedTheme, updateBaseHue]);

  // Return null if feature is disabled
  if (!ENABLE_PIXEL_FLUID_BACKGROUND) {
    return null;
  }

  return (
    <div className={`fixed inset-0 -z-10 ${className || ""}`}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ willChange: "transform" }}
      />

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

      {/* Moving scanline 1 - Primary (faster sweep) */}
      <div
        className="absolute inset-x-0 pointer-events-none z-[12] scanline-sweep-1"
        style={{
          height: "8px",
          top: 0,
          background: isDark
            ? `linear-gradient(
                to bottom,
                rgba(255,255,255,0) 0%,
                rgba(255,255,255,0.08) 40%,
                rgba(255,255,255,0.12) 50%,
                rgba(255,255,255,0.08) 60%,
                rgba(255,255,255,0) 100%
              )`
            : `linear-gradient(
                to bottom,
                rgba(0,0,0,0) 0%,
                rgba(0,0,0,0.05) 40%,
                rgba(0,0,0,0.08) 50%,
                rgba(0,0,0,0.05) 60%,
                rgba(0,0,0,0) 100%
              )`,
          willChange: "transform",
        }}
      />

      {/* Moving scanline 2 - Secondary (slower sweep, creates double-line interference) */}
      <div
        className="absolute inset-x-0 pointer-events-none z-[12] scanline-sweep-2"
        style={{
          height: "4px",
          top: 0,
          background: isDark
            ? `linear-gradient(
                to bottom,
                rgba(255,255,255,0) 0%,
                rgba(255,255,255,0.06) 50%,
                rgba(255,255,255,0) 100%
              )`
            : `linear-gradient(
                to bottom,
                rgba(0,0,0,0) 0%,
                rgba(0,0,0,0.04) 50%,
                rgba(0,0,0,0) 100%
              )`,
          willChange: "transform",
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
