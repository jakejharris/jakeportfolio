"use client";

import Link, { LinkProps } from "next/link";
import { useTransition } from "./TransitionProvider";
import { ReactNode, MouseEvent } from "react";

interface TransitionLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
}

export default function TransitionLink({ children, className, href, ...props }: TransitionLinkProps) {
  const { setOrigin } = useTransition();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Extract pathname without hash
    const hrefString = typeof href === "string" ? href : href.pathname || "/";
    const destination = hrefString.split("#")[0] || "/";

    setOrigin({
      x: e.clientX,
      y: e.clientY,
      destination,
    });
  };

  return (
    <Link href={href} {...props} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
