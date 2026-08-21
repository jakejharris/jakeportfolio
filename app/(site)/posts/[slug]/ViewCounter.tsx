'use client';

import { useEffect, useState } from 'react';

interface ViewCounterProps {
  slug: string;
  initialCount: number;
  seedCount: number;
}

export default function ViewCounter({ slug, initialCount, seedCount }: ViewCounterProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);

    const key = `viewed:${slug}`;
    let alreadyViewed = false;
    try {
      alreadyViewed = sessionStorage.getItem(key) !== null;
      if (!alreadyViewed) {
        sessionStorage.setItem(key, '1');
      }
    } catch {
      // Storage unavailable (private mode, sandboxed iframe): continue without dedup.
      alreadyViewed = false;
    }
    if (alreadyViewed) {
      return;
    }

    let cancelled = false;
    fetch('/api/views/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, seedCount }),
    })
      .then(async (response) => {
        if (cancelled || response.status === 204) {
          return;
        }
        if (!response.ok) {
          throw new Error(`Unexpected status ${response.status}`);
        }
        const body = (await response.json()) as { viewCount?: unknown };
        if (typeof body.viewCount !== 'number' || !Number.isFinite(body.viewCount)) {
          throw new Error('Malformed view-count response');
        }
        if (!cancelled) {
          setCount(body.viewCount);
        }
      })
      .catch(() => {
        try {
          sessionStorage.removeItem(key);
        } catch {
          // Storage unavailable; nothing to undo.
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, initialCount, seedCount]);

  return <div>{count} views</div>;
}
