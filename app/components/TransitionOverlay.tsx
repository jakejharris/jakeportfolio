"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTransition } from "./TransitionProvider";

interface Particle {
  id: number;
  fillX: number;
  fillY: number;
  size: number;
  offsetX: number;
  offsetY: number;
  angle: number;
  distance: number;
  delay: number;
  // Loading drift
  driftX: number;
  driftY: number;
  loadingDelay: number;
  // Subtle color variations
  hueShift: number;
  brightness: number;
}

function generateParticles(
  count: number,
  clickX: number,
  clickY: number,
  viewportWidth: number,
  viewportHeight: number
): Particle[] {
  const particles: Particle[] = [];

  const isDesktop = viewportWidth >= 768;
  const minSize = isDesktop ? 100 : 70;
  const sizeRange = isDesktop ? 180 : 100;

  for (let i = 0; i < count; i++) {
    const fillX = Math.random() * 100;
    const fillY = Math.random() * 100;

    const fillPxX = (fillX / 100) * viewportWidth;
    const fillPxY = (fillY / 100) * viewportHeight;
    const offsetX = clickX - fillPxX;
    const offsetY = clickY - fillPxY;

    // Random drift direction for loading animation
    const driftAngle = Math.random() * Math.PI * 2;
    const driftDistance = 2 + Math.random() * 4; // Gentle 2-6px drift

    particles.push({
      id: i,
      fillX,
      fillY,
      size: minSize + Math.random() * sizeRange,
      offsetX,
      offsetY,
      angle: Math.random() * 360,
      distance: 120 + Math.random() * 200,
      delay: Math.random() * 50,
      // Loading drift
      driftX: Math.cos(driftAngle) * driftDistance,
      driftY: Math.sin(driftAngle) * driftDistance,
      loadingDelay: Math.random() * 1000, // Stagger the breathing
      // Subtle variations: ±15deg hue, 85-115% brightness
      hueShift: (Math.random() - 0.5) * 30,
      brightness: 0.85 + Math.random() * 0.3,
    });
  }
  return particles;
}

type Phase = "idle" | "entering" | "covering" | "dispersing";

export default function TransitionOverlay() {
  const pathname = usePathname();
  const { origin, clearOrigin } = useTransition();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");

  // Refs to track state across async boundaries
  const initialPathRef = useRef<string>("");
  const currentPathnameRef = useRef(pathname);

  const cleanup = useCallback(() => {
    setParticles([]);
    setPhase("idle");
    clearOrigin();
  }, [clearOrigin]);

  // Keep pathname ref updated & check for navigation completion
  useEffect(() => {
    currentPathnameRef.current = pathname;

    // If covering and navigation completed, disperse
    if (phase === "covering" && pathname !== initialPathRef.current) {
      setPhase("dispersing");
    }
  }, [pathname, phase]);

  // Handle click (origin change)
  useEffect(() => {
    if (!origin) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    initialPathRef.current = currentPathnameRef.current;
    const isSamePage = origin.destination === currentPathnameRef.current;

    setParticles(generateParticles(120, origin.x, origin.y, vw, vh));
    setPhase("entering");

    // After enter animation completes (~200ms + 50ms delay buffer)
    const enterTimer = setTimeout(() => {
      // Same-page navigation: disperse immediately (minimum animation)
      if (isSamePage) {
        setPhase("dispersing");
        return;
      }

      // Check if navigation already happened via ref
      if (currentPathnameRef.current !== initialPathRef.current) {
        setPhase("dispersing");
      } else {
        setPhase("covering");
      }
    }, 250);

    return () => clearTimeout(enterTimer);
  }, [origin]);

  // Failsafe: if covering for too long, disperse anyway
  useEffect(() => {
    if (phase !== "covering") return;

    const failsafeTimer = setTimeout(() => {
      setPhase("dispersing");
    }, 3000);

    return () => clearTimeout(failsafeTimer);
  }, [phase]);

  // Cleanup after disperse animation
  useEffect(() => {
    if (phase !== "dispersing") return;

    const disperseTimer = setTimeout(() => {
      cleanup();
    }, 350); // 300ms animation + buffer

    return () => clearTimeout(disperseTimer);
  }, [phase, cleanup]);

  if (phase === "idle" || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {particles.map((particle) => {
        const radians = (particle.angle * Math.PI) / 180;
        const disperseX = Math.cos(radians) * particle.distance;
        const disperseY = Math.sin(radians) * particle.distance;

        const animationClass =
          phase === "entering" ? "animate-particle-enter" :
          phase === "covering" ? "animate-particle-loading" :
          "animate-particle-disperse";

        return (
          <div
            key={particle.id}
            className={`absolute rounded-full ${animationClass}`}
            style={{
              left: `${particle.fillX}%`,
              top: `${particle.fillY}%`,
              width: particle.size,
              height: particle.size,
              backgroundColor: "var(--accent-color)",
              filter: `hue-rotate(${particle.hueShift}deg) brightness(${particle.brightness})`,
              "--offsetX": `${particle.offsetX}px`,
              "--offsetY": `${particle.offsetY}px`,
              "--driftX": `${particle.driftX}px`,
              "--driftY": `${particle.driftY}px`,
              "--loadingDelay": `${particle.loadingDelay}ms`,
              "--disperseX": `${disperseX}px`,
              "--disperseY": `${disperseY}px`,
              "--delay": `${particle.delay}ms`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}
