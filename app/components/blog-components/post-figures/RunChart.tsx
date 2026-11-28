import { Fragment, type CSSProperties } from 'react';

import type { RunChartValue } from '@/app/types/run-figures';
import { buildRunChart, runClockLabel, type RunGroupModel, type RunTick } from '@/app/lib/run-chart';

import { FigureFrame } from './Frame';

/**
 * A run on one clock: a row per lane, a bar per span at its real start and
 * finish, colored by category, rows grouped under Title Case names. Server
 * rendered as plain HTML, so it reads in full without JavaScript; the replay
 * is a few transform animations (run-figures.css) over a dimmed copy, run by
 * MotionGate only while the figure is in view (`data-pf-motion`).
 */
type Vars = CSSProperties & Record<`--${string}`, string | number>;
const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

function Layer({ groups, live }: { groups: RunGroupModel[]; live?: boolean }) {
  return (
    <div className={live ? 'pf-run-layer is-live' : 'pf-run-layer'}>
      {groups.map((group) => (
        <Fragment key={group.key}>
          {group.heading && <div className="pf-run-heading" />}
          <div className="pf-run-g" style={{ '--rows': group.rows } as Vars}>
            {group.bars.map((bar, i) => (
              <span
                key={`b${i}`}
                className={`pf-run-bar pf-run-c${bar.slot}${bar.thin ? ' is-thin' : ''}`}
                style={{ '--r': bar.row, left: `${bar.left}%`, width: `${bar.width}%` } as Vars}
              />
            ))}
            {group.dots.map((dot, i) => (
              <span
                key={`d${i}`}
                className={dot.accent ? 'pf-run-dot is-accent' : 'pf-run-dot'}
                style={{ '--r': dot.row, left: `${dot.left}%` } as Vars}
              />
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

function Axis({ ticks, bottom }: { ticks: RunTick[]; bottom?: boolean }) {
  const from = ticks[0]?.minutes ?? 0;
  const span = (ticks.at(-1)?.minutes ?? from + 60) - from || 60;
  return (
    <div className={bottom ? 'pf-run-axis is-bottom tabular' : 'pf-run-axis tabular'}>
      {ticks.map((tick) => {
        const [hour, meridiem] = tick.label.split(' ');
        return (
          <span
            key={tick.minutes}
            data-minor={tick.minor ? '' : undefined}
            style={{ left: `${Math.round(((tick.minutes - from) / span) * 10000) / 100}%` }}
          >
            {hour}
            <i data-keep={tick.meridiem ? '' : undefined}> {meridiem}</i>
          </span>
        );
      })}
    </div>
  );
}

export default function RunChart({ value }: { value: RunChartValue }) {
  const model = buildRunChart(value);
  if (!model) return null;
  const { window, groups, readout, total } = model;
  const hours = (window.to - window.from) / 60;
  const longest = Math.min(24, Math.max(2, ...groups.map((g) => g.label.length)));
  const countLabel = str(value.countLabel) || 'Turns Done';
  const thinLabel = str(value.thinLabel);
  const fullLabel = str(value.fullLabel);
  const timeZone = str(value.timeZone);
  const legendTitle = str(value.legendTitle);
  const rows = groups.reduce((n, g) => n + g.rows, 0);
  const marks = [...model.milestones.map((m) => `${m.time} ${m.label}`), ...model.later.map((m) => `${m.time} ${m.label}`)];

  return (
    <FigureFrame kind="runChart" title={str(value.title)} label={str(value.label)} caption={str(value.caption)} motion>
      <div
        className="pf-run"
        style={{ '--pf-run-hours': hours, '--pf-run-steps': readout.length - 1, '--pf-run-side-ch': longest } as Vars}
      >
        {/* The running clock and count: a strip of every hour's value, stepped by transform. */}
        <p className="pf-run-readout tabular" aria-hidden="true">
          <span className="pf-run-odo">
            <span className="pf-run-odo-track">
              {readout.map((step) => (
                <span key={step.label}>{step.label}</span>
              ))}
            </span>
          </span>
          <span className="pf-run-faint"> · </span>
          <span className="pf-run-odo is-count">
            <span className="pf-run-odo-track">
              {readout.map((step) => (
                <span key={step.label}>{step.done}</span>
              ))}
            </span>
          </span>
          <span className="pf-run-faint">
            {' '}
            of {total} {countLabel}
          </span>
        </p>

        <div className="pf-run-top" aria-hidden="true">
          {model.milestones.map((mark) => (
            <div
              key={`${mark.time}${mark.label}`}
              className="pf-run-mark"
              data-anchor={mark.anchor}
              style={{ '--x': `${mark.left}%` } as Vars}
            >
              <span>
                <b>{mark.time}</b> {mark.label}
              </span>
            </div>
          ))}
          {model.later.map((mark) => (
            <div key={`${mark.time}${mark.label}`} className="pf-run-mark is-later">
              <span>
                <b>{mark.time}</b> {mark.label} <span className="pf-run-faint">→</span>
              </span>
            </div>
          ))}
          <Axis ticks={window.ticks} />
        </div>

        <div className="pf-run-chart" aria-hidden="true">
          <div className="pf-run-side">
            {groups.map((group) => (
              <Fragment key={group.key}>
                {group.heading && (
                  <div className="pf-run-heading">
                    <span>{group.heading}</span>
                  </div>
                )}
                <div className="pf-run-g" style={{ '--rows': group.rows } as Vars}>
                  <span className="pf-run-g-label">{group.label}</span>
                </div>
              </Fragment>
            ))}
          </div>
          <div className="pf-run-plot">
            {model.milestones.map((mark) => (
              <span key={`${mark.time}${mark.label}`} className="pf-run-guide" style={{ left: `${mark.left}%` }} />
            ))}
            <Layer groups={groups} />
            <div className="pf-run-reveal">
              <div className="pf-run-reveal-in">
                <Layer groups={groups} live />
              </div>
            </div>
            <span className="pf-run-playhead" />
          </div>
        </div>

        <div className="pf-run-bottom" aria-hidden="true">
          <Axis ticks={window.ticks} bottom />
          {timeZone && <p className="pf-run-zone">{timeZone}</p>}
        </div>

        <div className="pf-run-legend">
          {legendTitle && <span className="pf-run-legend-title">{legendTitle}</span>}
          <ul>
            {model.categories.map((category) => (
              <li key={category.slot}>
                <span className={`pf-run-key pf-run-c${category.slot}`} aria-hidden="true" />
                {category.label}
              </li>
            ))}
          </ul>
          {model.hasThin && fullLabel && thinLabel && (
            <ul>
              <li>
                <span className="pf-run-key is-full" aria-hidden="true" />
                {fullLabel}
              </li>
              <li>
                <span className="pf-run-key is-thin" aria-hidden="true" />
                {thinLabel}
              </li>
            </ul>
          )}
        </div>

        {/* The same facts as text, for screen readers. */}
        <div className="sr-only">
          <p>
            {rows} rows and {total} bars, from {runClockLabel(model.first)} to {runClockLabel(model.last)}
            {timeZone ? `, ${timeZone}` : ''}.
          </p>
          {marks.length > 0 && <p>Milestones: {marks.join('; ')}.</p>}
          <ul>
            {groups.map((group) => {
              const lines = group.lanes.map((lane) => {
                const parts = [
                  lane.categories.join(' and '),
                  lane.thin && thinLabel ? thinLabel : '',
                ].filter(Boolean);
                const name = parts.length ? `${lane.label}, ${parts.join(', ')}` : lane.label;
                const times = [...lane.spans, ...(lane.markers.length ? [`marks at ${lane.markers.join(', ')}`] : [])];
                return `${name}: ${times.join('; ') || 'nothing'}.`;
              });
              const single = group.lanes.length === 1 && group.lanes[0].label === group.label;
              return (
                <li key={group.key}>
                  {group.heading ? `${group.heading}. ` : ''}
                  {single ? (
                    lines[0]
                  ) : (
                    <>
                      {group.label}:
                      <ul>
                        {lines.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </FigureFrame>
  );
}
