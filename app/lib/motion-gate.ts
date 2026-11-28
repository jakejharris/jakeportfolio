/**
 * The motion gate for post figures. A figure that moves carries
 * `data-pf-motion` on its root; one IntersectionObserver marks each of them
 * `data-pf-inview="true"` while it is in view and the page is visible, and
 * `"false"` otherwise. The figures' CSS runs its animations only while that
 * reads true, so figures off screen and pages in hidden tabs cost nothing.
 *
 * `data-pf-js` on `<html>` tells the CSS the gate is running. Without it
 * (no JavaScript, or no IntersectionObserver) every figure stays in its
 * settled, server-rendered state.
 *
 * A video inside a figure that carries `data-pf-autoplay` plays muted and
 * without controls while its figure is in view, and pauses otherwise. Under
 * reduced motion it is left alone, controls and all.
 */

export const MOTION_SELECTOR = '[data-pf-motion]';

/** Only the middle of the viewport counts, so a figure starts once it can be seen. */
export const MOTION_ROOT_MARGIN = '-10% 0px -10% 0px';

type Observer = Pick<IntersectionObserver, 'observe' | 'disconnect'>;
type ObserverClass = new (
  callback: (entries: Array<Pick<IntersectionObserverEntry, 'target' | 'isIntersecting'>>) => void,
  options: IntersectionObserverInit
) => Observer;

interface GateDocument {
  hidden: boolean;
  documentElement: Pick<Element, 'setAttribute'>;
  querySelectorAll(selector: string): ArrayLike<Element>;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function driveVideos(root: Element, inView: boolean) {
  for (const video of Array.from(root.querySelectorAll<HTMLVideoElement>('video[data-pf-autoplay]'))) {
    if (inView && !reducedMotion()) {
      video.muted = true;
      video.controls = false;
      video.play()?.catch(() => {});
    } else {
      video.pause();
    }
  }
}

/** Starts the gate for every motion figure on the page; returns the cleanup. */
export function startMotionGate(
  doc: GateDocument = document,
  IO: ObserverClass | undefined = globalThis.IntersectionObserver
): () => void {
  if (typeof IO !== 'function') return () => {};
  const roots = Array.from(doc.querySelectorAll(MOTION_SELECTOR));
  const seen = new Map<Element, boolean>();

  const write = (root: Element) => {
    const inView = !doc.hidden && seen.get(root) === true;
    const value = String(inView);
    if (root.getAttribute('data-pf-inview') === value) return;
    root.setAttribute('data-pf-inview', value);
    driveVideos(root, inView);
  };

  for (const root of roots) write(root);
  doc.documentElement.setAttribute('data-pf-js', '');
  if (roots.length === 0) return () => {};

  const observer = new IO(
    (entries) => {
      for (const entry of entries) {
        seen.set(entry.target, entry.isIntersecting);
        write(entry.target);
      }
    },
    { rootMargin: MOTION_ROOT_MARGIN }
  );
  for (const root of roots) observer.observe(root);
  const onVisibility = () => roots.forEach(write);
  doc.addEventListener('visibilitychange', onVisibility);
  return () => {
    observer.disconnect();
    doc.removeEventListener('visibilitychange', onVisibility);
  };
}
