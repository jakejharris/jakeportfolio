"use client";

import { useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import ThemeToggle from './ThemeToggle';
import { Button } from './ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HamburgerIcon from './HamburgerIcon';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";

// Define window type with our custom property
interface CustomWindow extends Window {
  _lastScrollToTopTime?: number;
}

interface MobileNavbarProps {
  scrolled: boolean;
  visible: boolean;
}

export default function MobileNavbar({ scrolled, visible }: MobileNavbarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const router = useRouter();

  // Helper function to handle navigation and ensure scrolling to top
  const handleNavigation = (path: string) => {
    // Close the drawer
    setIsDrawerOpen(false);
    
    // Update the global timestamp (for coordination with OverscrollFix)
    (window as CustomWindow)._lastScrollToTopTime = Date.now();
    
    // Navigate to the path
    router.push(path);
    
    // Force scroll to top (backup for ScrollToTop component)
    setTimeout(() => {
      (window as CustomWindow)._lastScrollToTopTime = Date.now();
      window.scrollTo({
        top: 0,
        behavior: "instant"
      });
    }, 50);
  };

  return (
    <nav
      className={`navbar-sticky sticky top-0 z-40 w-full bg-secondary transition-all duration-300
        ${scrolled ? 'scrolled' : ''}
        ${visible ? '' : 'translate-y-[-100%]'}`}
    >
      <div className="px-4 h-16 flex justify-between items-center">
        <div className="flex-1">
          <Link href="/" className="animated-underline normal-case text-lg md:text-xl font-bold">Jake Harris</Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon" className="relative flex items-center justify-center">
                <HamburgerIcon isOpen={isDrawerOpen} />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="h-[65vh]">
              <DrawerHeader className="hidden">
                <DrawerTitle>Jake Harris Navbar</DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col items-center gap-2 p-6">
                <DrawerClose asChild>
                  <button
                    onClick={() => handleNavigation("/")}
                    className="border border-border w-full text-center text-xl py-3 px-6 rounded-md transition-all duration-150 hover:bg-accent active:scale-95 active:bg-accent/80"
                  >
                    Home
                  </button>
                </DrawerClose>
                <DrawerClose asChild>
                  <button
                    onClick={() => handleNavigation("/about")}
                    className="border border-border w-full text-center text-xl py-3 px-6 rounded-md transition-all duration-150 hover:bg-accent active:scale-95 active:bg-accent/80"
                  >
                    About
                  </button>
                </DrawerClose>
                <DrawerClose asChild>
                  <button
                    onClick={() => handleNavigation("/contact")}
                    className="border border-border w-full text-center text-xl py-3 px-6 rounded-md transition-all duration-150 hover:bg-accent active:scale-95 active:bg-accent/80"
                  >
                    Contact
                  </button>
                </DrawerClose>
              </div>
              <DrawerFooter className="mt-auto pt-4">
                <div className="flex flex-col items-center text-center gap-2 pb-2">
                  <p className="text-sm text-muted-foreground">
                    © {new Date().getFullYear()} Jake Harris
                  </p>
                  <a 
                    href="https://github.com/jakejh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-4 items-center gap-2 text-sm text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                  >
                    <FaGithub className="w-4 h-4" /> View Source
                  </a>
                </div>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </nav>
  );
} 