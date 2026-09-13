"use client";

import { useEffect } from 'react';
import { legacyDestination } from './legacy-fragments';

export default function LegacyFragments() {
  useEffect(() => {
    const redirect = () => {
      const destination = legacyDestination(window.location.hash);
      if (destination) window.location.replace(destination);
    };
    redirect();
    window.addEventListener('hashchange', redirect);
    return () => window.removeEventListener('hashchange', redirect);
  }, []);
  return null;
}
