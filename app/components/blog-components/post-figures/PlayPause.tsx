'use client';

import type { MouseEvent } from 'react';

/**
 * The small Play/Pause button every moving figure shares: the clip's player
 * and the charts' motion toggle. The visible word is Play or Pause; the label
 * names what it stops ("Pause Clip", "Pause Animation").
 */
export default function PlayPause({
  playing,
  name,
  onClick,
}: {
  playing: boolean;
  name: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button type="button" className="pf-toggle" onClick={onClick} aria-label={`${playing ? 'Pause' : 'Play'} ${name}`}>
      <span className={playing ? 'pf-toggle-icon is-pause' : 'pf-toggle-icon is-play'} aria-hidden="true" />
      <span className="pf-toggle-label">{playing ? 'Pause' : 'Play'}</span>
    </button>
  );
}
