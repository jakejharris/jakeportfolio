"use client";

import ThemeToggle from './ThemeToggle';
import AccentPicker from './AccentPicker';
import TransitionLink from './TransitionLink';

interface DesktopNavbarProps {
  scrolled: boolean;
  visible: boolean;
}

export default function DesktopNavbar({ scrolled, visible }: DesktopNavbarProps) {
  return (
    <nav
      aria-label="Main navigation"
      className={`navbar-sticky sticky top-0 z-40 w-full bg-secondary transition-all duration-300
        ${scrolled ? 'scrolled' : ''}
        ${visible ? '' : 'translate-y-[-100%]'}`}
    >
      <div className="max-w-2xl mx-auto px-4 h-32 flex justify-between items-center">
        <div className="flex-1">
          <TransitionLink href="/#" scroll={true} className="animated-underline normal-case text-xl font-bold">Jake Harris</TransitionLink>
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
              <TransitionLink href="/about#" scroll={true} className="px-3 py-2">
                <span className="animated-underline font-semibold">About</span>
              </TransitionLink>
            </li>
            <li className="flex items-center justify-center">
              <TransitionLink href="/contact#" scroll={true} className="px-3 py-2">
                <span className="animated-underline font-semibold">Contact</span>
              </TransitionLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
} 