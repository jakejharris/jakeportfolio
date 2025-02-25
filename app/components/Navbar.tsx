"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import DesktopNavbar from './DesktopNavbar';
import MobileNavbar from './MobileNavbar';
import '../css/navbar.css';
import '../css/mobile-navbar.css';
import '../css/animations.css';
import '../css/magical-button.css';

// Client-only wrapper component to handle hydration mismatch
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  if (!hasMounted) {
    return <div className="h-16 bg-secondary"></div>; // Placeholder with same height
  }
  
  return <>{children}</>;
}

// Debounce function to limit how often a function is called
function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const ticking = useRef(false);
  
  // Create a stable scroll handler with useCallback
  const handleScroll = useCallback(() => {
    if (!ticking.current) {
      ticking.current = true;
      
      // Use requestAnimationFrame to optimize performance
      requestAnimationFrame(() => {
        const currentScrollPos = window.scrollY;
        
        // Set scrolled state for styling
        setScrolled(currentScrollPos > 10);
        
        // Only apply hide/show logic on mobile
        if (isMobile) {
          const isScrolledDown = prevScrollPos < currentScrollPos;
          const isScrollingUp = prevScrollPos > currentScrollPos;
          const isAtTop = currentScrollPos < 10;
          
          // Only hide when scrolling down significantly and not at the top
          if (isScrolledDown && !isAtTop && Math.abs(currentScrollPos - prevScrollPos) > 5) {
            setVisible(false);
          } else if (isScrollingUp || isAtTop) {
            setVisible(true);
          }
        } else {
          // On desktop, always keep the navbar visible
          setVisible(true);
        }
        
        // Remember the scroll position for next comparison
        setPrevScrollPos(currentScrollPos);
        ticking.current = false;
      });
    }
  }, [prevScrollPos, isMobile]);
  
  // Create a debounced version of the resize handler
  const handleResize = useCallback(() => {
    const isMobileView = window.innerWidth < 768;
    setIsMobile(isMobileView);
    
    // Always show navbar when switching between mobile and desktop
    setVisible(true);
  }, []);
  
  const debouncedHandleResize = useCallback(
    () => debounce(handleResize, 100)(),
    [handleResize]
  );

  useEffect(() => {
    // Set isClient to true once component mounts
    setIsClient(true);
    
    // Initial check
    handleResize();

    // Add event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', debouncedHandleResize);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', debouncedHandleResize);
    };
  }, [handleScroll, debouncedHandleResize, handleResize]);

  const navbarProps = {
    scrolled,
    visible,
  };

  // Return a placeholder during SSR or before client detection
  if (!isClient) {
    return <div className="h-16 bg-secondary"></div>;
  }

  return (
    <ClientOnly>
      {isMobile 
        ? <MobileNavbar {...navbarProps} /> 
        : <DesktopNavbar {...navbarProps} />}
    </ClientOnly>
  );
} 