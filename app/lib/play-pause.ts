// The clip player's Play/Pause press, apart from video-loop.ts so the
// browser bundle does not carry the Studio checks and asset helpers.

/**
 * The player's Play/Pause press. A paused clip plays muted; a playing one
 * pauses. Returns whether the gate may autoplay the clip afterwards, so a
 * reader's pause sticks until they press Play. A play the browser refuses is
 * reported through `onRefused`, so the button can show the real state.
 */
export function pressPlayPause(
  video: Pick<HTMLVideoElement, 'paused' | 'muted' | 'play' | 'pause'>,
  onRefused?: () => void
): boolean {
  if (!video.paused) {
    video.pause();
    return false;
  }
  video.muted = true;
  video.play()?.catch(() => onRefused?.());
  return true;
}
