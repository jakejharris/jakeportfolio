'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { rememberViewCount, VIEW_TTL_MS } from '@/app/lib/remembered-view-count';

interface ViewCounterProps {
  slug: string;
  initialCount: number | null;
}

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function ViewCounter({ slug, initialCount }: ViewCounterProps) {
  const [viewCount, setViewCount] = useState<{ slug: string; count: number | null } | null>(null);

  useClientLayoutEffect(() => {
    const now = Date.now();
    let viewedAt: number | null = null;

    if (typeof window !== 'undefined') {
      try {
        const key = `viewed:${encodeURIComponent(slug)}`;
        const stored = Number(window.localStorage.getItem(key));
        if (
          Number.isFinite(stored) &&
          stored >= 0 &&
          stored <= now &&
          now - stored < VIEW_TTL_MS
        ) {
          viewedAt = stored;
        } else {
          window.localStorage.setItem(key, String(now));
        }
      } catch {
        // Storage is best-effort; fail open and count the view.
      }
    }

    const expiresAt = (viewedAt ?? now) + VIEW_TTL_MS;
    setViewCount({ slug, count: rememberViewCount(slug, initialCount, expiresAt, now) });
    if (viewedAt !== null) return;

    let cancelled = false;
    const incrementViewCount = async () => {
      try {
        const response = await fetch('/api/views/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        });

        if (response.status === 204 || !response.ok) return;

        const data = (await response.json()) as { viewCount?: unknown };
        if (
          typeof data.viewCount === 'number' &&
          Number.isFinite(data.viewCount) && data.viewCount >= 0
        ) {
          // Persist even if the reader left while the request was in flight.
          const count = rememberViewCount(slug, Math.max(initialCount ?? 0, data.viewCount), expiresAt);
          if (!cancelled) setViewCount({ slug, count });
        }
      } catch {
        // View counting is best-effort; keep the last displayed count.
      }
    };

    incrementViewCount();
    return () => {
      cancelled = true;
    };
  }, [slug, initialCount]);

  // Show known counts without waiting for JS. On client navigation the layout
  // effect restores this reader's maximum before paint; hydration may raise SSR.
  const displayedCount = viewCount?.slug === slug && viewCount.count !== null
    ? Math.max(viewCount.count, initialCount ?? 0)
    : initialCount;
  return <div className="min-w-[12ch] tabular-nums whitespace-nowrap">{displayedCount ?? '—'} views</div>;
}
