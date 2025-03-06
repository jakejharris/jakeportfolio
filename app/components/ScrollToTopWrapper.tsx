"use client";

import { ReactNode, useLayoutEffect } from "react";

interface ScrollToTopWrapperProps {
  children: ReactNode;
}

export default function ScrollToTopWrapper({ children }: ScrollToTopWrapperProps) {
  // Using useLayoutEffect to ensure this runs before browser paint
  useLayoutEffect(() => {
    // Force scroll to top immediately with no animation
    window.scrollTo(0, 0);
  }, []);

  return <>{children}</>;
}