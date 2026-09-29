// A theme switch that floods the page from the button, one lattice cell at a
// time. The View Transitions API keeps the old page as a still image and
// reveals the new one inside a growing, pixel-stepped disk, so both halves
// stay fully drawn and readable during the sweep. Browsers without the API,
// and readers who ask for reduced motion, get an instant switch.

// Same cell as the pixel water, so the flood lines up with it.
export const TIDE_CELL = 18;
const TIDE_MS = 640;
const TIDE_STEPS = 18;

/**
 * clip-path polygon of every lattice cell whose center lies within `radius`
 * of (x, y), in viewport px. Rows outside the disk are left out.
 */
export function tidePolygon(
  x: number,
  y: number,
  radius: number,
  height: number,
  cell = TIDE_CELL
): string {
  const right: string[] = [];
  const left: string[] = [];
  const rows = Math.ceil(height / cell);
  for (let row = 0; row < rows; row++) {
    const top = row * cell;
    const dy = top + cell / 2 - y;
    if (Math.abs(dy) > radius) continue;
    const half = Math.sqrt(radius * radius - dy * dy);
    const first = Math.ceil((x - half) / cell - 0.5);
    const last = Math.floor((x + half) / cell - 0.5);
    if (last < first) continue;
    const x0 = first * cell;
    const x1 = (last + 1) * cell;
    right.push(`${x1}px ${top}px`, `${x1}px ${top + cell}px`);
    left.unshift(`${x0}px ${top + cell}px`, `${x0}px ${top}px`);
  }
  if (!right.length) return 'polygon(0 0, 0 0, 0 0)';
  return `polygon(${right.concat(left).join(', ')})`;
}

// Quick off the mark, then easing out as it reaches the far corner.
function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t);
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => {
    ready: Promise<void>;
    finished: Promise<void>;
    skipTransition: () => void;
  };
};

// Keep the browser's snapshots bounded, including while it is still capturing
// the old page. A skipped transition still runs its update callback.
interface Flood {
  transition: ReturnType<NonNullable<ViewTransitionDocument['startViewTransition']>>;
  animation?: Animation;
  superseded: boolean;
  latest?: () => void;
}
let activeFlood: Flood | null = null;

export function isThemeFloodActive() {
  return activeFlood !== null;
}

/** Run `apply` (which must switch the theme synchronously) as a tide from (x, y). */
export function floodTheme(apply: () => void, x: number, y: number) {
  if (activeFlood) {
    activeFlood.latest = apply;
    if (!activeFlood.superseded) {
      activeFlood.superseded = true;
      activeFlood.animation?.cancel();
      activeFlood.transition.skipTransition();
    }
    return;
  }

  const doc = document as ViewTransitionDocument;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doc.startViewTransition || reduce) {
    apply();
    return;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const reach = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + TIDE_CELL;
  const frames: Keyframe[] = [];
  for (let step = 0; step <= TIDE_STEPS; step++) {
    const radius = TIDE_CELL + (reach - TIDE_CELL) * easeOutQuad(step / TIDE_STEPS);
    frames.push({ clipPath: tidePolygon(x, y, radius, height), easing: 'step-end' });
  }

  const transition = doc.startViewTransition(() => {
    if (!flood.superseded) apply();
  });
  const flood: Flood = { transition, superseded: false };
  activeFlood = flood;
  transition.ready
    .then(() => {
      if (activeFlood !== flood || flood.superseded) return;
      flood.animation = document.documentElement.animate(frames, {
        duration: TIDE_MS,
        pseudoElement: '::view-transition-new(root)',
      });
    })
    .catch(() => {});
  const finish = () => {
    activeFlood = null;
    flood.latest?.();
  };
  void transition.finished.then(finish, finish);
}
