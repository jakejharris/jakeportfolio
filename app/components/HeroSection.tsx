"use client";

import { useState, useEffect } from "react";
import TransitionLink from "./TransitionLink";

// Words to cycle through in the typewriter effect
const TYPEWRITER_WORDS = ["apps", "websites", "solutions", "experiences"];
const TYPING_SPEED = 100;
const DELETING_SPEED = 60;
const PAUSE_DURATION = 2000;

function TypewriterText() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = TYPEWRITER_WORDS[currentWordIndex];

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          // Typing
          if (displayText.length < currentWord.length) {
            setDisplayText(currentWord.slice(0, displayText.length + 1));
          } else {
            // Finished typing, pause then start deleting
            setTimeout(() => setIsDeleting(true), PAUSE_DURATION);
          }
        } else {
          // Deleting
          if (displayText.length > 0) {
            setDisplayText(displayText.slice(0, -1));
          } else {
            // Finished deleting, move to next word
            setIsDeleting(false);
            setCurrentWordIndex((prev) => (prev + 1) % TYPEWRITER_WORDS.length);
          }
        }
      },
      isDeleting ? DELETING_SPEED : TYPING_SPEED
    );

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentWordIndex]);

  return (
    <span className="typewriter-container">
      <span className="typewriter-text">{displayText}</span>
      <span className="typewriter-cursor" aria-hidden="true" />
    </span>
  );
}

export default function HeroSection() {
  return (
    <section className="mb-12">
      <div className="heroContainer">
        {/* Main headline - bold and memorable */}
        <h1 className="hero-headline hero-animate-in hero-delay-1 mb-2">
          Crafting Digital{" "}
          <TypewriterText />
        </h1>

        {/* Subtitle - what Jake actually does */}
        <p className="hero-subtitle hero-animate-in hero-delay-2 mb-6 max-w-xl">
          Full stack developer specializing in AI-powered web applications,
          bringing ideas from concept to production with modern technologies.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 hero-animate-in hero-delay-3">
          <TransitionLink href="/about" className="hero-cta-primary">
            Explore My Work
          </TransitionLink>
          <TransitionLink href="/contact" className="hero-cta-secondary">
            Get in Touch
          </TransitionLink>
        </div>
      </div>
    </section>
  );
}
