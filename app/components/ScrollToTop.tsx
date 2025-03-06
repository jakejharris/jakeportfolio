"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Use useLayoutEffect to ensure this runs before browser paint
  useLayoutEffect(() => {
    // Force scroll to top immediately with multiple approaches
    window.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
    document.body.scrollTo(0, 0);
    document.body.scrollIntoView({
      behavior: 'instant'
    });
  }, [pathname, searchParams]); // Include searchParams to handle query parameter changes too

  // Backup with useEffect and setTimeout to ensure it runs after all rendering
  useEffect(() => {
    const timer = setTimeout(() => {
      // Force scroll to top with multiple approaches
      window.scrollTo(0, 0);
      document.documentElement.scrollTo(0, 0);
      document.body.scrollTo(0, 0);
      document.body.scrollIntoView({
        behavior: 'instant'
      });
    }, 0);
    
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}