"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { IoColorPaletteOutline } from "react-icons/io5";
import { Button } from "./ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";

const STORAGE_KEY = "accent-index";

const COLORS = [
  { name: "Default", light: "0 0% 9%", dark: "0 0% 98%" },
  { name: "Red", light: "0 72% 50%", dark: "0 60% 65%" },
  { name: "Blue", light: "217 80% 50%", dark: "217 70% 65%" },
  { name: "Green", light: "160 65% 40%", dark: "160 50% 55%" },
  { name: "Amber", light: "35 90% 48%", dark: "35 70% 60%" },
];

export default function AccentPicker() {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState(0);
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const idx = parseInt(stored, 10);
      if (idx >= 0 && idx <= 4) setSelected(idx);
    }
  }, []);

  const selectColor = (index: number) => {
    setSelected(index);
    if (index === 0) {
      document.documentElement.removeAttribute("data-accent");
    } else {
      document.documentElement.setAttribute("data-accent", String(index));
    }
    localStorage.setItem(STORAGE_KEY, String(index));
  };

  const getSwatchColor = (index: number) => {
    const color = COLORS[index];
    return theme === "dark" ? color.dark : color.light;
  };

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="w-[50px] h-[50px] p-0"
        aria-label="Customize accent color"
        disabled
      >
        <IoColorPaletteOutline size={22} />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-[50px] h-[50px] p-0"
          aria-label="Customize accent color"
        >
          <IoColorPaletteOutline size={22} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="end" sideOffset={8}>
        <div className="flex gap-2">
          {COLORS.map((color, i) => (
            <button
              key={i}
              onClick={() => selectColor(i)}
              className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110
                ${selected === i ? "border-foreground" : "border-transparent"}`}
              style={{ backgroundColor: `hsl(${getSwatchColor(i)})` }}
              aria-label={color.name}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
