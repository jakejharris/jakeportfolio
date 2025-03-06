"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant"
    });
    
    // Check after 2ms if we're actually at the top
    const timeoutId = setTimeout(() => {
      if (window.scrollY !== 0) {
        window.scrollTo({
          top: 0,
          behavior: "instant"
        });
      }
    }, 2);
    
    return () => clearTimeout(timeoutId);
  }, [pathname]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant"
    });
    
    // Check after 2ms if we're actually at the top
    const timeoutId = setTimeout(() => {
      if (window.scrollY !== 0) {
        window.scrollTo({
          top: 0,
          behavior: "instant"
        });
      }
    }, 2);
    
    return () => clearTimeout(timeoutId);
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.body.scrollIntoView({
      behavior: 'instant'
    });
    
    // Check after 2ms if we're actually at the top
    const timeoutId = setTimeout(() => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    }, 2);
    
    return () => clearTimeout(timeoutId);
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.body.scrollIntoView({
      behavior: 'instant'
    });
    
    // Check after 2ms if we're actually at the top
    const timeoutId = setTimeout(() => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    }, 2);
    
    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return null;
} 