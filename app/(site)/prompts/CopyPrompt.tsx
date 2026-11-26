"use client";

import { useEffect, useRef, useState } from "react";

// Copies one prompt exactly as written. The label says "Copied" for a moment;
// if the browser refuses the clipboard, the prompt is left selected instead,
// ready for the reader to copy by hand.

const HOLD_MS = 1800;

type CopyState = "idle" | "copied" | "selected";

export default function CopyPrompt({ text, title, textId }: { text: string; title: string; textId: string }) {
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
      if (click === clickRef.current) setState("idle");
    };

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      if (click !== clickRef.current) return;
      const node = document.getElementById(textId);
      if (node) window.getSelection()?.selectAllChildren(node);
      setState("selected");
      timerRef.current = window.setTimeout(reset, HOLD_MS * 2);
      return;
    }
    if (click !== clickRef.current) return;
    setState("copied");
    timerRef.current = window.setTimeout(reset, HOLD_MS);
  };

  return (
    <>
      <button type="button" className="prompt-copy" onClick={copy} data-state={state}>
        <span className="prompt-copy-mark" aria-hidden="true" />
        {state === "copied" ? "Copied" : state === "selected" ? "Selected" : "Copy"}
        <span className="sr-only"> {title}</span>
      </button>
      <span className="sr-only" aria-live="polite">
        {state === "copied"
          ? "Copied to your clipboard"
          : state === "selected"
            ? "Your browser blocked copying, so the prompt is selected instead"
            : ""}
      </span>
    </>
  );
}
