"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";

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
  const configRef = useRef({
    pixelSize: 20,
    speed: 0.03,
    baseHue: 217, // Default to blue
    baseSaturation: 80,
    waveScale: 0.08,
    isGrayscale: false, // For white/black options
    grayscaleInverted: false, // true for black option (darker shades)
  });
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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

    // Check if Default option is selected (index 0, grayscale)
    if (index === 0 || saturation === 0) {
      // Default option - render grayscale waves
      // In light mode: darker shades, in dark mode: lighter shades
      configRef.current.isGrayscale = true;
      configRef.current.grayscaleInverted = !isDark; // Inverted in light mode for darker shades
      configRef.current.baseHue = 0;
      configRef.current.baseSaturation = 0;
    } else {
      // Colored option
      configRef.current.isGrayscale = false;
      configRef.current.grayscaleInverted = false;
      configRef.current.baseHue = hue;
      configRef.current.baseSaturation = saturation;
    }
  }, [getAccentColor, isDark]);

  // Wave height calculation
  const getWaveHeight = useCallback((x: number, y: number, t: number) => {
    const scale = configRef.current.waveScale;
    const w1 = Math.sin(x * scale + t);
    const w2 = Math.cos(y * scale * 0.8 - t * 0.5);
    const w3 = Math.sin((x + y) * scale * 0.3 + t * 0.2);
    return (w1 + w2 + w3 + 3) / 6;
  }, []);

  // Draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { pixelSize, baseHue, baseSaturation, isGrayscale, grayscaleInverted } = configRef.current;
    const cols = Math.ceil(canvas.width / pixelSize);
    const rows = Math.ceil(canvas.height / pixelSize);

    // Background colors based on theme
    const bgColor = isDark ? "#0a0a0a" : "#ffffff";
    const midToneBase = isDark ? 15 : 95;

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const noiseVal = getWaveHeight(x, y, timeRef.current);
        let color: string;

        if (noiseVal < 0.40) {
          // Background (Low points)
          color = bgColor;
        } else if (noiseVal < 0.55) {
          // Mid-tones (Grey/Foam)
          const step = Math.floor(noiseVal * 100);
          const lightness = isDark
            ? midToneBase + ((step % 3) * 3) // 15%, 18%, 21% for dark
            : midToneBase - ((step % 3) * 3); // 95%, 92%, 89% for light
          color = `hsl(0, 0%, ${lightness}%)`;
        } else {
          // Water (High points) - use accent color or grayscale
          const norm = (noiseVal - 0.55) * 2.2;

          if (isGrayscale) {
            // Grayscale rendering for default option
            let light: number;
            if (grayscaleInverted) {
              // Light mode: use lighter grey shades (not too dark)
              if (isDark) {
                light = 30 - (norm * 20); // 30% down to 10%
              } else {
                light = 75 - (norm * 20); // 75% down to 55% (lighter greys)
              }
            } else {
              // Dark mode: lighter shades
              if (isDark) {
                light = 85 - (norm * 25); // 85% down to 60%
              } else {
                light = 95 - (norm * 20); // 95% down to 75%
              }
            }
            light = Math.floor(light / 4) * 4;
            color = `hsl(0, 0%, ${light}%)`;
          } else {
            // Colored rendering
            // Hue shift for depth
            const hue = baseHue + (norm * 15);

            // Saturation based on depth
            const sat = Math.min(baseSaturation - 20 + (norm * 30), 95);

            // Lightness with banding
            let light: number;
            if (isDark) {
              // Dark mode: lighter colors
              light = 65 - (norm * 25); // 65% down to 40%
            } else {
              // Light mode: darker colors for contrast
              light = 75 - (norm * 45); // 75% down to 30%
            }
            light = Math.floor(light / 4) * 4;

            color = `hsl(${hue}, ${sat}%, ${light}%)`;
          }
        }

        ctx.fillStyle = color;
        ctx.fillRect(
          x * pixelSize,
          y * pixelSize,
          pixelSize + 0.5,
          pixelSize + 0.5
        );
      }
    }

    timeRef.current += configRef.current.speed;
    animationRef.current = requestAnimationFrame(draw);
  }, [isDark, getWaveHeight]);

  // Resize handler
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  useEffect(() => {
    // Initial setup
    updateBaseHue();
    resize();

    // Start animation
    animationRef.current = requestAnimationFrame(draw);

    // Handle resize
    window.addEventListener("resize", resize);

    // Watch for accent changes via MutationObserver
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "data-accent" || mutation.attributeName === "class") {
          updateBaseHue();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-accent", "class"],
    });

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
      observer.disconnect();
    };
  }, [draw, resize, updateBaseHue]);

  // Re-update hue when theme changes
  useEffect(() => {
    updateBaseHue();
  }, [theme, resolvedTheme, updateBaseHue]);

  return (
    <div className={`fixed inset-0 -z-10 ${className || ""}`}>
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Scanlines overlay */}
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
          backgroundSize: "100% 2px",
        }}
      />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[11]"
        style={{
          background: `radial-gradient(
            circle,
            rgba(0,0,0,0) 60%,
            rgba(0,0,0,0.15) 100%
          )`,
        }}
      />

      {/* Subtle glow/flicker */}
      <div
        className="absolute inset-0 pointer-events-none z-[12] animate-[flicker_0.15s_infinite]"
        style={{
          background: isDark ? "rgba(255, 255, 255, 0.01)" : "rgba(255, 255, 255, 0.02)",
        }}
      />
    </div>
  );
}
