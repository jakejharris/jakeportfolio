'use client';

import { useEffect, useState } from 'react';

const VIEW_TTL_MS = 24 * 60 * 60 * 1000;

interface ViewCounterProps {
  slug: string;
  initialCount: number;
}

export default function ViewCounter({ slug, initialCount }: ViewCounterProps) {
  const [viewCount, setViewCount] = useState(initialCount);

  useEffect(() => {
    setViewCount(initialCount);

    if (typeof window !== 'undefined') {
      try {
        const key = `viewed:${encodeURIComponent(slug)}`;
        const stored = Number(window.localStorage.getItem(key));
        const now = Date.now();

        if (
          Number.isFinite(stored) &&
          stored >= 0 &&
          stored <= now &&
          now - stored < VIEW_TTL_MS
        ) {
          return;
        }

        window.localStorage.setItem(key, String(now));
      } catch {
        // Storage is best-effort; fail open and count the view.
      }
    }

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
          !cancelled &&
          typeof data.viewCount === 'number' &&
          Number.isFinite(data.viewCount)
        ) {
          setViewCount(data.viewCount);
        }
      } catch {
        // View counting is best-effort; keep showing the server-rendered count.
      }
    };

    incrementViewCount();
    return () => {
      cancelled = true;
    };
  }, [slug, initialCount]);

  return <div>{viewCount} views</div>;
}
