"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Define a type for the Window with MSStream property
interface WindowWithMSStream extends Window {
  MSStream?: unknown;
}

// Define a global variable to coordinate with OverscrollFix
declare global {
  interface Window {
    _lastScrollToTopTime?: number;
  }
}

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as WindowWithMSStream).MSStream;
    // Check if we're on any mobile device (Android or iOS)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Function to perform the scroll
    const scrollToTop = () => {
      // Store the last time we scrolled to top (used for coordination with OverscrollFix)
      window._lastScrollToTopTime = Date.now();
      
      window.scrollTo({
        top: 0,
        behavior: "instant" // Use "instant" instead of "smooth" to avoid visual issues
      });
    };
    
    // For mobile devices, use a small timeout to ensure the scroll happens 
    // after any browser-specific behaviors and rendering
    if (isMobile) {
      // Use a slightly longer timeout for iOS which may need more time
      const timeoutDuration = isIOS ? 50 : 10;
      
      // First immediate scroll attempt
      scrollToTop();
      
      // Second scroll attempt after a small delay
      const timeoutId = setTimeout(() => {
        scrollToTop();
        
        // For iOS, add a third attempt with a longer delay
        if (isIOS) {
          setTimeout(scrollToTop, 100);
        }
      }, timeoutDuration);
      
      return () => clearTimeout(timeoutId);
    } else {
      // For desktop, just scroll immediately
      scrollToTop();
    }
  }, [pathname]);

  return null; // This component doesn't render anything
} 