"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FaGithub } from 'react-icons/fa';
import ThemeToggle from './ThemeToggle';
import AccentPicker from './AccentPicker';
import { Button } from './ui/button';
import TransitionLink from './TransitionLink';
import HamburgerIcon from './HamburgerIcon';
import JHMark from './JHMark';
import { getActiveNav, NAVBAR_DESKTOP_MEDIA_QUERY } from '../lib/navbar';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";

interface MobileNavbarProps {
  scrolled: boolean;
  visible: boolean;
}

export default function MobileNavbar({ scrolled, visible }: MobileNavbarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { isHome, isAbout, isContact } = getActiveNav(usePathname());

  useEffect(() => {
    const desktopQuery = window.matchMedia(NAVBAR_DESKTOP_MEDIA_QUERY);
    const handleBreakpointChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsDrawerOpen(false);
    };

    desktopQuery.addEventListener('change', handleBreakpointChange);
    return () => desktopQuery.removeEventListener('change', handleBreakpointChange);
  }, []);

  return (
    <nav
      className={`navbar-sticky sticky top-0 z-40 w-full bg-secondary transition-all duration-300 md:hidden
        ${scrolled ? 'scrolled' : ''}
        ${visible ? '' : 'translate-y-[-100%]'}`}
    >
      <div className="px-4 h-16 flex justify-between items-center">
        {/* flex wrapper: an inline-flex link would ride the parent line box's
            baseline, whose descender space pushes the mark ~3px above center */}
        <div className="flex-1 flex items-center">
          <TransitionLink
            href="/"
            scroll={true}
            aria-label="Jake Harris — home"
            aria-current={isHome ? 'page' : undefined}
            className={`animated-underline inline-flex items-center py-1 ${isHome ? 'nav-active' : ''}`}
          >
            <JHMark className="h-5" />
          </TransitionLink>
        </div>
        <div className="flex items-center gap-2">
          <AccentPicker />
          <ThemeToggle />
          <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={isDrawerOpen ? 'Close menu' : 'Open menu'}
                className="relative flex items-center justify-center"
              >
                <HamburgerIcon isOpen={isDrawerOpen} />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="h-[65vh]">
              <DrawerHeader className="hidden">
                <DrawerTitle>Jake Harris Navbar</DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col items-center gap-2 p-6">
                <TransitionLink
                  href="/"
                  scroll={true}
                  aria-current={isHome ? 'page' : undefined}
                  onClickCapture={() => setIsDrawerOpen(false)}
                  className="border border-border w-full text-center text-xl py-3 px-6 rounded-md transition-all duration-150 hover:bg-accent active:scale-95 active:bg-accent/80"
                >
                  <span className={`animated-underline ${isHome ? 'nav-active' : ''}`}>Home</span>
                </TransitionLink>
                <TransitionLink
                  href="/about"
                  scroll={true}
                  aria-current={isAbout ? 'page' : undefined}
                  onClickCapture={() => setIsDrawerOpen(false)}
                  className="border border-border w-full text-center text-xl py-3 px-6 rounded-md transition-all duration-150 hover:bg-accent active:scale-95 active:bg-accent/80"
                >
                  <span className={`animated-underline ${isAbout ? 'nav-active' : ''}`}>About</span>
                </TransitionLink>
                <TransitionLink
                  href="/contact"
                  scroll={true}
                  aria-current={isContact ? 'page' : undefined}
                  onClickCapture={() => setIsDrawerOpen(false)}
                  className="border border-border w-full text-center text-xl py-3 px-6 rounded-md transition-all duration-150 hover:bg-accent active:scale-95 active:bg-accent/80"
                >
                  <span className={`animated-underline ${isContact ? 'nav-active' : ''}`}>Contact</span>
                </TransitionLink>
              </div>
              <DrawerFooter className="mt-auto pt-4">
                <div className="flex flex-col items-center text-center gap-2 pb-2">
                  <p className="text-sm text-muted-foreground">
                    © {new Date().getFullYear()} Jake Harris
                  </p>
                  <a
                    href="https://github.com/jakejharris/jakeportfolio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-4 items-center gap-2 text-sm text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                  >
                    <FaGithub className="w-4 h-4" /> View Source
                  </a>
                </div>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </nav>
  );
}
