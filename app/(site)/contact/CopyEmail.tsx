"use client";

import { useEffect, useId, useRef, useState } from "react";

// The address is the button. Copying it selects it the way a text selection
// looks, in the accent color, swept across in pixel steps; if the browser
// refuses the clipboard, the address is left really selected instead.

const HOLD_MS = 1800;

type CopyState = "idle" | "copied" | "selected";

export default function CopyEmail({ address }: { address: string }) {
  const hintId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const selectionRef = useRef<HTMLSpanElement>(null);
  const clickRef = useRef(0);
  const timerRef = useRef(0);
  const [state, setState] = useState<CopyState>("idle");

  useEffect(
    () => () => {
      clickRef.current += 1;
      window.clearTimeout(timerRef.current);
    },
    []
  );

  const copy = async () => {
    const click = ++clickRef.current;
    window.clearTimeout(timerRef.current);
    const reset = () => {
      if (click !== clickRef.current) return;
      buttonRef.current?.removeAttribute("data-copied");
      setState("idle");
    };

    try {
      await navigator.clipboard.writeText(address);
    } catch {
      if (click !== clickRef.current) return;
      if (textRef.current) window.getSelection()?.selectAllChildren(textRef.current);
      setState("selected");
      timerRef.current = window.setTimeout(reset, HOLD_MS * 2);
      return;
    }
    if (click !== clickRef.current) return;

    const button = buttonRef.current;
    if (button) {
      // Replay the sweep on every click, even mid-sweep.
      button.removeAttribute("data-copied");
      void button.offsetWidth;
      button.setAttribute("data-copied", "");
    }
    setState("copied");
    // The note lasts as long as the sweep; reduced motion has none, so it
    // gets a timer instead.
    const sweep = selectionRef.current
      ?.getAnimations()
      .find((animation) => (animation as CSSAnimation).animationName === "contact-select");
    if (sweep) sweep.finished.then(reset, () => {});
    else timerRef.current = window.setTimeout(reset, HOLD_MS);
  };

  return (
    <div className="contact-address-block">
      <button
        ref={buttonRef}
        type="button"
        className="contact-address"
        onClick={copy}
        aria-describedby={hintId}
        data-fluid-island
      >
        <span ref={textRef} className="contact-address-text">
          {address}
        </span>
        <span ref={selectionRef} className="contact-address-selection" aria-hidden="true">
          {address}
        </span>
      </button>
      <p className="contact-address-actions" data-state={state}>
        <span id={hintId} className="contact-address-hint" aria-live="polite">
          {state === "copied" ? (
            "Copied to your clipboard"
          ) : state === "selected" ? (
            "Your browser blocked copying, so it’s selected instead"
          ) : (
            <>
              <span className="contact-hint-pointer">Click to copy</span>
              <span className="contact-hint-touch">Tap to copy</span>
            </>
          )}
        </span>
        <span className="contact-address-or" aria-hidden="true">·</span>
        <a href={`mailto:${address}`}>Open in your mail app</a>
      </p>
    </div>
  );
}
