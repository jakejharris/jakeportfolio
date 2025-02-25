"use client";

import { useEffect } from 'react';

// Define a type for the Window with MSStream property
interface WindowWithMSStream extends Window {
  MSStream?: unknown;
}

export default function OverscrollFix() {
  useEffect(() => {
    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as WindowWithMSStream).MSStream;
    
    if (isIOS) {
      // Add a class to the body for iOS-specific styling
      document.body.classList.add('ios-device');
      
      // Handle document touchstart
      const handleTouchStart = (e: TouchEvent) => {
        // Store the initial touch position
        const startY = e.touches[0].clientY;
        
        // Handle document touchmove
        const handleTouchMove = (e: TouchEvent) => {
          // Get current scroll position
          const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
          const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
          const clientHeight = document.documentElement.clientHeight;
          
          // Calculate direction and check boundaries
          const touchY = e.touches[0].clientY;
          const isScrollingUp = touchY > startY;
          const isScrollingDown = touchY < startY;
          const isAtTop = scrollTop <= 0;
          const isAtBottom = scrollTop + clientHeight >= scrollHeight;
          
          // Only prevent default if we're at the boundaries and trying to scroll beyond them
          if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
            // Check if we're not interacting with a scrollable element inside the page
            let isScrollableElement = false;
            let target = e.target as HTMLElement | null;
            
            // Check if the target or any of its parents is a scrollable element
            while (target && target !== document.body) {
              const { overflowY } = window.getComputedStyle(target);
              if (overflowY === 'auto' || overflowY === 'scroll') {
                const canScrollUp = target.scrollTop > 0;
                const canScrollDown = target.scrollTop + target.clientHeight < target.scrollHeight;
                
                if ((isScrollingUp && canScrollUp) || (isScrollingDown && canScrollDown)) {
                  isScrollableElement = true;
                  break;
                }
              }
              target = target.parentElement;
            }
            
            // Only prevent default if we're not in a scrollable element
            if (!isScrollableElement) {
              e.preventDefault();
            }
          }
        };
        
        // Add touchmove listener for this touch sequence
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        
        // Remove the touchmove listener when the touch ends
        const cleanup = () => {
          document.removeEventListener('touchmove', handleTouchMove);
          document.removeEventListener('touchend', cleanup);
          document.removeEventListener('touchcancel', cleanup);
        };
        
        document.addEventListener('touchend', cleanup, { once: true });
        document.addEventListener('touchcancel', cleanup, { once: true });
      };
      
      // Add touchstart listener
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      
      // Cleanup function
      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.body.classList.remove('ios-device');
      };
    }
    
    // No cleanup needed if not iOS
    return () => {};
  }, []);
  
  // This component doesn't render anything
  return null;
} 