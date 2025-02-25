"use client";

import * as React from "react"
import { MdDarkMode, MdLightMode } from 'react-icons/md';
import { useTheme } from "next-themes"
import { Button } from "./ui/button"
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only showing the toggle when component is mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Use CSS to handle the initial state rather than conditionally rendering
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="w-[50px] h-[50px] p-0 relative"
      aria-label={mounted ? (theme === 'dark' ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
    >
      {/* Pre-render both icons but control visibility with CSS */}
      <span 
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200
          ${(!mounted || theme !== 'dark') ? 'opacity-0' : 'opacity-100'}`}
      >
        <MdLightMode size={24} />
      </span>
      <span 
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200
          ${(!mounted || theme === 'dark') ? 'opacity-0' : 'opacity-100'}`}
      >
        <MdDarkMode size={24} />
      </span>
      
      {/* Fallback icon shape that's visible during SSR/hydration */}
      <span className={`absolute inset-0 flex items-center justify-center ${mounted ? 'opacity-0' : 'opacity-100'}`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
    </Button>
  )
} 