"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import DesktopNavbar from './DesktopNavbar';
import MobileNavbar from './MobileNavbar';
import { NAVBAR_DESKTOP_MEDIA_QUERY } from '../lib/navbar';
import '../css/navbar.css';
import '../css/mobile-navbar.css';
import '../css/animations.css';
import '../css/magical-button.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(true);
  const prevScrollPos = useRef(0);
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

        const isScrolledDown = prevScrollPos.current < currentScrollPos;
        const isScrollingUp = prevScrollPos.current > currentScrollPos;
        const isAtTop = currentScrollPos < 10;

        // This state is only applied to the CSS-selected mobile navbar.
        if (isScrolledDown && !isAtTop && Math.abs(currentScrollPos - prevScrollPos.current) > 5) {
          setMobileVisible(false);
        } else if (isScrollingUp || isAtTop) {
          setMobileVisible(true);
        }

        // Remember the scroll position for next comparison
        prevScrollPos.current = currentScrollPos;
        ticking.current = false;
      });
    }
  }, []);

  useEffect(() => {
    const desktopQuery = window.matchMedia(NAVBAR_DESKTOP_MEDIA_QUERY);
    const handleBreakpointChange = () => setMobileVisible(true);

    window.addEventListener('scroll', handleScroll, { passive: true });
    desktopQuery.addEventListener('change', handleBreakpointChange);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      desktopQuery.removeEventListener('change', handleBreakpointChange);
    };
  }, [handleScroll]);

  return (
    <>
      <DesktopNavbar scrolled={scrolled} />
      <MobileNavbar scrolled={scrolled} visible={mobileVisible} />
    </>
  );
}
