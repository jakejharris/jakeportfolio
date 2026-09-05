"use client";

import DesktopNavbar from './DesktopNavbar';
import MobileNavbar from './MobileNavbar';
import { useNavbarScroll } from './NavbarScrollContext';
import '../css/navbar.css';
import '../css/animations.css';
import '../css/magical-button.css';

export default function Navbar() {
  const { scrolled, mobileVisible } = useNavbarScroll();

  return (
    <>
      <DesktopNavbar scrolled={scrolled} />
      <MobileNavbar scrolled={scrolled} visible={mobileVisible} />
    </>
  );
}
