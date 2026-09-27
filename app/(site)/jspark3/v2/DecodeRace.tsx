'use client';

import React from 'react';
import RACE from './decode-race-data';
import { createDecodeRace, type RacePalette, type RaceSketch } from './decode-race-sketch';
import { Marked, Ph } from '../Placeholder';
import './decode-race.css';

type RaceState = 'idle' | 'playing' | 'paused' | 'static' | 'placeholder';

/** Custom properties in decode-race.css, one per palette entry. */
const PALETTE: Record<keyof RacePalette, string> = {
  bg: '--race-bg',
  track: '--race-track',
  muted: '--race-muted',
  text: '--race-text',
  gold: '--race-gold',
  band: '--race-band',
  link: '--race-link',
  pulse: '--race-pulse',
  token: '--race-token',
  chassis: '--race-chassis',
  vent: '--race-vent',
  placeholder: '--race-placeholder',
  mono: '--font-geist-mono',
};

function readPalette(el: HTMLElement): RacePalette {
  const style = getComputedStyle(el);
  const entries = Object.entries(PALETTE).map(([key, name]) => [key, style.getPropertyValue(name).trim()]);
  const palette = Object.fromEntries(entries) as RacePalette;
  palette.mono = `${palette.mono ? `${palette.mono}, ` : ''}ui-monospace, monospace`;
  return palette;
}

/**
 * The decode race: each decode row of a serving start grows at its measured rate for the same few
 * seconds, one strand per concurrent stream, and stops where the page's bar stops. p5 loads only when
 * the figure nears the viewport, draws only while it is on screen, and holds one still frame under
 * reduced motion. The server renders nothing here, so the page without script is unchanged.
 */
export default function DecodeRace() {
  const [mounted, setMounted] = React.useState(false);
  const [startKey, setStartKey] = React.useState(RACE.initial?.key ?? '');
  const [state, setState] = React.useState<RaceState>('idle');
  const figureRef = React.useRef<HTMLElement>(null);
  const hostRef = React.useRef<HTMLDivElement>(null);
  const sketchRef = React.useRef<RaceSketch | null>(null);
  const startRef = React.useRef(startKey);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    const figure = figureRef.current;
    const host = hostRef.current;
    if (!mounted || !figure || !host) return;
    let cancelled = false;
    let sketch: RaceSketch | null = null;
    let onScreen = typeof IntersectionObserver === 'undefined';
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const apply = () => {
      if (!sketch) return;
      if (motion.matches) {
        sketch.still();
        setState('static');
      } else if (onScreen && !document.hidden) {
        sketch.play();
        setState(RACE.measured.length ? 'playing' : 'placeholder');
      } else {
        sketch.pause();
        setState('paused');
      }
    };

    const load = async () => {
      const { default: P5 } = await import('p5');
      if (cancelled) return;
      P5.disableFriendlyErrors = true;
      sketch = createDecodeRace(P5, host, { data: RACE, startKey: startRef.current, palette: readPalette(figure) });
      sketchRef.current = sketch;
      apply();
    };

    const observers: IntersectionObserver[] = [];
    if (onScreen) {
      load();
    } else {
      // Load p5 when the figure comes within 200px of the viewport, once.
      const near = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        near.disconnect();
        load();
      }, { rootMargin: '200px 0px' });
      // Draw only while the figure is on screen.
      const seen = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting === onScreen) return;
        onScreen = entry.isIntersecting;
        apply();
      });
      near.observe(figure);
      seen.observe(figure);
      observers.push(near, seen);
    }

    const resize = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => sketch?.resize(), 150);
    });
    resize.observe(host);
    document.addEventListener('visibilitychange', apply);
    motion.addEventListener('change', apply);

    return () => {
      cancelled = true;
      clearTimeout(resizeTimer);
      observers.forEach(observer => observer.disconnect());
      resize.disconnect();
      document.removeEventListener('visibilitychange', apply);
      motion.removeEventListener('change', apply);
      sketch?.remove();
      sketchRef.current = null;
    };
  }, [mounted]);

  React.useEffect(() => {
    startRef.current = startKey;
    sketchRef.current?.show(startKey);
  }, [startKey]);

  if (!mounted || !RACE.initial) return null;
  const shown = RACE.starts.find(entry => entry.key === startKey) ?? RACE.initial;
  const placeholder = !RACE.measured.length;

  return <figure id="decode-race" ref={figureRef} className="glm-race" data-race-state={state} data-race-start={shown.key} aria-labelledby="decode-race-title">
    <div className="glm-race-head">
      <p id="decode-race-title" className="glm-label">Decode race · {RACE.unit}, all streams combined</p>
      {RACE.measured.length > 1
        ? <div className="glm-race-chips" role="group" aria-label="Serving start shown">
          {RACE.measured.map(entry => <button type="button" key={entry.key} data-race-chip={entry.key} aria-pressed={entry.key === shown.key} onClick={() => setStartKey(entry.key)}>
            <Marked text={entry.label} />
          </button>)}
        </div>
        : null}
    </div>
    <div className="glm-race-canvas" ref={hostRef} aria-hidden="true" />
    <figcaption>
      {placeholder
        ? <Ph>Placeholder lanes, no data yet</Ph>
        : <><span className="glm-race-start"><Marked text={`${shown.caption} · ${shown.label}`} /></span>
          <span>An illustration, not live telemetry. Each lane grows at its measured low end for the same few seconds, one strand per stream. The lighter tail is the range across sweeps.</span></>}
    </figcaption>
  </figure>;
}
