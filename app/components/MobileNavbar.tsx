"use client";

import { usePathname } from 'next/navigation';
import TransitionLink from './TransitionLink';
import JHMark from './JHMark';
import MenuIcon from './site-menu/MenuIcon';
import SiteMenu, { useSiteMenu } from './site-menu/SiteMenu';
import { getActiveNav } from '../lib/navbar';
import { usePendingPath } from './navigation/navigation-events';

interface MobileNavbarProps {
  scrolled: boolean;
  visible: boolean;
}

export default function MobileNavbar({ scrolled, visible }: MobileNavbarProps) {
  const pathname = usePathname();
  const { isHome } = getActiveNav(pathname);
  const shown = getActiveNav(usePendingPath() ?? pathname);
  const menu = useSiteMenu();

  return (
    <>
      <nav
        className={`navbar-sticky sticky top-0 z-40 w-full bg-secondary transition-all duration-300 md:hidden
          ${scrolled ? 'scrolled' : ''}
          ${visible || menu.shown ? '' : 'translate-y-[-100%]'}`}
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
              className={`animated-underline inline-flex items-center py-1 ${shown.isHome ? 'nav-active' : ''}`}
            >
              <JHMark className="h-5" />
            </TransitionLink>
          </div>
          <button
            ref={menu.buttonRef}
            type="button"
            aria-label="Menu"
            aria-expanded={menu.open}
            aria-controls={menu.id}
            className="site-menu-button"
            onClick={menu.toggle}
          >
            <MenuIcon open={menu.open} />
          </button>
        </div>
      </nav>
      <SiteMenu menu={menu} />
    </>
  );
}
