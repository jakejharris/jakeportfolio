import '@/app/css/pinned-badge.css';

// The post link announces pinned status; the lattice mark is visual only.
// A nine-cell-wide asterisk, using the pixel tide’s lattice.
export default function PinnedBadge() {
  return (
    <span className="pinned-badge badge-asterisk" aria-hidden="true">
      <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
        <rect x="4" y="0" width="1" height="1" />
        <rect x="4" y="1" width="1" height="1" />
        <rect x="2" y="2" width="1" height="1" />
        <rect x="4" y="2" width="1" height="1" />
        <rect x="6" y="2" width="1" height="1" />
        <rect x="3" y="3" width="3" height="1" />
        <rect x="0" y="4" width="9" height="1" />
        <rect x="3" y="5" width="3" height="1" />
        <rect x="2" y="6" width="1" height="1" />
        <rect x="4" y="6" width="1" height="1" />
        <rect x="6" y="6" width="1" height="1" />
        <rect x="4" y="7" width="1" height="1" />
        <rect x="4" y="8" width="1" height="1" />
      </svg>
    </span>
  );
}
