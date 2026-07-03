'use client';

import { useEffect, useRef, useState } from 'react';

const ALLOWED: string[] = [
  'Plans, Contracts, Impl Prompts',
  'Branches, Worktrees, Git and PR Ops',
  'Memory Writes',
  'Predeclared Smoke Commands',
  'Status Updates to Me',
];

const FORBIDDEN: string[] = [
  'Editing Source Code',
  'Ad Hoc curl, DB Queries, Log Pulls',
  'Reading File After File to Chase a Bug',
  'A Second Experimental Command After a Smoke Fails',
];

const lineColor = 'color-mix(in srgb, hsl(var(--foreground)) 14%, transparent)';
const faintText = 'color-mix(in srgb, hsl(var(--foreground)) 55%, transparent)';
const dimText = 'color-mix(in srgb, hsl(var(--foreground)) 78%, transparent)';
const forbiddenText = 'color-mix(in srgb, hsl(var(--foreground)) 62%, transparent)';

const accentText = 'var(--accent-color)';
const accentMarker = 'color-mix(in srgb, var(--accent-color) 78%, transparent)';

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);

    update();
    media.addEventListener('change', update);

    return () => media.removeEventListener('change', update);
  }, []);

  return reduced;
}

function Marker({
  type,
  accent,
  delay,
}: {
  type: 'plus' | 'x';
  accent?: boolean;
  delay: number;
}) {
  const pathStyle = { animationDelay: `${delay}ms` };

  return (
    <svg
      className="rule-ledger-marker mt-[2px] h-3.5 w-3.5 shrink-0"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      style={{
        color: accent ? accentMarker : faintText,
      }}
    >
      {type === 'plus' ? (
        <>
          <path
            d="M7 2.75V11.25"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            style={pathStyle}
          />
          <path
            d="M2.75 7H11.25"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            style={pathStyle}
          />
        </>
      ) : (
        <>
          <path
            d="M3.25 3.25L10.75 10.75"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            style={pathStyle}
          />
          <path
            d="M10.75 3.25L3.25 10.75"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            style={pathStyle}
          />
        </>
      )}
    </svg>
  );
}

function Column({
  heading,
  marker,
  items,
  accent,
  dimmed,
}: {
  heading: string;
  marker: 'plus' | 'x';
  items: string[];
  accent?: boolean;
  dimmed?: boolean;
}) {
  return (
    <div className="relative p-5">
      <h4
        className="mb-3 text-[11px] uppercase tracking-[0.15em]"
        style={{ color: accent ? accentText : faintText }}
      >
        {heading}
      </h4>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={item}
            className="flex gap-2.5 text-[13px] leading-snug"
          >
            <Marker
              type={marker}
              accent={accent}
              delay={120 + index * 70}
            />
            <span style={{ color: dimmed ? forbiddenText : dimText }}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RuleLedger() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const shouldSettle = entered || reducedMotion;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) {
      if (reducedMotion) setEntered(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(root);

    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <div
      ref={rootRef}
      className="rounded-lg border font-mono"
      data-settled={shouldSettle ? 'true' : 'false'}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      style={{ borderColor: lineColor }}
      aria-label="Ledger of allowed and forbidden work for the orchestrator agent, from its rule file"
    >
      <style>{`
        [data-settled='false'] .rule-ledger-divider,
        [data-settled='false'] .rule-ledger-marker path {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
        }

        [data-settled='true'] .rule-ledger-divider {
          stroke-dasharray: 1;
          stroke-dashoffset: 0;
          animation: rule-ledger-line 620ms ease-out both;
        }

        [data-settled='true'] .rule-ledger-marker path {
          stroke-dasharray: 1;
          stroke-dashoffset: 0;
          animation: rule-ledger-mark 520ms ease-out both;
        }

        [data-reduced-motion='true'] .rule-ledger-divider,
        [data-reduced-motion='true'] .rule-ledger-marker path {
          animation: none;
          stroke-dasharray: 1;
          stroke-dashoffset: 0;
        }

        @keyframes rule-ledger-line {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes rule-ledger-mark {
          from { stroke-dashoffset: 1; opacity: 0.35; }
          to { stroke-dashoffset: 0; opacity: 1; }
        }
      `}</style>

      <div className="relative grid grid-cols-1 sm:grid-cols-2">
        <svg
          className="pointer-events-none absolute bottom-0 left-1/2 top-0 hidden w-px sm:block"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line
            className="rule-ledger-divider"
            x1="0.5"
            y1="0"
            x2="0.5"
            y2="1"
            pathLength="1"
            stroke={lineColor}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <Column heading="Allowed" marker="plus" items={ALLOWED} accent />
        <div className="relative">
          <svg
            className="pointer-events-none absolute inset-x-0 top-0 h-px sm:hidden"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line
              className="rule-ledger-divider"
              x1="0"
              y1="0.5"
              x2="1"
              y2="0.5"
              pathLength="1"
              stroke={lineColor}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <Column
            heading="Forbidden"
            marker="x"
            items={FORBIDDEN}
            dimmed
          />
        </div>
      </div>
      <div
        className="border-t px-5 py-2.5 text-[11px]"
        style={{ borderColor: lineColor, color: faintText }}
      >
        from .claude/rules/identity.md, the file the agent reads every session
      </div>
    </div>
  );
}
