"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, ReactNode, CSSProperties } from "react";

interface LinkTopProps {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  target?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  [key: string]: any;
}

/**
 * CustomLink - A replacement for Next.js Link component that fixes scroll issues
 * 
 * @param {Object} props
 * @param {string} props.href - The URL to navigate to
 * @param {string} [props.className] - Optional CSS class name
 * @param {React.ReactNode} props.children - Child elements
 * @param {Function} [props.onClick] - Optional onClick handler
 * @param {string} [props.target] - Optional target attribute ("_blank", etc.)
 * @param {Object} [props.style] - Optional inline styles
 * @param {string} [props.ariaLabel] - Optional aria-label for accessibility
 * @param {Object} [props.rest] - Any other props to pass to the anchor element
 */
export default function LinkTop({
  href,
  className,
  children,
  onClick,
  target,
  style,
  ariaLabel,
  ...rest
}: LinkTopProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Reset scroll position after navigation
  useEffect(() => {
    if (isNavigating) {
      // Using multiple methods to ensure scroll reset works
      const resetScroll = () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTo(0, 0);
        document.body.scrollTo(0, 0);
        setIsNavigating(false);
      };
      
      // Try immediately
      resetScroll();
      
      // And also with a small delay to ensure it happens after any renders
      const timer = setTimeout(resetScroll, 10);
      return () => clearTimeout(timer);
    }
  }, [isNavigating]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    // If it's an external link or has a special target, let the default behavior happen
    if (target === "_blank" || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      if (onClick) onClick(e);
      return;
    }
    
    // Prevent default link behavior
    e.preventDefault();
    
    // Execute any provided onClick handler
    if (onClick) onClick(e);
    
    // Set navigating state to trigger scroll reset
    setIsNavigating(true);
    
    // Add a timestamp parameter to prevent caching/history issues
    const timestamp = Date.now();
    const hasQuery = href.includes('?');
    const navigationUrl = `${href}${hasQuery ? '&' : '?'}_t=${timestamp}`;
    
    // Navigate using router.push
    router.push(navigationUrl, { scroll: false });
  }, [href, onClick, router, target]);

  return (
    <a
      href={href}
      className={className}
      onClick={handleClick}
      target={target}
      style={style}
      aria-label={ariaLabel}
      {...rest}
    >
      {children}
    </a>
  );
}