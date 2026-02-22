/**
 * Shared canvas theme colors for compression-intelligence components.
 * All values are RGB triplets (e.g. '100, 180, 255') so components
 * can supply their own alpha via `rgba(${rgb}, alpha)`.
 */
export function getCanvasTheme(isDark: boolean) {
  return {
    // Canvas background gradient stops
    bg: isDark ? '#0a0a14' : '#f8f9fc',
    bgMid: isDark ? '#0d0d1a' : '#eef1f8',

    // Wrapper div classes (border + background)
    wrapperClass: isDark
      ? 'border-white/10 bg-[#0a0a14]'
      : 'border-black/10 bg-[#f8f9fc]',

    // --- RGB triplets for rgba() usage ---

    // Dim label text (used for secondary labels, process labels)
    labelDim: isDark ? '160, 175, 220' : '60, 70, 110',
    // Mid label text (layer labels, active labels)
    labelMid: isDark ? '160, 200, 255' : '40, 80, 180',
    // Bright text (counters, percentages, emphasis)
    labelBright: isDark ? '200, 215, 240' : '30, 45, 80',
    // Secondary label text
    labelSec: isDark ? '138, 155, 210' : '70, 85, 140',

    // Primary blue accent (particles, glows, connections)
    blue: isDark ? '100, 180, 255' : '40, 120, 220',
    // Muted blue (connection lines, structural)
    blueMid: isDark ? '100, 160, 255' : '50, 110, 200',
    // Brighter blue (final glow, emphasis)
    blueLight: isDark ? '120, 200, 255' : '30, 110, 210',
    // Deep blue (savings text, active label)
    blueDeep: isDark ? '140, 200, 255' : '20, 90, 200',

    // Structural line RGB
    structLine: isDark ? '120, 140, 200' : '80, 100, 170',
    // Outline / boundary
    outline: isDark ? '75, 125, 200' : '60, 100, 180',
    boundary: isDark ? '75, 135, 255' : '50, 110, 220',
    boundaryAccent: isDark ? '95, 155, 255' : '60, 120, 220',

    // Layer zone fill
    layerFill: isDark ? '25, 45, 90' : '100, 130, 200',

    // Glow base
    glow: isDark ? '110, 195, 255' : '40, 140, 220',

    // Noise particle (LossyDrift)
    noise: isDark ? '230, 90, 55' : '200, 70, 30',
    // Signal particle
    signal: isDark ? '100, 170, 255' : '40, 120, 220',

    // Filter barrier (LossyDrift)
    filterLine: isDark ? '80, 140, 220' : '60, 110, 190',

    // Arrow hint overlay
    arrow: isDark ? '160, 175, 220' : '80, 95, 140',

    // Node center highlight
    centerHighlight: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.5)',
  };
}

export type CanvasTheme = ReturnType<typeof getCanvasTheme>;
