"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { NAVBAR_DESKTOP_MEDIA_QUERY } from '../lib/navbar';

interface NavbarScrollState {
  scrolled: boolean;
  mobileVisible: boolean;
}

const NavbarScrollContext = createContext<NavbarScrollState | null>(null);

export function NavbarScrollProvider({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(true);
  const prevScrollPos = useRef(0);
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    if (ticking.current) return;

    ticking.current = true;
    requestAnimationFrame(() => {
      const currentScrollPos = window.scrollY;

      setScrolled(currentScrollPos > 10);

      const isScrolledDown = prevScrollPos.current < currentScrollPos;
      const isScrollingUp = prevScrollPos.current > currentScrollPos;
      const isAtTop = currentScrollPos < 10;

      if (isScrolledDown && !isAtTop && Math.abs(currentScrollPos - prevScrollPos.current) > 5) {
        setMobileVisible(false);
      } else if (isScrollingUp || isAtTop) {
        setMobileVisible(true);
      }

      prevScrollPos.current = currentScrollPos;
      ticking.current = false;
    });
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

  const value = useMemo(
    () => ({ scrolled, mobileVisible }),
    [scrolled, mobileVisible],
  );

  return <NavbarScrollContext.Provider value={value}>{children}</NavbarScrollContext.Provider>;
}

export function useNavbarScroll() {
  const context = useContext(NavbarScrollContext);

  if (!context) {
    throw new Error('useNavbarScroll must be used within NavbarScrollProvider');
  }

  return context;
}
