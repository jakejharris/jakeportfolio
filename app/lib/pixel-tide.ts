// A theme switch that floods the page from the button, one lattice cell at a
// time. The View Transitions API keeps the old page as a still image and
// reveals the new one inside a growing, pixel-stepped disk, so both halves
// stay fully drawn and readable during the sweep. Browsers without the API,
// and readers who ask for reduced motion, get an instant switch.
//
// Requests only change what the page should end up as. One flood runs at a
// time and nothing cuts it short, since turning the page back mid-sweep would
// flash it: the flood applies the newest request when the browser is ready
// for it, and when it ends the page floods again only if the newest request
// differs from what shows. Spammed, the button rolls day and night across the
// page one sweep after another and always ends on the last click. Instant
// switches are held apart the same way.

// Same cell as the pixel water, so the flood lines up with it.
export const TIDE_CELL = 18;
export const TIDE_MS = 640;
// A flood that follows another is quicker: the reader is waiting on it.
export const TIDE_AGAIN_MS = 460;
const TIDE_STEPS = 18;
/** Instant switches in a row are at least this far apart. */
export const CALM_MS = 400;

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

interface ViewTransition {
  ready: Promise<void>;
  finished: Promise<void>;
  skipTransition: () => void;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransition;
};

interface ThemeRequest {
  apply: () => void;
  pending: () => boolean;
  x: number;
  y: number;
}

// Keep the browser's snapshots bounded: one transition at a time, including
// while it is still capturing the old page.
interface Flood {
  transition?: ViewTransition;
  animation?: Animation;
  changed: boolean;
}
let activeFlood: Flood | null = null;
// The newest request made while a flood ran.
let queued: ThemeRequest | null = null;
// Instant switches.
let calmAt = -Infinity;
let calmTimer: ReturnType<typeof setTimeout> | null = null;
let calmNext: ThemeRequest | null = null;

export function isThemeFloodActive() {
  return activeFlood !== null;
}

/**
 * Switch the theme as a tide from (x, y). `apply` switches <html> to the
 * newest requested theme synchronously; `pending` says whether that differs
 * from what shows.
 */
export function floodTheme(apply: () => void, x: number, y: number, pending: () => boolean = () => true) {
  const request = { apply, pending, x, y };
  if (activeFlood) {
    queued = request;
    return;
  }
  start(request, TIDE_MS);
}

function start(request: ThemeRequest, duration: number) {
  const doc = document as ViewTransitionDocument;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doc.startViewTransition || reduce) {
    switchCalmly(request);
    return;
  }

  const { x, y } = request;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const reach = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + TIDE_CELL;
  const frames: Keyframe[] = [];
  for (let step = 0; step <= TIDE_STEPS; step++) {
    const radius = TIDE_CELL + (reach - TIDE_CELL) * easeOutQuad(step / TIDE_STEPS);
    frames.push({ clipPath: tidePolygon(x, y, radius, height), easing: 'step-end' });
  }

  const flood: Flood = { changed: false };
  activeFlood = flood;
  const transition = doc.startViewTransition(() => {
    // Whatever was asked for last, by now.
    flood.changed = request.pending();
    if (flood.changed) request.apply();
  });
  flood.transition = transition;
  transition.ready
    .then(() => {
      if (activeFlood !== flood) return;
      // An even burst while the page was captured: nothing to reveal.
      if (!flood.changed) {
        transition.skipTransition();
        return;
      }
      flood.animation = document.documentElement.animate(frames, {
        duration,
        pseudoElement: '::view-transition-new(root)',
      });
    })
    .catch(() => {});
  const finish = () => {
    if (activeFlood !== flood) return;
    activeFlood = null;
    const next = queued;
    queued = null;
    if (next?.pending()) start(next, TIDE_AGAIN_MS);
  };
  void transition.finished.then(finish, finish);
}

// Without a flood, a burst of switches would strobe the page. The first
// switches at once; the rest wait their turn, and only the newest one counts.
function switchCalmly(request: ThemeRequest) {
  calmNext = request;
  if (calmTimer !== null) return;
  const wait = calmAt + CALM_MS - performance.now();
  if (wait <= 0) {
    switchNow();
    return;
  }
  calmTimer = setTimeout(() => {
    calmTimer = null;
    switchNow();
  }, wait);
}

function switchNow() {
  const request = calmNext;
  calmNext = null;
  if (!request?.pending()) return;
  calmAt = performance.now();
  request.apply();
}
