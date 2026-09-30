'use client';

// The table from "The Math That Should Have Killed the Idea." Every layer
// compresses about ten to one, so the layers a corpus needs to fit a 200K
// token window (800 KB) are log₁₀ of its size over the window, rounded up.
// Each layer is drawn as one cell: ten times the text costs one more cell.
// Choosing a row walks its size down, layer by layer, until it fits.

import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/app/lib/utils';

import {
  ACCENT,
  DIM,
  FAINT,
  Figure,
  LINE,
  Replay,
  useBeforePaint,
  useReducedMotion,
  useSeen,
} from './figure';
import { CONTEXT_BYTES, SCALE_ROWS, descent, formatBytes, layersFor } from './figures';

const DEFAULT_ROW = SCALE_ROWS.findIndex((row) => row.what === 'All books ever written');
const ROW_STAGGER_MS = 110;
const CELL_STAGGER_MS = 45;
const STEPS_MS = 1300;

const ROWS = SCALE_ROWS.map((row) => ({ ...row, layers: layersFor(row.bytes) }));

/** Pop cells or steps in, one after another, from wherever they are now. */
function reveal(elements: Iterable<HTMLElement>, delayOf: (element: HTMLElement) => number) {
  for (const element of elements) {
    for (const animation of element.getAnimations()) animation.cancel();
    element.animate(
      [
        { opacity: 0, transform: 'scale(0.4)' },
        { opacity: 1, transform: 'none' },
      ],
      {
        duration: 260,
        delay: delayOf(element),
        easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
        fill: 'backwards',
      }
    );
  }
}

export default function ScalingTable() {
  const reduced = useReducedMotion();
  const figureRef = useRef<HTMLElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const seen = useSeen(figureRef, 0.4);
  const [selected, setSelected] = useState(DEFAULT_ROW);
  const playedRef = useRef(false);

  const playSteps = useCallback((delay: number) => {
    const steps = stepsRef.current;
    if (!steps) return;
    const elements = steps.querySelectorAll<HTMLElement>('[data-step]');
    // Short descents step at an even pace; long ones take no longer in all.
    const pace = Math.min(140, STEPS_MS / Math.max(1, elements.length));
    reveal(elements, (element) => delay + Number(element.dataset.step) * pace);
  }, []);

  const play = useCallback(() => {
    const table = tableRef.current;
    if (!table) return;
    const cells = table.querySelectorAll<HTMLElement>('[data-cell]');
    reveal(cells, (element) => {
      const [row, k] = (element.dataset.cell ?? '0-0').split('-').map(Number);
      return row * ROW_STAGGER_MS + k * CELL_STAGGER_MS;
    });
    table.dataset.hidden = 'false';
    playSteps(ROWS.length * ROW_STAGGER_MS + 200);
    if (stepsRef.current) stepsRef.current.dataset.hidden = 'false';
  }, [playSteps]);

  // Tell the table once, when it scrolls into view; reduced motion shows it whole.
  useEffect(() => {
    if (playedRef.current) return;
    if (reduced) {
      playedRef.current = true;
      if (tableRef.current) tableRef.current.dataset.hidden = 'false';
      if (stepsRef.current) stepsRef.current.dataset.hidden = 'false';
      return;
    }
    if (!seen) return;
    playedRef.current = true;
    play();
  }, [play, reduced, seen]);

  const choose = (index: number) => {
    if (index === selected) return;
    setSelected(index);
  };

  // A newly chosen row walks its own descent, hidden from its first frame.
  // Before the table has played, its first run shows the descent instead.
  const shownRef = useRef(selected);
  useBeforePaint(() => {
    if (shownRef.current === selected) return;
    shownRef.current = selected;
    if (!reduced && playedRef.current) playSteps(0);
  }, [playSteps, reduced, selected]);

  const row = ROWS[selected];
  const sizes = descent(row.bytes);

  return (
    <Figure
      figureRef={figureRef}
      label={`A table of corpora and the layers of ten to one compression each needs to fit a 200K token context window of about 800 KB. ${ROWS.map((r) => `${r.what}, ${r.size}: ${r.layers} layers.`).join(' ')}`}
      title="Layers to fit a 200K window"
      meta="10 to 1 per layer"
      footer={
        <>
          <span className="flex-1 basis-64" style={{ color: DIM }}>
            <span style={{ color: FAINT }}>layers = </span>log₁₀(T ÷ 200,000 tokens), rounded up.
            Each layer divides by ten, so ten times the text costs one more layer.
          </span>
          <Replay onClick={play} />
        </>
      }
    >
      <div className="px-3 pt-3 sm:px-4">
        <table
          ref={tableRef}
          data-hidden="true"
          className="group/table w-full border-collapse text-[11px] leading-snug sm:text-xs"
        >
          <caption className="sr-only">
            Layers of ten to one compression to fit a 200K token window
          </caption>
          <thead>
            <tr style={{ color: FAINT }}>
              <th scope="col" className="pb-2 pr-2 text-left font-normal">
                Corpus
              </th>
              <th scope="col" className="pb-2 pr-3 text-right font-normal">
                Size
              </th>
              <th scope="col" className="pb-2 pr-3 text-right font-normal">
                Layers
              </th>
              <th scope="col" className="pb-2 text-left font-normal">
                <span className="sr-only">One cell per layer</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((entry, index) => {
              const active = index === selected;
              return (
                <tr
                  key={entry.what}
                  onClick={() => choose(index)}
                  className={cn(
                    'cursor-pointer border-t transition-colors duration-200',
                    !active && 'hover:bg-[color-mix(in_srgb,hsl(var(--foreground))_4%,transparent)]'
                  )}
                  style={{
                    borderColor: LINE,
                    backgroundColor: active
                      ? 'color-mix(in srgb, var(--accent-color) 10%, transparent)'
                      : undefined,
                  }}
                >
                  <th scope="row" className="py-0 pr-2 text-left font-normal">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={(event) => {
                        event.stopPropagation();
                        choose(index);
                      }}
                      className="-mx-1 min-h-8 rounded-sm px-1 py-1.5 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-[color:var(--accent-color)]"
                      style={{ color: active ? 'hsl(var(--foreground))' : DIM }}
                    >
                      {entry.what}
                    </button>
                  </th>
                  <td
                    className="whitespace-nowrap pr-3 text-right tabular-nums"
                    style={{ color: active ? 'hsl(var(--foreground))' : DIM }}
                  >
                    {entry.size}
                  </td>
                  <td
                    className="pr-3 text-right tabular-nums"
                    style={{ color: active ? ACCENT : DIM }}
                  >
                    {entry.layers}
                  </td>
                  <td className="w-[74px] sm:w-[30%]">
                    {entry.layers === 0 ? (
                      <span style={{ color: FAINT }}>fits</span>
                    ) : (
                      <span className="flex flex-wrap gap-px sm:gap-[2px]" aria-hidden="true">
                        {Array.from({ length: entry.layers }, (_, k) => (
                          <span
                            key={k}
                            data-cell={`${index}-${k}`}
                            className="block h-[3px] w-[3px] transition-[background-color,opacity] duration-200 group-data-[hidden=true]/table:opacity-0 sm:h-[5px] sm:w-[5px]"
                            style={{
                              backgroundColor: active
                                ? ACCENT
                                : 'color-mix(in srgb, hsl(var(--foreground)) 38%, transparent)',
                            }}
                          />
                        ))}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* The chosen row, walked down one layer at a time. */}
      <div
        ref={stepsRef}
        data-hidden="true"
        className="group/steps mx-3 mb-3 mt-2 border-t pt-3 text-[11px] leading-relaxed sm:mx-4 sm:text-xs"
        style={{ borderColor: LINE }}
        aria-live="polite"
      >
        <div style={{ color: DIM }}>
          {row.layers === 0 ? (
            <>
              {row.what}: {row.size} already fits.
            </>
          ) : (
            <>
              {row.what}, {row.layers} layers:
            </>
          )}
        </div>
        {row.layers > 0 && (
          <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 tabular-nums">
            {sizes.map((size, step) => {
              const last = step === sizes.length - 1;
              return (
                <span
                  key={`${row.what}-${step}`}
                  data-step={step}
                  className="inline-flex items-baseline gap-x-1.5 whitespace-nowrap group-data-[hidden=true]/steps:opacity-0"
                >
                  {step > 0 && (
                    <span aria-hidden="true" style={{ color: FAINT }}>
                      →
                    </span>
                  )}
                  <span
                    style={{
                      color: last ? ACCENT : step === 0 ? 'hsl(var(--foreground))' : DIM,
                    }}
                  >
                    {size}
                  </span>
                </span>
              );
            })}
            <span
              data-step={sizes.length}
              className="whitespace-nowrap group-data-[hidden=true]/steps:opacity-0"
              style={{ color: FAINT }}
            >
              fits in {formatBytes(CONTEXT_BYTES)}
            </span>
          </div>
        )}
      </div>
    </Figure>
  );
}
