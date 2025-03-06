"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Scroll to top when the pathname changes
    window.scrollTo({
      top: 0,
      behavior: "instant" // Use "instant" instead of "smooth" to avoid visual issues
    });
  }, [pathname]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant" // Use "instant" instead of "smooth" to avoid visual issues
    });
  }, []);

  return null; // This component doesn't render anything
} 