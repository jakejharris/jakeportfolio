"use client";

import { useEffect, useRef, useState } from "react";

// The menu button, drawn on the same 9 x 9 pixel grid as the appearance
// dock's sun and moon. Opening steps the three bars through two frames into
// an X; closing steps back. A tap mid-way turns around from the frame it is on.
const FRAMES = [
  [
    ".........",
    "#########",
    ".........",
    ".........",
    "#########",
    ".........",
    ".........",
    "#########",
    ".........",
  ],
  [
    ".........",
    ".........",
    "#########",
    ".........",
    ".#######.",
    ".........",
    "#########",
    ".........",
    ".........",
  ],
  [
    ".........",
    ".........",
    "##.....##",
    "..##.##..",
    "....#....",
    "..##.##..",
    "##.....##",
    ".........",
    ".........",
  ],
  [
    "#.......#",
    ".#.....#.",
    "..#...#..",
    "...#.#...",
    "....#....",
    "...#.#...",
    "..#...#..",
    ".#.....#.",
    "#.......#",
  ],
];
const LAST = FRAMES.length - 1;
const FRAME_MS = 45;

export default function MenuIcon({ open }: { open: boolean }) {
  const [frame, setFrame] = useState(open ? LAST : 0);
  const frameRef = useRef(frame);

  useEffect(() => {
    const target = open ? LAST : 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0;
    const settle = () => {
      window.clearTimeout(timer);
      frameRef.current = target;
      setFrame(target);
    };
    if (motion.matches) {
      settle();
      return;
    }
    const step = () => {
      if (frameRef.current === target) return;
      frameRef.current += Math.sign(target - frameRef.current);
      setFrame(frameRef.current);
      timer = window.setTimeout(step, FRAME_MS);
    };
    step();
    const handleMotion = () => { if (motion.matches) settle(); };
    motion.addEventListener("change", handleMotion);
    return () => {
      window.clearTimeout(timer);
      motion.removeEventListener("change", handleMotion);
    };
  }, [open]);

  return (
    <svg
      className="site-menu-icon"
      viewBox="0 0 9 9"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {FRAMES[frame].flatMap((row, y) =>
        [...row].map((pixel, x) =>
          pixel === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null
        )
      )}
    </svg>
  );
}
