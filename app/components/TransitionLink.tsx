"use client";

import Link, { LinkProps } from "next/link";
import { ReactNode, MouseEvent } from "react";

// Internal links. How a page change looks and feels is handled once for the
// whole site (components/navigation and the pixel water), whatever started
// it, so this is Next's Link.
interface TransitionLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
  onClickCapture?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

export default function TransitionLink({ children, className, ...props }: TransitionLinkProps) {
  return (
    <Link {...props} className={className}>
      {children}
    </Link>
  );
}
