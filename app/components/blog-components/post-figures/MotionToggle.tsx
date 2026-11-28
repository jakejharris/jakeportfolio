'use client';

import { useEffect, useState, type MouseEvent } from 'react';

import PlayPause from './PlayPause';

/**
 * The Play/Pause button of a moving chart, in the row its frame reserves on
 * the server, so nothing moves when it arrives. Pause stops the figure's loop
 * and shows its settled picture (`data-pf-paused` on the figure, see
 * post-figures.css); Play starts the loop again from its resting first frame.
 * A reader's pause holds while the page is open, in view or not.
 */
export default function MotionToggle() {
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const next = !paused;
    event.currentTarget.closest('[data-pf-motion]')?.toggleAttribute('data-pf-paused', next);
    setPaused(next);
  };
  return <PlayPause playing={!paused} name="Animation" onClick={toggle} />;
}
