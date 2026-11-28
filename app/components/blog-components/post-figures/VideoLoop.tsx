import type { VideoLoopValue } from '@/app/types/run-figures';
import { dataset, projectId } from '@/app/lib/sanity.config';
import { sanityPoster, videoBox, videoSource, type SanityProject } from '@/app/lib/video-loop';

import { FigureFrame } from './Frame';
import VideoLoopPlayer from './VideoLoopPlayer';

const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/**
 * A short muted clip that loops while it is on screen, in the same card as
 * the other figures. The frame reserves the clip's shape up front, so
 * nothing moves when the poster or the video arrives. MotionGate plays and
 * pauses it with the figure's visibility (`data-pf-motion`).
 */
export default function VideoLoop({ value, project }: { value: VideoLoopValue; project?: SanityProject }) {
  const where = project ?? { projectId, dataset };
  const mp4 = videoSource(value?.mp4, 'mp4', where);
  const webm = videoSource(value?.webm, 'webm', where);
  if (!value || (!mp4 && !webm)) return null;
  const poster = sanityPoster(value.poster, where);
  const { width, height } = videoBox(value, poster);
  const sources = [
    ...(webm ? [{ src: webm, type: 'video/webm' }] : []),
    ...(mp4 ? [{ src: mp4, type: 'video/mp4' }] : []),
  ];
  const alt = str(value.alt) || str(value.title) || 'Video clip';

  return (
    <FigureFrame kind="videoLoop" title={str(value.title)} label={str(value.label)} caption={str(value.caption)} flush motion>
      <VideoLoopPlayer
        sources={sources}
        poster={poster?.url}
        width={width}
        height={height}
        alt={alt}
        fallbackHref={mp4 ?? webm}
      />
    </FigureFrame>
  );
}
