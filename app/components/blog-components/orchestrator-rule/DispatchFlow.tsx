'use client';

// The path work takes under the orchestrator rule. The orchestrator writes
// a prompt, a cheaper worker edits the code, a review round checks it, the
// orchestrator merges. Its direct route into the source tree is closed.
// The only motion is a slow dash march along the allowed path, disabled
// under prefers-reduced-motion.
//
// Below sm, the horizontal strip becomes a vertical rail so the diagram
// reads without side-scrolling; the sm:+ layout is untouched.

import { Fragment } from 'react';

const STEPS: { name: string; detail: string }[] = [
  { name: 'Orchestrator', detail: 'Writes the Prompt' },
  { name: 'Worker', detail: 'Edits the Code' },
  { name: 'Review', detail: 'Finds What Slipped' },
  { name: 'Orchestrator', detail: 'Merges' },
];

const lineColor = 'color-mix(in srgb, hsl(var(--foreground)) 14%, transparent)';
const faintText = 'color-mix(in srgb, hsl(var(--foreground)) 50%, transparent)';
const dimText = 'color-mix(in srgb, hsl(var(--foreground)) 80%, transparent)';
const flowLine = 'color-mix(in srgb, var(--accent-color) 55%, transparent)';

export default function DispatchFlow() {
  return (
    <div
      className="rounded-lg border font-mono px-5 py-6"
      style={{ borderColor: lineColor }}
      aria-label="Diagram of the dispatch flow: the orchestrator writes a prompt, a worker edits the code, a review checks it, and the orchestrator merges. The orchestrator's direct edit path into source code is blocked."
    >
      <style>{`
        @keyframes orl-dash-march {
          from { background-position-x: 0; }
          to { background-position-x: -10px; }
        }
        .orl-flow-line {
          height: 1px;
          background-image: linear-gradient(90deg, currentColor 55%, transparent 45%);
          background-size: 10px 1px;
          background-repeat: repeat-x;
          animation: orl-dash-march 1.6s linear infinite;
        }
        @keyframes orl-dash-march-v {
          from { background-position-y: 0; }
          to { background-position-y: -10px; }
        }
        .orl-flow-line-v {
          width: 1px;
          background-image: linear-gradient(180deg, currentColor 55%, transparent 45%);
          background-size: 1px 10px;
          background-repeat: repeat-y;
          animation: orl-dash-march-v 1.6s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .orl-flow-line { animation: none; }
          .orl-flow-line-v { animation: none; }
        }
      `}</style>

      {/* Mobile: vertical rail, no side-scroll */}
      <div className="sm:hidden">
        <div className="flex flex-col">
          {STEPS.map((step, i) => (
            <div key={`${step.name}-${i}-m`} className="flex gap-3 pb-5 last:pb-0">
              <div className="relative flex w-3 flex-col items-center">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full border"
                  style={{ borderColor: flowLine }}
                  aria-hidden="true"
                />
                {i < STEPS.length - 1 && (
                  <span
                    className="orl-flow-line-v mt-1 flex-1"
                    style={{ color: flowLine }}
                    aria-hidden="true"
                  />
                )}
              </div>
              <div>
                <div
                  className="inline-block w-fit rounded border px-3 py-1.5 text-xs"
                  style={{ borderColor: flowLine, color: dimText }}
                >
                  {step.name}
                </div>
                <div className="mt-1 text-[10px]" style={{ color: faintText }}>
                  {step.detail}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Blocked path */}
        <div className="mt-3 flex gap-3">
          <div className="relative flex w-3 flex-col items-center">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-dashed"
              style={{ borderColor: lineColor }}
              aria-hidden="true"
            />
            <div
              className="relative mt-1 flex flex-1 items-center justify-center"
              style={{ minHeight: '32px' }}
              aria-hidden="true"
            >
              <span
                className="h-full border-l border-dashed"
                style={{ borderColor: lineColor }}
              />
              <span
                className="absolute inset-0 flex items-center justify-center text-sm leading-none"
                style={{ color: faintText }}
              >
                &times;
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2">
            <div
              className="w-fit rounded border border-dashed px-3 py-1.5 text-xs"
              style={{ borderColor: lineColor, color: faintText }}
            >
              Orchestrator
            </div>
            <div
              className="w-fit rounded border border-dashed px-3 py-1.5 text-xs line-through"
              style={{ borderColor: lineColor, color: faintText }}
            >
              Source Code
            </div>
            <div className="text-[10px]" style={{ color: faintText }}>
              Direct Edit: Forbidden by Rule
            </div>
          </div>
        </div>
      </div>

      {/* sm and up: original horizontal strip, unchanged */}
      <div className="hidden sm:block">
        <div className="overflow-x-auto">
          <div className="min-w-[540px]">
            {/* Allowed path */}
            <div className="flex items-center">
              {STEPS.map((step, i) => (
                <Fragment key={`${step.name}-${i}`}>
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className="rounded border px-3 py-1.5 text-xs"
                      style={{ borderColor: flowLine, color: dimText }}
                    >
                      {step.name}
                    </div>
                    <div
                      className="mt-1.5 text-[10px] whitespace-nowrap"
                      style={{ color: faintText }}
                    >
                      {step.detail}
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 self-start mt-[14px] mx-2" aria-hidden="true">
                      <div className="orl-flow-line" style={{ color: flowLine }} />
                    </div>
                  )}
                </Fragment>
              ))}
            </div>

            {/* Blocked path */}
            <div className="mt-6 flex items-center">
              <div
                className="rounded border border-dashed px-3 py-1.5 text-xs shrink-0"
                style={{ borderColor: lineColor, color: faintText }}
              >
                Orchestrator
              </div>
              <div className="flex-1 mx-2 flex items-center gap-2" aria-hidden="true">
                <div
                  className="flex-1 border-t border-dashed"
                  style={{ borderColor: lineColor }}
                />
                <span className="text-sm leading-none" style={{ color: faintText }}>
                  &times;
                </span>
                <div
                  className="flex-1 border-t border-dashed"
                  style={{ borderColor: lineColor }}
                />
              </div>
              <div
                className="rounded border border-dashed px-3 py-1.5 text-xs line-through shrink-0"
                style={{ borderColor: lineColor, color: faintText }}
              >
                Source Code
              </div>
            </div>
            <div className="mt-1.5 text-right text-[10px]" style={{ color: faintText }}>
              Direct Edit: Forbidden by Rule
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
