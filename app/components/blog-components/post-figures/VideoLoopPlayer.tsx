'use client';

import { useEffect, useRef, useState } from 'react';

import { pressPlayPause } from '@/app/lib/video-loop';

import PlayPause from './PlayPause';

/**
 * The clip and its Play/Pause button. Server rendered with native controls
 * and no autoplay, so without JavaScript the poster shows and the reader can
 * play it. MotionGate plays the clip muted while its figure is in view and
 * the tab is visible, and pauses it otherwise (`data-pf-autoplay`). This
 * script swaps the native controls for the shared button. A reader's pause
 * takes the clip off the gate's autoplay until they press Play.
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
  const [autoplay, setAutoplay] = useState(true);

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
    if (video) setAutoplay(pressPlayPause(video, () => setPlaying(!video.paused)));
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
          // Without a poster, load enough to show the first frame instead of an empty box.
          preload={poster ? 'none' : 'metadata'}
          aria-label={alt}
          data-pf-autoplay={autoplay ? '' : undefined}
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
      <div className="pf-bar">{ready && <PlayPause playing={playing} name="Clip" onClick={toggle} />}</div>
    </>
  );
}
