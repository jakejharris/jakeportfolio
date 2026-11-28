import type { TimelineValue } from '@/app/types/sanity';
import {
  clockPercent,
  formatClockRange,
  parseClock,
  timelineOrder,
  timelineScale,
} from '@/app/lib/post-figures';

import { FigureFrame } from './Frame';

/**
 * A proportional time strip: each lane's points and spans on a real clock,
 * with labelled gaps across all lanes. Below it, the same moments as a list
 * in time order, which is also the strip's text alternative.
 *
 * Motion (CSS only, see MotionGate): a playhead sweeps the clock and the
 * marks light as it passes. The marks are drawn twice: the strip itself,
 * dimmed while moving, and a full-strength copy inside a clipping window
 * whose translateX grows from the left while the copy counter-translates,
 * so the sweep is two transform animations. The HTML is the settled state.
 */
const list = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);
const laterThanStart = (item: { start: string; end?: string }) => {
  const start = parseClock(item.start);
  const end = parseClock(item.end);
  return start !== null && end !== null && end > start;
};

export default function Timeline({ value }: { value: TimelineValue }) {
  // Blank or non-text lane names are dropped (Studio refuses them), so they
  // never take a lane's color or push out a real lane.
  const lanes = list<unknown>(value.lanes)
    .filter((lane): lane is string => typeof lane === 'string' && lane.trim() !== '')
    .slice(0, 3);
  // An end that is not after the start is ignored, so it cannot stretch the axis.
  const events = list<TimelineValue['events'][number] | null>(value.events)
    .filter((event): event is TimelineValue['events'][number] =>
      Boolean(event && parseClock(event.start) !== null && lanes.includes(event.lane))
    )
    .map((event) => (event.end == null || laterThanStart(event) ? event : { ...event, end: undefined }));
  const gaps = list<NonNullable<TimelineValue['gaps']>[number] | null>(value.gaps).filter(
    (gap): gap is NonNullable<TimelineValue['gaps']>[number] => Boolean(gap && laterThanStart(gap))
  );
  if (lanes.length === 0 || events.length === 0) return null;

  const scale = timelineScale([...events, ...gaps]);
  const laneOf = (name: string) => lanes.indexOf(name);
  const spanOf = (start: string, end?: string) => {
    const from = parseClock(start)!;
    const to = parseClock(end);
    return { from, to: to !== null && to > from ? to : undefined };
  };

  const laneRows = lanes.map((lane, laneIndex) => (
    <div key={lane} className="pf-timeline-lane">
      {events
        .filter((event) => event.lane === lane)
        .map((event) => {
          const { from, to } = spanOf(event.start, event.end);
          const left = clockPercent(from, scale);
          return to === undefined ? (
            <span key={event._key} className={`pf-mark pf-lane-${laneIndex}`} style={{ left: `${left}%` }} />
          ) : (
            <span
              key={event._key}
              className={`pf-span pf-lane-${laneIndex}`}
              style={{ left: `${left}%`, width: `${clockPercent(to, scale) - left}%` }}
            />
          );
        })}
    </div>
  ));

  return (
    <FigureFrame
      kind="timeline"
      motion
      title={value.title}
      label={value.label}
      caption={value.caption}
      sourceTitle={value.sourceTitle}
      sourceUrl={value.sourceUrl}
      sourceDetail={value.sourceDetail}
    >
      <div className="pf-timeline-strip" aria-hidden="true">
        {/* The gap labels get a row of their own above the lanes. */}
        {gaps.length > 0 && (
          <>
            <span />
            <div className="pf-timeline-lane" style={{ height: 22 }}>
              {gaps.map((gap) => {
                const { from, to } = spanOf(gap.start, gap.end);
                const mid = (clockPercent(from, scale) + clockPercent(to ?? from, scale)) / 2;
                // Shifting the label by the same share of its own width keeps it
                // inside the strip: centered mid-strip, flush near either end.
                return (
                  <span
                    key={gap._key}
                    className="pf-timeline-gap-label"
                    style={{ left: `${mid}%`, transform: `translateX(-${mid}%)` }}
                  >
                    <span>{gap.label}</span>
                  </span>
                );
              })}
            </div>
          </>
        )}
        <div className="flex flex-col">
          {lanes.map((lane) => (
            <span key={lane} className="pf-timeline-lane-name flex h-[22px] items-center">
              {lane}
            </span>
          ))}
        </div>
        <div className="pf-timeline-track">
          {gaps.map((gap) => {
            const { from, to } = spanOf(gap.start, gap.end);
            const left = clockPercent(from, scale);
            return (
              <span
                key={gap._key}
                className="pf-timeline-gap"
                style={{
                  left: `${left}%`,
                  width: `${clockPercent(to ?? from, scale) - left}%`,
                  top: -22,
                  bottom: '1.7rem',
                }}
              />
            );
          })}
          <div className="pf-timeline-lanes">
            {laneRows}
            <div className="pf-timeline-reveal">
              <div className="pf-timeline-reveal-copy">
                <div>{laneRows}</div>
              </div>
              <span className="pf-timeline-playhead" />
            </div>
          </div>
          <div className="pf-timeline-axis tabular">
            {scale.ticks.map((tick) => (
              <span
                key={tick.minutes}
                data-minor={tick.minor ? '' : undefined}
                style={{ left: `${clockPercent(tick.minutes, scale)}%` }}
              >
                {tick.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <ol className="pf-timeline-list">
        {timelineOrder(events, gaps).map((row) => {
          const { from, to } = spanOf(row.item.start, row.item.end);
          const when = row.item.start;
          if (row.kind === 'gap') {
            const gap = gaps[row.index];
            return (
              <li key={gap._key} className="pf-timeline-row pf-is-gap">
                <span className="pf-glyph pf-gap" aria-hidden="true" />
                <time className="tabular" dateTime={when}>
                  {formatClockRange(from, to)}
                </time>
                <span className="pf-text">{gap.label}</span>
              </li>
            );
          }
          const event = events[row.index];
          const lane = laneOf(event.lane);
          return (
            <li key={event._key} className="pf-timeline-row">
              <span className={`pf-glyph pf-lane-${lane}`} aria-hidden="true" />
              <time className="tabular" dateTime={when}>
                {event.timeLabel || formatClockRange(from, to)}
              </time>
              <span className="pf-text">
                <span className="sr-only">{event.lane}: </span>
                {event.text}
              </span>
            </li>
          );
        })}
      </ol>
    </FigureFrame>
  );
}
