'use client';

import React from 'react';
import type { RaceData } from './decode-race-data';
import type { RacePalette, RaceSketch } from './decode-race-sketch';
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
 * The decode race in the browser. p5 and the sketch load only when the figure nears the viewport,
 * draw only while it is on screen, and hold one still frame under reduced motion. It renders nothing
 * on the server, so the page without script is unchanged. Its data and marked copy arrive as props,
 * so the release file stays out of the browser bundle.
 */
export default function DecodeRaceClient({ race, labels, captions, note }: {
  race: RaceData;
  /** Each start's button label and figure caption by start key, marked as placeholders where needed. */
  labels: Record<string, React.ReactNode>;
  captions: Record<string, React.ReactNode>;
  /** The caption while no start is measured. */
  note: React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [startKey, setStartKey] = React.useState(race.initial?.key ?? '');
  const [state, setState] = React.useState<RaceState>('idle');
  const [failed, setFailed] = React.useState(false);
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
        setState(race.measured.length ? 'playing' : 'placeholder');
      } else {
        sketch.pause();
        setState('paused');
      }
    };

    // The sketch comes with p5, so neither is in the page's first load.
    const load = () => Promise.all([import('p5'), import('./decode-race-sketch')])
      .then(([{ default: P5 }, { createDecodeRace }]) => {
        if (cancelled) return;
        P5.disableFriendlyErrors = true;
        sketch = createDecodeRace(P5, host, { data: race, startKey: startRef.current, palette: readPalette(figure) });
        sketchRef.current = sketch;
        apply();
      })
      // Without p5 there is nothing to draw, so the figure goes; the chart and table carry the numbers.
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

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
  }, [mounted, race]);

  React.useEffect(() => {
    startRef.current = startKey;
    sketchRef.current?.show(startKey);
  }, [startKey]);

  if (!mounted || failed || !race.initial) return null;
  const shown = race.starts.find(entry => entry.key === startKey) ?? race.initial;
  const placeholder = !race.measured.length;

  return <figure id="decode-race" ref={figureRef} className="glm-race" data-race-state={state} data-race-start={shown.key} aria-labelledby="decode-race-title">
    <div className="glm-race-head">
      <p id="decode-race-title" className="glm-label">Decode race · {race.unit}, all streams combined</p>
      {race.measured.length > 1
        ? <div className="glm-race-chips" role="group" aria-label="Serving start shown">
          {race.measured.map(entry => <button type="button" key={entry.key} data-race-chip={entry.key} aria-pressed={entry.key === shown.key} onClick={() => setStartKey(entry.key)}>
            {labels[entry.key]}
          </button>)}
        </div>
        : null}
    </div>
    <div className="glm-race-canvas" ref={hostRef} aria-hidden="true" />
    <figcaption>
      {placeholder
        ? note
        : <><span className="glm-race-start">{captions[shown.key]}</span>
          <span>An illustration, not live telemetry. Each lane grows at its measured low end for the same few seconds, one strand per stream. The lighter tail is the range across sweeps.</span></>}
    </figcaption>
  </figure>;
}
