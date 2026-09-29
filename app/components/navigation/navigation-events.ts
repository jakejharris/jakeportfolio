// Page changes, announced to whatever moves with them (the pixel water, the
// navbar). A tap on a link departs at once; the arrival follows when the
// next page is on screen, from the same point.

import { useSyncExternalStore } from 'react';

export const NAV_DEPART_EVENT = 'site-nav:depart';
export const NAV_ARRIVE_EVENT = 'site-nav:arrive';

export interface NavDeparture {
  /** Viewport px of the tap or the activated link. */
  x: number;
  y: number;
  /** Path the reader is going to. */
  to: string;
}

export type ArrivalKind = 'push' | 'restore';

export interface NavArrival {
  kind: ArrivalKind;
  pathname: string;
  /** Viewport px the page changed from; absent for back and forward. */
  x?: number;
  y?: number;
  /** The page arrived under the mobile menu, which reveals it itself. */
  covered: boolean;
}

export function trimPath(path: string) {
  const bare = path.split(/[?#]/)[0] || '/';
  return bare === '/' ? bare : bare.replace(/\/+$/, '');
}

// Where the reader is headed while the next page loads, so the navbar can
// point there at once.
let pendingPath: string | null = null;
const listeners = new Set<() => void>();

export function setPendingPath(path: string | null) {
  if (path === pendingPath) return;
  pendingPath = path;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePendingPath() {
  return useSyncExternalStore(subscribe, () => pendingPath, () => null);
}
