'use client';

import { useEffect, useState } from 'react';

interface ViewCounterProps {
  slug: string;
  initialCount: number;
}

export default function ViewCounter({ slug, initialCount }: ViewCounterProps) {
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
            body: JSON.stringify({ slug }),
          });

          if (response.ok) {
            const data = await response.json();
            setViewCount(data.viewCount);
          }
        } catch (error) {
          console.error('Failed to increment view count:', error);
        }
      };

      incrementViewCount();
    }
  }, [slug]); // Only depend on slug

  return <div>{viewCount} views</div>;
} 