'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The clip and its play/pause control. Server rendered with native controls
 * and no autoplay, so without JavaScript the poster shows and the reader can
 * play it. MotionGate plays the clip muted while its figure is in view and
 * the tab is visible, pauses it otherwise, and leaves it alone under reduced
 * motion (`data-pf-autoplay`). This script only swaps the native controls for
 * a small Play/Pause button. A reader's pause also takes the clip off the
 * gate's autoplay, so it stays paused until they press Play.
 */
export default function VideoLoopPlayer({
  sources,
  poster,
  width,
  height,
  alt,
  fallbackHref,
}: {
  sources: Array<{ src: string; type: string }>;
  poster?: string;
  width: number;
  height: number;
  alt: string;
  fallbackHref?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const sync = () => setPlaying(!video.paused);
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    sync();
    setReady(true);
    return () => {
      video.removeEventListener('play', sync);
      video.removeEventListener('pause', sync);
    };
  }, []);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    video.toggleAttribute('data-pf-autoplay', video.paused);
    if (video.paused) {
      video.muted = true;
      video.play().catch(() => setPlaying(!video.paused));
    } else video.pause();
  };

  return (
    <>
      {/* The box reserves the clip's shape before anything loads. */}
      <div className="pf-video" style={{ aspectRatio: `${width} / ${height}` }}>
        <video
          ref={ref}
          width={width}
          height={height}
          poster={poster}
          controls={!ready}
          muted
          loop
          playsInline
          preload="none"
          aria-label={alt}
          data-pf-autoplay=""
        >
          {sources.map((source) => (
            <source key={source.src} src={source.src} type={source.type} />
          ))}
          {fallbackHref && (
            <a className="post-figure-link" href={fallbackHref}>
              Download the Clip
            </a>
          )}
        </video>
      </div>
      {/* The control sits under the clip, never over it, in a row the server
          already reserves, so nothing moves when the button arrives. */}
      <div className="pf-video-bar">
        {ready && (
          <button type="button" className="pf-video-toggle" onClick={toggle} aria-label={playing ? 'Pause Clip' : 'Play Clip'}>
            <span className={playing ? 'pf-video-icon is-pause' : 'pf-video-icon is-play'} aria-hidden="true" />
            <span className="pf-video-label">{playing ? 'Pause' : 'Play'}</span>
          </button>
        )}
      </div>
    </>
  );
}
