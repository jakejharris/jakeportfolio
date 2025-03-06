"use client";

import { useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import ThemeToggle from './ThemeToggle';
import { Button } from './ui/button';
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
import LinkTop from './LinkTop';
interface MobileNavbarProps {
  scrolled: boolean;
  visible: boolean;
}

export default function MobileNavbar({ scrolled, visible }: MobileNavbarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <nav
      className={`navbar-sticky sticky top-0 z-40 w-full bg-secondary transition-all duration-300
        ${scrolled ? 'scrolled' : ''}
        ${visible ? '' : 'translate-y-[-100%]'}`}
    >
      <div className="px-4 h-16 flex justify-between items-center">
        <div className="flex-1">
          <LinkTop href="/#" scroll={true} className="animated-underline normal-case text-lg md:text-xl font-bold">Jake Harris</LinkTop>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Drawer onOpenChange={setIsDrawerOpen}>
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
                  <LinkTop
                    href="/#"
                    scroll={true}
                    className="border border-border w-full text-center text-xl py-3 px-6 rounded-md transition-all duration-150 hover:bg-accent active:scale-95 active:bg-accent/80"
                  >
                    Home
                  </LinkTop>
                </DrawerClose>
                <DrawerClose asChild>
                  <LinkTop
                    href="/about#"
                    scroll={true}
                    className="border border-border w-full text-center text-xl py-3 px-6 rounded-md transition-all duration-150 hover:bg-accent active:scale-95 active:bg-accent/80"
                  >
                    About
                  </LinkTop>
                </DrawerClose>
                <DrawerClose asChild>
                  <LinkTop
                    href="/contact#"
                    scroll={true}
                    className="border border-border w-full text-center text-xl py-3 px-6 rounded-md transition-all duration-150 hover:bg-accent active:scale-95 active:bg-accent/80"
                  >
                    Contact
                  </LinkTop>
                </DrawerClose>
              </div>
              <DrawerFooter className="mt-auto pt-4">
                <div className="flex flex-col items-center text-center gap-2 pb-2">
                  <p className="text-sm text-muted-foreground">
                    © {new Date().getFullYear()} Jake Harris
                  </p>
                  <LinkTop
                    href="https://github.com/jakejh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-4 items-center gap-2 text-sm text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                  >
                    <FaGithub className="w-4 h-4" /> View Source
                  </LinkTop>
                </div>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </nav>
  );
} 