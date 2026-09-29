"use client";

import { useEffect } from "react";

const GLASS = ".pageLinkContainer";

/**
 * Light for the glass post links (app/css/page.css). A press blooms from
 * where the finger or pointer came down, and on a desktop the glass follows
 * the pointer across it. It only places the light; how strongly it shows is
 * the glass's own state (hover, press), so nothing here animates.
 */
export default function GlassLight() {
  useEffect(() => {
    let card: HTMLElement | null = null;
    let frame = 0;
    let x = 0;
    let y = 0;

    const place = (target: HTMLElement, clientX: number, clientY: number) => {
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--glass-x", `${Math.round(clientX - rect.left)}px`);
      target.style.setProperty("--glass-y", `${Math.round(clientY - rect.top)}px`);
    };
    const glassAt = (event: PointerEvent) =>
      event.target instanceof Element ? event.target.closest<HTMLElement>(GLASS) : null;

    const handlePointerDown = (event: PointerEvent) => {
      const target = glassAt(event);
      if (target) place(target, event.clientX, event.clientY);
    };

    // A mouse moves the light with it, once a frame at most.
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      card = glassAt(event);
      if (!card) return;
      x = event.clientX;
      y = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (card) place(card, x, y);
      });
    };

    document.addEventListener("pointerdown", handlePointerDown, { capture: true, passive: true });
    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      document.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return null;
}
