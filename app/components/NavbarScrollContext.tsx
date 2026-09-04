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
  // The browser scrolls on its own when it restores a position on reload or
  // history traversal. That fires a scroll event with no gesture behind it,
  // which must not read as the reader scrolling down. Hide only after input.
  const userInput = useRef(false);

  const handleScroll = useCallback(() => {
    if (ticking.current) return;

    ticking.current = true;
    requestAnimationFrame(() => {
      const currentScrollPos = window.scrollY;

      setScrolled(currentScrollPos > 10);

      const isScrolledDown = prevScrollPos.current < currentScrollPos;
      const isScrollingUp = prevScrollPos.current > currentScrollPos;
      const isAtTop = currentScrollPos < 10;

      if (
        userInput.current &&
        isScrolledDown &&
        !isAtTop &&
        Math.abs(currentScrollPos - prevScrollPos.current) > 5
      ) {
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
    const markUserInput = () => {
      userInput.current = true;
    };
    const inputEvents = ['pointerdown', 'touchstart', 'wheel', 'keydown'] as const;

    // A restore that already happened before hydration must not count as a
    // scroll-down on the reader's first real gesture.
    prevScrollPos.current = window.scrollY;

    window.addEventListener('scroll', handleScroll, { passive: true });
    inputEvents.forEach((name) => {
      window.addEventListener(name, markUserInput, { passive: true, capture: true });
    });
    desktopQuery.addEventListener('change', handleBreakpointChange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      inputEvents.forEach((name) => {
        window.removeEventListener(name, markUserInput, { capture: true });
      });
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
