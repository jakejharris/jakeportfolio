"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

// Register GSAP plugin
gsap.registerPlugin(ScrambleTextPlugin);

const words = ["apps", "websites", "solutions", "experiences"];
const scrambleChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function ScrambleText() {
  const textRef = useRef<HTMLSpanElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useGSAP(
    () => {
      if (prefersReducedMotion || !textRef.current) return;

      let currentIndex = 0;
      const tl = gsap.timeline({ repeat: -1 });

      const animateToNextWord = () => {
        const nextIndex = (currentIndex + 1) % words.length;
        const nextWord = words[nextIndex];

        // Scramble out (0.8s) then decode to next word (0.6s)
        tl.to(textRef.current, {
          duration: 0.8,
          scrambleText: {
            text: nextWord,
            chars: scrambleChars,
            revealDelay: 0.5,
            speed: 0.3,
          },
        })
          .to(textRef.current, {
            duration: 0.6,
            scrambleText: {
              text: nextWord,
              chars: scrambleChars,
              revealDelay: 0,
              speed: 1,
            },
          })
          // Pause for 2 seconds before next word
          .to({}, { duration: 2 });

        currentIndex = nextIndex;
      };

      // Initial pause then start cycling
      tl.to({}, { duration: 2 });

      // Add animations for each word transition
      words.forEach(() => {
        animateToNextWord();
      });

      return () => {
        tl.kill();
      };
    },
    { dependencies: [prefersReducedMotion] }
  );

  // Show static text if reduced motion is preferred
  if (prefersReducedMotion) {
    return (
      <span className="typewriter-container">
        <span className="typewriter-text">apps</span>
      </span>
    );
  }

  return (
    <span className="typewriter-container">
      <span ref={textRef} className="typewriter-text">
        apps
      </span>
    </span>
  );
}
