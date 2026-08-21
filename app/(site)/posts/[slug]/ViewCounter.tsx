'use client';

import { useEffect, useState } from 'react';

interface ViewCounterProps {
  slug: string;
  initialCount: number;
}

export default function ViewCounter({ slug, initialCount }: ViewCounterProps) {
  const [viewCount, setViewCount] = useState(initialCount);

  useEffect(() => {
    const incrementViewCount = async () => {
      try {
        const response = await fetch('/api/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        });

        if (!response.ok) return;

        const data: { viewCount: number } = await response.json();
        setViewCount(data.viewCount);
      } catch {
        // View counting is best-effort; keep showing the server-rendered count.
      }
    };

    incrementViewCount();
  }, [slug]);

  return <div>{viewCount} views</div>;
}
