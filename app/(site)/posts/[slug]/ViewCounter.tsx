'use client';

import { useEffect, useState } from 'react';
import { rememberViewCount, VIEW_TTL_MS } from '@/app/lib/remembered-view-count';

interface ViewCounterProps {
  slug: string;
  initialCount: number;
}

export default function ViewCounter({ slug, initialCount }: ViewCounterProps) {
  const [viewCount, setViewCount] = useState<{ slug: string; count: number } | null>(null);

  useEffect(() => {
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
          const count = rememberViewCount(slug, Math.max(initialCount, data.viewCount), expiresAt);
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

  // A cached SSR count can be older than this reader's last visit. Wait for
  // storage before displaying a number, including after a hard reload.
  return <div>{viewCount?.slug === slug ? viewCount.count : '—'} views</div>;
}
