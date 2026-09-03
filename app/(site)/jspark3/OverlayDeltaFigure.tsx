import * as React from 'react';
import { ABLATION_FIGURE_LABEL, ABLATION_GROUPS, ABLATION_SCALE, ABLATION_TICKS } from './content';

/**
 * The internal-ablation figure: JSpark3 against the matched three-Spark control,
 * one scale for every bar. Pure CSS and JSX, no charting library and no client
 * JavaScript; nothing animates, so there is nothing for reduced motion to stop.
 */

const SPAN = ABLATION_SCALE.max - ABLATION_SCALE.min;

/** Position along the shared scale, as the source figure computes it. */
function offset(value: number): string {
  return `${(((value - ABLATION_SCALE.min) / SPAN) * 100).toFixed(3)}%`;
}

function width(value: number): string {
  return `${((Math.abs(value) / SPAN) * 100).toFixed(3)}%`;
}

function format(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function tickLabel(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value)}%`;
}

const ZERO = offset(0);

export default function OverlayDeltaFigure() {
  return (
    <div
      role="img"
      aria-label={ABLATION_FIGURE_LABEL}
      className="grid grid-cols-[86px_minmax(0,1fr)_54px] items-center gap-x-2 gap-y-[7px] text-xs tabular-nums min-[560px]:grid-cols-[max-content_minmax(0,1fr)_64px] min-[560px]:gap-x-3 min-[560px]:text-[13.5px]"
    >
      {ABLATION_GROUPS.map((group) => (
        <React.Fragment key={group.name}>
          <p className="col-span-full mt-3 text-[11.5px] font-semibold uppercase leading-[1.35] tracking-[0.08em] text-muted-foreground first:mt-0">
            {group.name}
          </p>
          {group.rows.map((row) => {
            const up = row.value >= 0;
            return (
              <React.Fragment key={`${group.name}-${row.label}`}>
                <p className="text-right leading-tight">{row.label}</p>
                <div
                  className="relative h-4 border-r border-border"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px)',
                    backgroundSize: 'calc(100% / 7) 100%',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute -top-[3px] -bottom-[3px] -ml-[0.75px] w-[1.5px] bg-foreground"
                    style={{ left: ZERO }}
                  />
                  <span
                    aria-hidden="true"
                    className={`absolute top-px h-3.5 min-w-[2px] rounded-sm ${
                      up ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-rose-600 dark:bg-rose-400'
                    }`}
                    style={{
                      left: up ? ZERO : offset(row.value),
                      width: width(row.value),
                    }}
                  />
                </div>
                <p
                  className={`whitespace-nowrap font-semibold ${
                    up
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {format(row.value)}
                </p>
              </React.Fragment>
            );
          })}
        </React.Fragment>
      ))}

      <div />
      <div className="relative mt-1 h-[18px] text-[10px] text-muted-foreground min-[560px]:text-[11.5px]">
        {ABLATION_TICKS.map((tick, index) => (
          <span
            key={tick.value}
            aria-hidden="true"
            className={`absolute top-0 whitespace-nowrap ${tick.minor ? 'hidden min-[560px]:block' : ''}`}
            style={{
              left: offset(tick.value),
              transform:
                index === 0
                  ? undefined
                  : index === ABLATION_TICKS.length - 1
                    ? 'translateX(-100%)'
                    : 'translateX(-50%)',
            }}
          >
            {tickLabel(tick.value)}
          </span>
        ))}
      </div>
      <div />
    </div>
  );
}
