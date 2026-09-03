"use client"

import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

import { cn } from "@/app/lib/utils"

/**
 * Radix Collapsible with three additions:
 *
 * - The content stays mounted while closed. Height animates through
 *   grid-template-rows, so nothing is measured and nothing jumps when it opens.
 * - Closed content is marked hidden="until-found", so find-in-page and a deep
 *   link to an id inside it open the fold instead of finding nothing. Browsers
 *   without until-found treat it as plain hidden, which is the same closed state.
 * - prefers-reduced-motion drops the transition and the content hides at once.
 *
 * Trigger and Root are the Radix parts, so aria-expanded, aria-controls, keyboard
 * handling and data-state come for free.
 */

interface OpenState {
  open: boolean
  setOpen: (open: boolean) => void
}

const OpenContext = React.createContext<OpenState | null>(null)

const Collapsible = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root>
>(({ open: openProp, defaultOpen = false, onOpenChange, ...props }, ref) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange]
  )
  const state = React.useMemo(() => ({ open, setOpen }), [open, setOpen])

  return (
    <OpenContext.Provider value={state}>
      <CollapsiblePrimitive.Root ref={ref} open={open} onOpenChange={setOpen} {...props} />
    </OpenContext.Provider>
  )
})
Collapsible.displayName = "Collapsible"

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

/** How long the close transition is given before the content is hidden regardless. */
const CLOSE_FALLBACK_MS = 400

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Content>,
  Omit<React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>, "forceMount">
>(({ className, children, ...props }, ref) => {
  const state = React.useContext(OpenContext)
  const open = state?.open ?? true
  const gridRef = React.useRef<HTMLDivElement>(null)
  const innerRef = React.useRef<HTMLDivElement>(null)
  // Lags `open` on close so the content is still rendered while it shrinks.
  const [shown, setShown] = React.useState(open)

  React.useLayoutEffect(() => {
    if (open) setShown(true)
  }, [open])

  React.useEffect(() => {
    if (open) return
    const grid = gridRef.current
    if (!grid || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(false)
      return
    }
    const hide = () => setShown(false)
    const onEnd = (event: TransitionEvent) => {
      if (event.target === grid) hide()
    }
    grid.addEventListener("transitionend", onEnd)
    const timer = window.setTimeout(hide, CLOSE_FALLBACK_MS)
    return () => {
      grid.removeEventListener("transitionend", onEnd)
      window.clearTimeout(timer)
    }
  }, [open])

  // React 18 renders `hidden` as a boolean attribute, so the keyword is set by hand.
  React.useLayoutEffect(() => {
    const inner = innerRef.current
    if (!inner) return
    if (shown) inner.removeAttribute("hidden")
    else inner.setAttribute("hidden", "until-found")
  }, [shown])

  // Find-in-page landing inside closed content opens it.
  React.useEffect(() => {
    const inner = innerRef.current
    if (!inner || !state) return
    const onMatch = () => state.setOpen(true)
    inner.addEventListener("beforematch", onMatch)
    return () => inner.removeEventListener("beforematch", onMatch)
  }, [state])

  // A deep link to an id inside closed content opens it, then scrolls to the target.
  React.useEffect(() => {
    if (!state) return
    const follow = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (!id) return
      const target = document.getElementById(id)
      if (!target || !innerRef.current?.contains(target)) return
      state.setOpen(true)
      window.requestAnimationFrame(() => target.scrollIntoView({ block: "start" }))
    }
    follow()
    window.addEventListener("hashchange", follow)
    return () => window.removeEventListener("hashchange", follow)
  }, [state])

  return (
    <CollapsiblePrimitive.Content ref={ref} forceMount className="group/collapsible" {...props}>
      <div
        ref={gridRef}
        className={cn(
          "grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out",
          "motion-reduce:transition-none group-data-[state=open]/collapsible:grid-rows-[1fr]"
        )}
      >
        <div ref={innerRef} className={cn("min-h-0 overflow-hidden", className)}>
          {children}
        </div>
      </div>
    </CollapsiblePrimitive.Content>
  )
})
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
