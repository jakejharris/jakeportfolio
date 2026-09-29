"use client"

import * as React from "react"
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "../lib/utils"

const HoverCard = HoverCardPrimitive.Root

// Radix cancels touchstart to suppress touch previews, but React's touchstart
// listener is passive. Keep the native link gesture and Radix's pointer/focus
// handlers; Slot also preserves handlers supplied by the link itself.
const NativeTouchTrigger = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof Slot> & {
    onNativeTouchStart?: React.TouchEventHandler<HTMLAnchorElement>
  }
>(({ onNativeTouchStart, ...props }, ref) => {
  delete props.onTouchStart
  return <Slot {...props} ref={ref} onTouchStart={onNativeTouchStart} />
})
NativeTouchTrigger.displayName = "NativeTouchTrigger"

const HoverCardTrigger = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Trigger>
>(({ asChild, children, onTouchStart, ...props }, ref) => (
  <HoverCardPrimitive.Trigger {...props} ref={ref} asChild>
    <NativeTouchTrigger onNativeTouchStart={onTouchStart}>
      {asChild ? children : <a>{children}</a>}
    </NativeTouchTrigger>
  </HoverCardPrimitive.Trigger>
))
HoverCardTrigger.displayName = HoverCardPrimitive.Trigger.displayName

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "start", sideOffset = 4, ...props }, ref) => (
  <HoverCardPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 w-64 rounded-[10px] border border-foreground/10 bg-popover/75 p-4 text-popover-foreground outline-none backdrop-blur-xl backdrop-saturate-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName

export { HoverCard, HoverCardTrigger, HoverCardContent }
