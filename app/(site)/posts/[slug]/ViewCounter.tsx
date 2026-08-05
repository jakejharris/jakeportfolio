'use client';

import { useEffect, useState } from 'react';

interface ViewCounterProps {
  slug: string;
  initialCount: number;
  viewToken: string;
}

export default function ViewCounter({ slug, initialCount, viewToken }: ViewCounterProps) {
  const [viewCount, setViewCount] = useState(initialCount);

  useEffect(() => {
    // Check if already viewed in this session - do this synchronously before any async operations
    const hasViewedInSession = sessionStorage.getItem(`viewed-${slug}`);
    
    if (!hasViewedInSession) {
      // Mark as viewed immediately to prevent race conditions
      sessionStorage.setItem(`viewed-${slug}`, 'true');
      
      const incrementViewCount = async () => {
        try {
          const response = await fetch('/api/views', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ slug, viewToken }),
          });

          if (response.status !== 200) {
            return;
          }

          const data: { viewCount: number } = await response.json();
          setViewCount(data.viewCount);
        } catch {
          // View counting is best-effort; keep showing the server-rendered count.
        }
      };

      incrementViewCount();
    }
  }, [slug, viewToken]);

  return <div>{viewCount} views</div>;
}
