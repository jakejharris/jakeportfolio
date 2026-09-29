"use client";

// How moving between pages feels. A tap on a link answers at once: the page's
// water starts to run out from under the finger, the navbar points at the
// destination and, if the next page takes a moment, the page dims. When it
// arrives its water comes in from the same point, its content settles in
// quickly and focus lands on its heading. Back and forward return to the
// exact place the reader left, with the content already there.

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  NAV_ARRIVE_EVENT,
  NAV_DEPART_EVENT,
  setPendingPath,
  trimPath,
  type ArrivalKind,
  type NavArrival,
  type NavDeparture,
} from "./navigation-events";
import { ScrollMemory, scrollKey } from "./scroll-memory";
import "../../css/navigation.css";

// A page that has not arrived by then is not coming; undo the departure.
const GIVE_UP_MS = 10000;
// A press this recent explains a page change that no link click announced.
const PRESS_WINDOW_MS = 3000;
// How long a restored position keeps being reapplied while the page grows.
const RESTORE_MS = 700;
// Each history entry Next writes carries this key, so two visits to the same
// address keep separate places.
const ENTRY_KEY = "__scroll";

interface Departure extends NavDeparture {
  link: HTMLAnchorElement;
}

function sessionStore() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// The wrapper around the page's own content (see the site layout).
function pageFrame() {
  return document.querySelector<HTMLElement>("[data-page-frame]");
}

// Where the reader is: the current history entry's own key, or its address
// for entries the browser made by itself (a jump to an anchor).
function entryKey() {
  const stamped = (window.history.state as Record<string, unknown> | null)?.[ENTRY_KEY];
  return typeof stamped === "string" ? stamped : scrollKey(window.location) + window.location.hash;
}

// Give the current entry a key of its own. Only entries Next already owns
// (with its __NA marker): Next reloads the page on a popstate to any other
// entry that has a state.
function stampEntry() {
  const state = window.history.state as Record<string, unknown> | null;
  if (!state || !state.__NA || typeof state[ENTRY_KEY] === "string") return;
  try {
    const key = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    window.history.replaceState({ ...state, [ENTRY_KEY]: key }, "");
  } catch {}
}

function focusHeading() {
  const main = document.querySelector("main");
  const target = main?.querySelector<HTMLElement>("h1") ?? main;
  if (!target || target.closest("[inert]")) return;
  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
    target.setAttribute("data-nav-focus", "");
  }
  target.focus({ preventScroll: true });
}

export default function NavigationFlow() {
  const pathname = usePathname();
  const ref = useRef({
    path: null as string | null,
    restoring: false,
    departure: null as Departure | null,
    press: null as { x: number; y: number; at: number } | null,
    // The history entry a back or forward is returning to.
    restoreKey: "",
    // Per page, the link a reader left it through, to hand focus back on return.
    leftThrough: new Map<string, string>(),
    memory: null as ScrollMemory | null,
    giveUp: 0,
    restoreFrame: 0,
    moved: false,
  });

  useEffect(() => {
    const state = ref.current;
    const root = document.documentElement;
    const memory = new ScrollMemory(sessionStore());
    state.memory = memory;
    history.scrollRestoration = "manual";
    stampEntry();
    // The page opened here has a place too, even if the reader never
    // scrolls it: back from an anchor jump returns to it.
    memory.save(entryKey(), window.scrollY);

    const clearPending = () => {
      window.clearTimeout(state.giveUp);
      pageFrame()?.removeAttribute("data-leaving");
      setPendingPath(null);
    };

    // The page being left stays after all (it never came, or the reader
    // chose the current page instead): undim it and let its water come back,
    // from (x, y) or from where it left.
    const stay = (x?: number, y?: number) => {
      const departure = state.departure;
      state.departure = null;
      clearPending();
      if (!departure) return;
      const detail: NavArrival = {
        kind: "push",
        pathname: window.location.pathname,
        x: x ?? departure.x,
        y: y ?? departure.y,
        covered: root.hasAttribute("data-menu-open"),
      };
      window.dispatchEvent(new CustomEvent(NAV_ARRIVE_EVENT, { detail }));
    };
    const giveUp = () => stay();

    let scrollFrame = 0;
    const handleScroll = () => {
      // Between a back or forward and its page arriving, the address already
      // names the page being returned to while the old one is still showing.
      if (state.restoring) return;
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        if (!state.restoring) memory.save(entryKey(), window.scrollY);
      });
    };

    const handlePopState = () => {
      state.restoreKey = entryKey();
      // A change of hash alone keeps the page: put its place back now.
      if (trimPath(window.location.pathname) === state.path) {
        // Back can cancel a pending route while staying on this document.
        // There will be no pathname effect to undo its departure.
        state.restoring = false;
        stay();
        const y = memory.get(state.restoreKey);
        if (y !== undefined) window.scrollTo(0, y);
        return;
      }
      state.restoring = true;
      state.departure = null;
      clearPending();
    };

    const handlePress = (event: PointerEvent) => {
      state.press = { x: event.clientX, y: event.clientY, at: performance.now() };
      state.moved = true;
    };
    const handleInput = () => {
      state.moved = true;
    };

    // Bubble phase on window: by now Next's Link has claimed the click (and
    // prevented the browser's own navigation) if it is a client navigation.
    const handleClick = (event: MouseEvent) => {
      if (!event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>("a[href]");
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const to = trimPath(url.pathname);
      const here = entryKey();
      if (to === trimPath(window.location.pathname)) {
        // The current page again: Next drops any navigation still loading.
        if (state.departure) {
          const rect = link.getBoundingClientRect();
          stay(event.detail === 0 ? rect.left + rect.width / 2 : event.clientX, event.detail === 0 ? rect.top + rect.height / 2 : event.clientY);
        }
        return;
      }
      const rect = link.getBoundingClientRect();
      // Keyboard activation reports no pointer position.
      const x = event.detail === 0 ? rect.left + rect.width / 2 : event.clientX;
      const y = event.detail === 0 ? rect.top + rect.height / 2 : event.clientY;
      state.departure = { x, y, to, link };
      state.leftThrough.set(here, link.getAttribute("href") ?? "");
      memory.save(here, window.scrollY);
      pageFrame()?.setAttribute("data-leaving", "");
      setPendingPath(to);
      window.clearTimeout(state.giveUp);
      state.giveUp = window.setTimeout(giveUp, GIVE_UP_MS);
      const detail: NavDeparture = { x, y, to };
      window.dispatchEvent(new CustomEvent(NAV_DEPART_EVENT, { detail }));
    };

    // Reloads and pages restored from the back-forward cache use the
    // browser's own restoration; only in-app history is handled here.
    const handlePageHide = () => {
      memory.save(scrollKey(window.location), window.scrollY);
      memory.persist();
      history.scrollRestoration = "auto";
    };
    const handlePageShow = () => {
      history.scrollRestoration = "manual";
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pointerdown", handlePress, { capture: true, passive: true });
    window.addEventListener("wheel", handleInput, { capture: true, passive: true });
    window.addEventListener("touchstart", handleInput, { capture: true, passive: true });
    window.addEventListener("keydown", handleInput, { capture: true });
    window.addEventListener("click", handleClick);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      cancelAnimationFrame(scrollFrame);
      cancelAnimationFrame(state.restoreFrame);
      root.style.overflowAnchor = "";
      clearPending();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pointerdown", handlePress, { capture: true });
      window.removeEventListener("wheel", handleInput, { capture: true });
      window.removeEventListener("touchstart", handleInput, { capture: true });
      window.removeEventListener("keydown", handleInput, { capture: true });
      window.removeEventListener("click", handleClick);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      history.scrollRestoration = "auto";
    };
  }, []);

  // The next page is in the DOM and not yet painted.
  useLayoutEffect(() => {
    const state = ref.current;
    const path = trimPath(pathname);
    const initial = state.path === null;
    if (state.path === path) return;
    state.path = path;
    if (initial) return;
    const root = document.documentElement;
    const kind: ArrivalKind = state.restoring ? "restore" : "push";
    state.restoring = false;
    const departure = state.departure && state.departure.to === path ? state.departure : null;
    state.departure = null;
    const press = state.press && performance.now() - state.press.at < PRESS_WINDOW_MS ? state.press : null;
    const origin = kind === "restore" ? null : departure ?? press;
    window.clearTimeout(state.giveUp);
    pageFrame()?.removeAttribute("data-leaving");
    setPendingPath(null);
    root.setAttribute("data-arrival", kind);
    const covered = root.hasAttribute("data-menu-open");
    // A pushed page is a new history entry; give it its own key.
    if (kind === "push") stampEntry();
    const key = kind === "restore" && state.restoreKey ? state.restoreKey : entryKey();

    if (kind === "restore") {
      const target = state.memory?.get(key) ?? 0;
      // A page can still be growing (images, content that mounts a moment
      // later); keep the position until the page settles or the reader
      // moves. Scroll anchoring would follow late content above the fold
      // and leave the reader lower than they were, so it waits too.
      state.moved = false;
      const started = performance.now();
      root.style.overflowAnchor = "none";
      const apply = () => {
        if (!state.moved && Math.abs(window.scrollY - target) > 1) window.scrollTo(0, target);
        if (!state.moved && performance.now() - started < RESTORE_MS) {
          state.restoreFrame = requestAnimationFrame(apply);
        } else {
          root.style.overflowAnchor = "";
        }
      };
      cancelAnimationFrame(state.restoreFrame);
      apply();
    }

    // Where this entry starts (the top, or the restored place), before any
    // scroll event has had the chance to say so.
    if (kind === "push") state.memory?.save(key, window.scrollY);

    const detail: NavArrival = { kind, pathname, x: origin?.x, y: origin?.y, covered };
    window.dispatchEvent(new CustomEvent(NAV_ARRIVE_EVENT, { detail }));

    // Focus: a new page starts at its heading; a page returned to hands focus
    // back to the link the reader left it through. Never take focus from
    // somewhere the reader has put it since.
    const active = document.activeElement;
    const adrift = !active || active === document.body || !active.isConnected;
    if (kind === "push") {
      const fromLink = departure && (active === departure.link || !departure.link.isConnected);
      if (adrift || fromLink) focusHeading();
    } else if (adrift) {
      // The link may be in the page or in the navbar; a hidden copy (the
      // closed mobile menu) does not count.
      const href = state.leftThrough.get(key);
      const link = href
        ? Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).find(
            (candidate) =>
              candidate.getAttribute("href") === href &&
              candidate.getClientRects().length > 0 &&
              !candidate.closest("[inert]")
          )
        : null;
      if (link) link.focus({ preventScroll: true });
      else focusHeading();
    }
  }, [pathname]);

  return null;
}
