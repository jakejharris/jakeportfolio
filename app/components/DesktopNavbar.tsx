"use client";

import ThemeToggle from './ThemeToggle';
import Link from 'next/link';

interface DesktopNavbarProps {
  scrolled: boolean;
  visible: boolean;
}

export default function DesktopNavbar({ scrolled, visible }: DesktopNavbarProps) {
  return (
    <nav
      className={`navbar-sticky sticky top-0 z-40 w-full bg-secondary transition-all duration-300
        ${scrolled ? 'scrolled' : ''}
        ${visible ? '' : 'translate-y-[-100%]'}`}
    >
      <div className="max-w-3xl mx-auto px-4 h-32 flex justify-between items-center">
        <div className="flex-1">
          <Link href="/" scroll={false} className="animated-underline normal-case text-xl font-bold">Jake Harris</Link>
        </div>
        <div className="flex-none">
          <ul className="flex gap-2 items-center">
            {/* <li className="aspect-square w-[50px] h-[50px] flex items-center justify-center">
              <Button asChild variant="ghost" size="icon" className="w-[50px] h-[50px] p-0">
                <a href="https://www.linkedin.com/in/jakejh/" target="_blank" rel="noopener noreferrer">
                  <FaLinkedin className="w-6 h-6" />
                </a>
              </Button>
            </li> */}
            <li className="aspect-square w-[50px] h-[50px] flex items-center justify-center">
              <ThemeToggle />
            </li>
            <li className="flex items-center justify-center">
              <Link href="/about" scroll={false} className="px-3 py-2">
                <span className="animated-underline font-semibold">About</span>
              </Link>
            </li>
            <li className="flex items-center justify-center">
              <Link href="/contact" scroll={false} className="px-3 py-2">
                <span className="animated-underline font-semibold">Contact</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
} 