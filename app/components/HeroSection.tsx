"use client";

import TransitionLink from "./TransitionLink";
import ScrambleText from "./ScrambleText";

export default function HeroSection() {
  return (
    <section className="mb-12">
      <div className="heroContainer">
        {/* Main headline - bold and memorable */}
        <h1 className="hero-headline hero-animate-in hero-delay-1 mb-2">
          Crafting Digital <ScrambleText />
        </h1>

        {/* Subtitle - what Jake actually does */}
        <p className="hero-subtitle hero-animate-in hero-delay-2 mb-6 max-w-xl">
          I build products that think. Full stack engineer specializing in AI-powered web applications.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 hero-animate-in hero-delay-3">
          <TransitionLink href="/about" className="hero-cta-primary">
            View My Work
          </TransitionLink>
          <TransitionLink href="/contact" className="hero-cta-secondary">
            Get in Touch
          </TransitionLink>
        </div>
      </div>
    </section>
  );
}
