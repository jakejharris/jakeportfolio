'use client';

import { useEffect, useState } from 'react';

export type RgbTriplet = [number, number, number];

interface CanvasColors {
  accent: RgbTriplet;
  fg: RgbTriplet;
  isDark: boolean;
  ready: boolean;
}

const INITIAL_COLORS: CanvasColors = {
  accent: [255, 255, 255],
  fg: [255, 255, 255],
  isDark: false,
  ready: false,
};

function parseRgb(value: string): RgbTriplet {
  const rgbMatch = value.match(
    /rgba?\(\s*([.\d]+)[,\s]+([.\d]+)[,\s]+([.\d]+)(?:\s*[,/]\s*[.\d]+)?\s*\)/i
  );

  if (rgbMatch) {
    return [
      Math.round(Number(rgbMatch[1])),
      Math.round(Number(rgbMatch[2])),
      Math.round(Number(rgbMatch[3])),
    ];
  }

  const colorMatch = value.match(
    /color\(\s*srgb\s+([.\d]+)\s+([.\d]+)\s+([.\d]+)/i
  );

  if (colorMatch) {
    return [
      Math.round(Number(colorMatch[1]) * 255),
      Math.round(Number(colorMatch[2]) * 255),
      Math.round(Number(colorMatch[3]) * 255),
    ];
  }

  return [255, 255, 255];
}

function readCanvasColors(): CanvasColors {
  const root = document.documentElement;
  const probe = document.createElement('span');

  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  document.body.appendChild(probe);

  probe.style.color = 'var(--accent-color)';
  const accent = parseRgb(getComputedStyle(probe).color);
  probe.style.color = 'hsl(var(--foreground))';
  const fg = parseRgb(getComputedStyle(probe).color);

  probe.remove();

  return {
    accent,
    fg,
    isDark: root.classList.contains('dark'),
    ready: true,
  };
}

export function rgba([r, g, b]: RgbTriplet, a: number) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function useCanvasColors() {
  const [colors, setColors] = useState<CanvasColors>(INITIAL_COLORS);

  useEffect(() => {
    let frame = 0;

    const read = () => {
      if (!document.body) return;
      setColors(readCanvasColors());
    };

    read();
    frame = window.requestAnimationFrame(read);

    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-accent'],
    });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return colors;
}
