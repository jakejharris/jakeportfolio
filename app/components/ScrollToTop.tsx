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

  return null;
} 