'use client';

import * as React from 'react';

/**
 * Wraps a figure whose motion is pure CSS and holds every animation inside it
 * while the figure is off screen. One observer for the whole figure, so the
 * pieces (the HTTP link, the head's halo, the fabric packets) stay on one
 * clock and never drift apart from being paused separately.
 */
export default function MotionScope({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = React.useState(true);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      rootMargin: '120px 0px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} data-js3-motion={onScreen ? 'playing' : 'paused'}>
      {children}
    </div>
  );
}
