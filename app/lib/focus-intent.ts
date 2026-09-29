// Focus moved by script shows a ring only when the reader is using a keyboard.
// Browsers guess from the focus that came before, and after a tap on iOS there
// is none (Safari does not focus a tapped button or link), so they guess
// "keyboard" and draw a ring around a word the reader never tabbed to.

let keyboard = false;

if (typeof window !== "undefined") {
  window.addEventListener("keydown", () => { keyboard = true; }, true);
  window.addEventListener("pointerdown", () => { keyboard = false; }, true);
}

export function focusQuietly(element: HTMLElement | null | undefined) {
  if (!element) return;
  if (!keyboard) {
    // Browsers that ignore `focusVisible` still draw their ring; this mark
    // hides it (navigation.css) until focus moves on.
    element.setAttribute("data-quiet-focus", "");
    element.addEventListener("blur", () => element.removeAttribute("data-quiet-focus"), { once: true });
  }
  // `focusVisible` is newer than TypeScript's DOM types.
  element.focus({ preventScroll: true, focusVisible: keyboard } as FocusOptions);
  if (document.activeElement !== element) element.removeAttribute("data-quiet-focus");
}
