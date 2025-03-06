"use client";

import { ReactNode, useLayoutEffect, useEffect } from "react";
import { usePathname } from "next/navigation";

interface ScrollToTopWrapperProps {
  children: ReactNode;
}

export default function ScrollToTopWrapper({ children }: ScrollToTopWrapperProps) {
  const pathname = usePathname();

  // Using useLayoutEffect to ensure this runs before browser paint
  useLayoutEffect(() => {
    // Force scroll to top immediately with no animation
    window.scrollTo(0, 0);
  }, [pathname]); // Re-run when pathname changes

  useLayoutEffect(() => {
    // Force scroll to top immediately with no animation
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Force scroll to top immediately with no animation
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Force scroll to top immediately with no animation
    window.scrollTo(0, 0);
  }, [pathname]);

  return <>{children}</>;
}