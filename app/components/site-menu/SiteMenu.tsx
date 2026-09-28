"use client";

// The mobile menu is the sea. Opening it floods the page from the button, one
// lattice cell at a time behind a band of checkerboard foam, and the pages
// you can go to stand in the water as dry land. Tap one and the water opens
// from that word onto the next page; the X or Escape drains it back into the
// button. Reduced motion opens and closes it at once, over still water.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { FaGithub } from "react-icons/fa";
import TransitionLink from "../TransitionLink";
import { disturbWater } from "../pixel-fluid/disturb";
import type { FluidColors } from "../pixel-fluid/engine";
import { getActiveNav, NAVBAR_DESKTOP_MEDIA_QUERY } from "../../lib/navbar";
import { MenuTide } from "./MenuTide";
import { fluidColors, useMenuSea } from "./useMenuSea";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

// How long a tapped link may take to arrive before the water opens anyway.
const LEAVE_WAIT_MS = 1500;

function center(element: Element | null) {
  if (!element) return { x: window.innerWidth - 32, y: 32 };
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function trimSlash(path: string) {
  return path === "/" ? path : path.replace(/\/+$/, "");
}

// Without a stepped clip-path there is no tide to show; the menu simply
// appears, as it does for readers who ask for less motion.
function instant() {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !CSS.supports("clip-path", "path('M0 0')")
  );
}

export function useSiteMenu() {
  const pathname = usePathname();
  // Where the menu is headed, and whether any of it is on screen.
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  // The link a reader tapped, marked while the next page loads.
  const [going, setGoing] = useState<string | null>(null);
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const seaRef = useRef<HTMLCanvasElement>(null);
  const foamRef = useRef<HTMLCanvasElement>(null);
  const tideRef = useRef<MenuTide | null>(null);
  const leaveRef = useRef<{ x: number; y: number; href: string; timer: number } | null>(null);
  // A page the reader tapped and then overruled with the button. Its arrival
  // must not undo the last thing they asked for.
  const overruledRef = useRef<string | null>(null);

  const rest = useCallback((level: number) => {
    if (level === 0) {
      setShown(false);
      setGoing(null);
    }
  }, []);

  const tide = useCallback(() => {
    if (!tideRef.current && rootRef.current && foamRef.current) {
      tideRef.current = new MenuTide(rootRef.current, foamRef.current, rest);
    }
    return tideRef.current;
  }, [rest]);

  const cancelLeave = useCallback(() => {
    if (leaveRef.current) window.clearTimeout(leaveRef.current.timer);
    leaveRef.current = null;
  }, []);

  const openMenu = useCallback(() => {
    const current = tide();
    if (!current) return;
    cancelLeave();
    setShown(true);
    setOpen(true);
    current.setColors(fluidColors());
    const { x, y } = center(buttonRef.current);
    current.go(1, x, y, false, instant());
  }, [tide, cancelLeave]);

  const closeMenu = useCallback((focusButton: boolean) => {
    const current = tideRef.current;
    if (!current) return;
    cancelLeave();
    setOpen(false);
    const origin = center(buttonRef.current);
    current.go(0, origin.x, origin.y, false, instant());
    // The water drains back into the page's own.
    disturbWater(origin);
    if (focusButton) buttonRef.current?.focus({ preventScroll: true });
  }, [cancelLeave]);

  const leaveFrom = useCallback((x: number, y: number) => {
    const current = tideRef.current;
    if (!current) return;
    cancelLeave();
    setOpen(false);
    current.go(0, x, y, true, instant());
  }, [cancelLeave]);

  const toggle = useCallback(() => {
    if (leaveRef.current) overruledRef.current = leaveRef.current.href;
    if (tideRef.current?.target === 1) closeMenu(false);
    else openMenu();
  }, [openMenu, closeMenu]);

  // A tapped link keeps the menu up until its page has arrived, then the
  // water opens from the tap onto it.
  const leaveThrough = useCallback((href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const word = event.currentTarget.querySelector("[data-menu-island]") ?? event.currentTarget;
    const rect = word.getBoundingClientRect();
    // Keyboard activation reports no pointer position.
    const x = event.detail === 0 ? rect.left + rect.width / 2 : event.clientX;
    const y = event.detail === 0 ? rect.top + rect.height / 2 : event.clientY;
    setGoing(href);
    if (trimSlash(href) === trimSlash(window.location.pathname)) {
      leaveFrom(x, y);
      return;
    }
    cancelLeave();
    overruledRef.current = null;
    leaveRef.current = {
      x,
      y,
      href: trimSlash(href),
      timer: window.setTimeout(() => leaveFrom(x, y), LEAVE_WAIT_MS),
    };
  }, [leaveFrom, cancelLeave]);

  useEffect(() => {
    const leave = leaveRef.current;
    const overruled = overruledRef.current === trimSlash(pathname);
    overruledRef.current = null;
    if (leave) leaveFrom(leave.x, leave.y);
    // Back, forward or the home mark while the menu is up.
    else if (!overruled && tideRef.current?.target === 1) closeMenu(false);
    // Only a new page matters here, not new callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // While any of the menu shows, the page behind it neither scrolls nor
  // takes focus, assistive tech skips it, and its own water rests.
  useLayoutEffect(() => {
    if (!shown) return;
    const root = document.documentElement;
    const menu = rootRef.current;
    const button = buttonRef.current;
    const page = Array.from(document.querySelectorAll<HTMLElement>("main, [data-site-footer]"));
    root.setAttribute("data-menu-open", "");
    page.forEach((element) => element.setAttribute("inert", ""));
    return () => {
      root.removeAttribute("data-menu-open");
      page.forEach((element) => element.removeAttribute("inert"));
      // Focus left with the menu: hand it back to the button.
      const active = document.activeElement;
      if (!active || active === document.body || menu?.contains(active)) {
        button?.focus({ preventScroll: true });
      }
    };
  }, [shown]);

  useLayoutEffect(() => {
    if (open) rootRef.current?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
  }, [open]);

  // Very large text can outgrow the screen; only then may the words scroll.
  useLayoutEffect(() => {
    const nav = rootRef.current?.querySelector<HTMLElement>(".site-menu-nav");
    if (!shown || !nav) return;
    const fit = () => nav.toggleAttribute("data-scrolls", nav.scrollHeight > nav.clientHeight + 1);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [shown]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      // The dock folds its palette on Escape first.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      closeMenu(true);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, closeMenu]);

  // Wide enough for the desktop navbar: the menu has nothing to do.
  useEffect(() => {
    const desktop = window.matchMedia(NAVBAR_DESKTOP_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      const current = tideRef.current;
      if (!event.matches || !current || (current.target === 0 && current.level === 0)) return;
      cancelLeave();
      setOpen(false);
      current.go(0, 0, 0, false, true);
    };
    desktop.addEventListener("change", handleChange);
    return () => desktop.removeEventListener("change", handleChange);
  }, [cancelLeave]);

  useEffect(() => () => {
    cancelLeave();
    tideRef.current?.stop();
  }, [cancelLeave]);

  const setSeaColors = useCallback((colors: FluidColors) => tideRef.current?.setColors(colors), []);
  useMenuSea(seaRef, rootRef, shown, setSeaColors);

  return { id, open, shown, going, pathname, buttonRef, rootRef, seaRef, foamRef, toggle, leaveThrough };
}

export type SiteMenuState = ReturnType<typeof useSiteMenu>;

export default function SiteMenu({ menu }: { menu: SiteMenuState }) {
  const active = getActiveNav(menu.pathname);
  const current = [active.isHome, active.isAbout, active.isContact];
  const year = new Date().getFullYear();

  return (
    <div ref={menu.rootRef} id={menu.id} className="site-menu" hidden={!menu.shown}>
      <canvas ref={menu.seaRef} className="site-menu-sea" aria-hidden="true" />
      <div className="site-menu-finish" aria-hidden="true" />
      <nav aria-label="Menu" className="site-menu-nav">
        <ul className="site-menu-links">
          {LINKS.map(({ href, label }, index) => {
            const here = menu.going ? menu.going === href : current[index];
            return (
              <li key={href}>
                <TransitionLink
                  href={href}
                  scroll={true}
                  aria-current={current[index] ? "page" : undefined}
                  className="site-menu-link"
                  data-here={here || undefined}
                  onClickCapture={menu.leaveThrough(href)}
                >
                  <span data-menu-island>{label}</span>
                  <span className="site-menu-here" aria-hidden="true" />
                </TransitionLink>
              </li>
            );
          })}
        </ul>
        <p className="site-menu-colophon">
          <span data-menu-island>© {year} Jake Harris</span>
          <a
            href="https://github.com/jakejharris/jakeportfolio"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub"
          >
            <FaGithub aria-hidden="true" />
            <span data-menu-island>Source</span>
          </a>
        </p>
      </nav>
      <canvas ref={menu.foamRef} className="site-menu-foam" aria-hidden="true" />
    </div>
  );
}
