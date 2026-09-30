'use client';

// The frame, controls and timing every compression figure shares. A figure
// tells its story once when it scrolls into view, then rests: nothing moves
// beside the words while they are read. Replay and the controls run it
// again; reduced motion shows the resting state and switches without motion.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { RotateCcw } from 'lucide-react';

import { cn } from '@/app/lib/utils';

export const LINE = 'color-mix(in srgb, hsl(var(--foreground)) 13%, transparent)';
export const FAINT = 'color-mix(in srgb, hsl(var(--foreground)) 55%, transparent)';
export const DIM = 'color-mix(in srgb, hsl(var(--foreground)) 80%, transparent)';
export const ACCENT = 'var(--accent-color)';

/** A layout effect in the browser, where it can act before the next paint. */
export const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reduced;
}

/** True once `ref` has been at least `threshold` visible, and stays true. */
export function useSeen(ref: RefObject<Element | null>, threshold = 0.4) {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || seen) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, seen, threshold]);

  return seen;
}

/**
 * The css size of an element and the device pixel ratio, kept current, so a
 * canvas redraws sharp after a resize or a browser zoom.
 */
export function useBox(ref: RefObject<Element | null>) {
  const [box, setBox] = useState<{ width: number; height: number; dpr: number } | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let width = 0;
    let height = 0;
    const update = () => {
      const dpr = window.devicePixelRatio || 1;
      setBox((previous) =>
        previous && previous.width === width && previous.height === height && previous.dpr === dpr
          ? previous
          : { width, height, dpr }
      );
    };

    const observer = new ResizeObserver(([entry]) => {
      width = Math.round(entry.contentRect.width);
      height = Math.round(entry.contentRect.height);
      update();
    });
    observer.observe(element);

    // A resolution query only reports leaving its own ratio, so each change
    // listens again at the new one.
    let media: MediaQueryList | null = null;
    function watch() {
      media?.removeEventListener('change', onRatio);
      media = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      media.addEventListener('change', onRatio);
    }
    function onRatio() {
      watch();
      if (width) update();
    }
    watch();

    return () => {
      observer.disconnect();
      media?.removeEventListener('change', onRatio);
    };
  }, [ref]);

  return box;
}

/** Redraw once the page's fonts have arrived, for text drawn on canvas. */
export function useFontsReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fonts = document.fonts;
    if (!fonts) {
      setReady(true);
      return;
    }
    fonts.ready.then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}

/**
 * A value that travels toward a target at a steady rate, drawing each frame.
 * Figures read it as time through their story (0 to 1) and ease each part
 * of the story themselves. Only one run is ever in flight: a new target
 * retargets it. `speed` multiplies the rate, so a control can move faster
 * than the story does.
 */
export function useAnimator(draw: (value: number) => void, msPerUnit: number) {
  const valueRef = useRef(0);
  const targetRef = useRef(0);
  const speedRef = useRef(1);
  const frameRef = useRef(0);
  const lastRef = useRef(0);
  const drawRef = useRef(draw);

  // Declared first, so it runs before any effect that draws.
  useEffect(() => {
    drawRef.current = draw;
  });

  const tick = useCallback(
    (now: number) => {
      const elapsed = Math.max(0, now - lastRef.current);
      lastRef.current = now;
      const step = (elapsed * speedRef.current) / msPerUnit;
      const value = valueRef.current;
      const target = targetRef.current;
      const next = target > value ? Math.min(target, value + step) : Math.max(target, value - step);
      valueRef.current = next;
      drawRef.current(next);
      frameRef.current = next === target ? 0 : requestAnimationFrame(tick);
    },
    [msPerUnit]
  );

  const to = useCallback(
    (target: number, instant = false, speed = 1) => {
      targetRef.current = target;
      speedRef.current = speed;
      if (instant) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
        valueRef.current = target;
        drawRef.current(target);
        return;
      }
      if (frameRef.current) return;
      lastRef.current = performance.now();
      frameRef.current = requestAnimationFrame(tick);
    },
    [tick]
  );

  /** Jump to `from` and travel to `target`. */
  const run = useCallback(
    (from: number, target: number) => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      valueRef.current = from;
      drawRef.current(from);
      to(target);
    },
    [to]
  );

  const redraw = useCallback(() => drawRef.current(valueRef.current), []);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    },
    []
  );

  return useMemo(() => ({ to, run, redraw, valueRef, targetRef }), [to, run, redraw]);
}

export function Figure({
  label,
  title,
  meta,
  footer,
  children,
  className,
  figureRef,
}: {
  label: string;
  title: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  figureRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <figure
      ref={figureRef as RefObject<HTMLElement>}
      aria-label={label}
      className={cn('relative rounded-lg border font-mono', className)}
      style={{ borderColor: LINE }}
    >
      <div className="flex min-h-[36px] items-center justify-between gap-3 px-3 pt-2.5 text-[11px] leading-tight sm:px-4 sm:pt-3">
        <div style={{ color: DIM }}>{title}</div>
        {meta && (
          <div className="shrink-0 text-right tabular-nums" style={{ color: FAINT }}>
            {meta}
          </div>
        )}
      </div>
      {children}
      {footer && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 pb-3 text-[11px] leading-snug sm:px-4 sm:pb-3.5">
          {footer}
        </div>
      )}
    </figure>
  );
}

const control =
  'h-8 rounded-sm px-2.5 text-[11px] leading-none transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent-color)]';

/**
 * A row of options, one pressed at a time. With `onClear`, pressing the
 * pressed option again releases it and nothing is pressed. With `fill`, the
 * row shares out the width it is given on phones, so a long row still fits.
 */
export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  onClear,
  fill,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: ReactNode }>;
  value: T | null;
  onChange: (value: T) => void;
  onClear?: () => void;
  fill?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-px rounded border p-px',
        fill && 'max-[479px]:flex-1'
      )}
      style={{ borderColor: LINE }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => (active && onClear ? onClear() : onChange(option.value))}
            className={cn(
              control,
              fill && 'max-[479px]:flex-1 max-[479px]:px-0',
              !active && 'hover:text-foreground'
            )}
            style={
              active
                ? {
                    color: 'hsl(var(--foreground))',
                    backgroundColor: 'color-mix(in srgb, var(--accent-color) 18%, transparent)',
                  }
                : { color: FAINT }
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Plays the story again. Reduced motion has no story to replay, and css hides
 * the button there, so the server's layout is already the final one.
 */
export function Replay({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        control,
        'inline-flex items-center gap-1.5 px-1.5 hover:text-foreground motion-reduce:hidden'
      )}
      style={{ color: FAINT }}
    >
      <RotateCcw aria-hidden="true" className="h-3 w-3" strokeWidth={1.75} />
      Replay
    </button>
  );
}
