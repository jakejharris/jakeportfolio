"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant"
    });
    toast("Scrolled to top", {
      description: `Navigated to ${pathname}`,
      position: "bottom-right",
    });
  }, [pathname]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant"
    });
    toast("Page loaded", {
      description: "Initial scroll to top",
      position: "bottom-right",
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