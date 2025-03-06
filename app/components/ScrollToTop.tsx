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
  }, [pathname]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant"
    });
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.body.scrollIntoView({
      behavior: 'instant'
    });
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.body.scrollIntoView({
      behavior: 'instant'
    });
  }, [pathname]);

  // iOS specific scroll handling
  useEffect(() => {
    // Check if the device is iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS) {
      // iOS specific scroll reset
      window.scrollTo(0, 1);
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 10);
    }
  }, [pathname]);

  return null;
} 