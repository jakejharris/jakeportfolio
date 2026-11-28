'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The clip and its play/pause control. Server rendered with native controls
 * and no autoplay, so without JavaScript the poster shows and the reader can
 * play it. Once this runs it hides the native controls, shows a small
 * Play/Pause button, and plays muted only while the clip is on screen and
 * the tab is visible. With reduced motion it waits for the button.
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
  // The reader's choice: false after they pause, or from the start with reduced motion.
  const wanted = useRef(true);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let onScreen = false;
    wanted.current = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    video.muted = true;
    const sync = () => {
      if (wanted.current && onScreen && !document.hidden) {
        if (video.paused) video.play().catch(() => setPlaying(false));
      } else if (!video.paused) video.pause();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0.25 }
    );
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    observer.observe(video);
    document.addEventListener('visibilitychange', sync);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    setReady(true);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    wanted.current = video.paused;
    if (video.paused) video.play().catch(() => setPlaying(false));
    else video.pause();
  };

  return (
    <>
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
      {ready && (
        <button type="button" className="pf-video-toggle" onClick={toggle} aria-label={playing ? 'Pause Clip' : 'Play Clip'}>
          <span className={playing ? 'pf-video-icon is-pause' : 'pf-video-icon is-play'} aria-hidden="true" />
          <span className="pf-video-label">{playing ? 'Pause' : 'Play'}</span>
        </button>
      )}
    </>
  );
}
