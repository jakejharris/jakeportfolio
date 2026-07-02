'use client';

// The path work takes under the orchestrator rule. The orchestrator writes
// a prompt, a cheaper worker edits the code, a review round checks it, the
// orchestrator merges. Its direct route into the source tree is closed.
// The only motion is a slow dash march along the allowed path, disabled
// under prefers-reduced-motion.

import { Fragment } from 'react';

const STEPS: { name: string; detail: string }[] = [
  { name: 'orchestrator', detail: 'writes the prompt' },
  { name: 'worker', detail: 'edits the code' },
  { name: 'review', detail: 'finds what slipped' },
  { name: 'orchestrator', detail: 'merges' },
];

const lineColor = 'color-mix(in srgb, hsl(var(--foreground)) 14%, transparent)';
const faintText = 'color-mix(in srgb, hsl(var(--foreground)) 50%, transparent)';
const dimText = 'color-mix(in srgb, hsl(var(--foreground)) 80%, transparent)';
const flowLine = 'color-mix(in srgb, hsl(var(--foreground)) 35%, transparent)';

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
        @media (prefers-reduced-motion: reduce) {
          .orl-flow-line { animation: none; }
        }
      `}</style>

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
              orchestrator
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
              source code
            </div>
          </div>
          <div className="mt-1.5 text-right text-[10px]" style={{ color: faintText }}>
            direct edit: forbidden by rule
          </div>
        </div>
      </div>
    </div>
  );
}
