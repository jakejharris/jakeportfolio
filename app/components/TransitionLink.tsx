"use client";

import Link, { LinkProps } from "next/link";
import { useTransition } from "./TransitionProvider";
import { ReactNode, MouseEvent, KeyboardEvent, useRef } from "react";

interface TransitionLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
}

export default function TransitionLink({ children, className, href, ...props }: TransitionLinkProps) {
  const { setOrigin } = useTransition();
  const linkRef = useRef<HTMLAnchorElement>(null);

  const triggerTransition = (x: number, y: number) => {
    // Extract pathname without hash
    const hrefString = typeof href === "string" ? href : href.pathname || "/";
    const destination = hrefString.split("#")[0] || "/";

    setOrigin({
      x,
      y,
      destination,
    });
  };

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    triggerTransition(e.clientX, e.clientY);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      if (linkRef.current) {
        const rect = linkRef.current.getBoundingClientRect();
        triggerTransition(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    }
  };

  return (
    <Link ref={linkRef} href={href} {...props} className={className} onClick={handleClick} onKeyDown={handleKeyDown}>
      {children}
    </Link>
  );
}
