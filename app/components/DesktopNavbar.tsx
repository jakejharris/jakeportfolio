"use client";

import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import AccentPicker from './AccentPicker';
import TransitionLink from './TransitionLink';
import JHMark from './JHMark';

interface DesktopNavbarProps {
  scrolled: boolean;
}

function normalizePathname(pathname: string) {
  return pathname === '/' ? pathname : pathname.replace(/\/+$/, '');
}

export default function DesktopNavbar({ scrolled }: DesktopNavbarProps) {
  const pathname = normalizePathname(usePathname());
  const isHome = pathname === '/';
  const isAbout = pathname === '/about';
  const isContact = pathname === '/contact';

  return (
    <nav
      className={`navbar-sticky sticky top-0 z-40 hidden w-full bg-secondary transition-all duration-300 md:block
        ${scrolled ? 'scrolled' : ''}`}
    >
      <div className="max-w-2xl mx-auto px-4 h-16 flex justify-between items-center">
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
        <div className="flex-none">
          <ul className="flex gap-2 items-center">
            <li className="aspect-square w-[50px] h-[50px] flex items-center justify-center">
              <AccentPicker />
            </li>
            <li className="aspect-square w-[50px] h-[50px] flex items-center justify-center">
              <ThemeToggle />
            </li>
            <li className="flex items-center justify-center">
              <TransitionLink
                href="/about"
                scroll={true}
                aria-current={isAbout ? 'page' : undefined}
                className="px-3 py-2"
              >
                <span className={`animated-underline font-semibold ${isAbout ? 'nav-active' : ''}`}>About</span>
              </TransitionLink>
            </li>
            <li className="flex items-center justify-center">
              <TransitionLink
                href="/contact"
                scroll={true}
                aria-current={isContact ? 'page' : undefined}
                className="px-3 py-2"
              >
                <span className={`animated-underline font-semibold ${isContact ? 'nav-active' : ''}`}>Contact</span>
              </TransitionLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
