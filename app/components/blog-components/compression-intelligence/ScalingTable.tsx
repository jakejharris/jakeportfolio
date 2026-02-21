'use client';

// Animated version of the table from "The Math That Should Have Killed the
// Idea." Rows reveal one by one with counting animations to dramatize the
// logarithmic scaling: at ~10:1 compression per layer, going from Claude's
// 800KB context window to all of English Wikipedia takes just 5 layers, and
// compressing every book ever written takes only 8. The punchline rows
// (Library of Congress, all books) pulse to underscore the article's
// realization: "Going from 'a textbook' to 'all human knowledge ever written'
// costs five additional layers." The final row (1 EB — total data created per
// year, 13 layers) glows to land the point that the scaling is logarithmic,
// not linear.

import { useEffect, useRef, useState, useCallback } from 'react';

// --- Table Data ---
const TABLE_DATA = [
  { size: '800 KB', description: "Claude's context window", layers: 0 },
  { size: '1 GB', description: 'A large codebase', layers: 4 },
  { size: '20 GB', description: 'All of English Wikipedia', layers: 5 },
  { size: '1 TB', description: 'Estimated GPT-4 training data', layers: 7 },
  { size: '15 TB', description: 'Library of Congress (text)', layers: 8 },
  { size: '50 TB', description: 'All books ever written', layers: 8 },
  { size: '1 EB', description: 'Total data created per year', layers: 13 },
];

const PUNCHLINE_INDICES = [4, 5];
const FINAL_INDEX = 6;
const ROW_STAGGER_MS = 160;
const ROW_ENTER_MS = 450;
const LOOP_HOLD_MS = 3000;
const FADE_OUT_MS = 600;

// Ease-out cubic
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function ScalingTable() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [revealedRows, setRevealedRows] = useState(0);
  const [countedValues, setCountedValues] = useState<number[]>(
    TABLE_DATA.map(() => 0)
  );
  const [punchlineActive, setPunchlineActive] = useState(false);
  const [finalRowActive, setFinalRowActive] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [restartTrigger, setRestartTrigger] = useState(0);

  const countAnimations = useRef<Map<number, number>>(new Map());
  const staggerTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const completedRowsRef = useRef<Set<number>>(new Set());

  // --- Reduced motion detection ---
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // --- Intersection Observer ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // --- Counting animation for a single row ---
  const animateCount = useCallback(
    (rowIndex: number) => {
      const target = TABLE_DATA[rowIndex].layers;
      if (target === 0) {
        setCountedValues((prev) => {
          const next = [...prev];
          next[rowIndex] = 0;
          return next;
        });
        return;
      }

      const duration = Math.min(
        Math.max(300, target * 45),
        rowIndex === FINAL_INDEX ? 650 : 500
      );
      const start = performance.now();

      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);
        const current = Math.round(eased * target);

        setCountedValues((prev) => {
          const next = [...prev];
          next[rowIndex] = current;
          return next;
        });

        if (progress < 1) {
          countAnimations.current.set(
            rowIndex,
            requestAnimationFrame(tick)
          );
        } else {
          countAnimations.current.delete(rowIndex);

          // Trigger punchline after both rows 4 and 5 finish
          if (rowIndex === PUNCHLINE_INDICES[1]) {
            setTimeout(() => setPunchlineActive(true), 100);
          }
          // Trigger final row emphasis
          if (rowIndex === FINAL_INDEX) {
            setTimeout(() => setFinalRowActive(true), 150);
          }
        }
      };

      countAnimations.current.set(rowIndex, requestAnimationFrame(tick));
    },
    []
  );

  // --- Staggered reveal chain + loop ---
  useEffect(() => {
    if (!isVisible || prefersReducedMotion) return;

    const timers = staggerTimers.current;
    const counts = countAnimations.current;

    // Start header + rows after a short pause
    const headerDelay = setTimeout(() => {
      TABLE_DATA.forEach((_, i) => {
        const timer = setTimeout(() => {
          setRevealedRows((prev) => Math.max(prev, i + 1));
          animateCount(i);
        }, i * ROW_STAGGER_MS);
        timers.push(timer);

        // Track when each row's entrance animation completes
        const animDoneTimer = setTimeout(() => {
          completedRowsRef.current.add(i);
        }, i * ROW_STAGGER_MS + ROW_ENTER_MS + 50);
        timers.push(animDoneTimer);
      });

      // Schedule loop: after all animations + hold, fade out and restart
      const totalAnimTime =
        (TABLE_DATA.length - 1) * ROW_STAGGER_MS + // last row starts
        650 + // longest count animation (final row)
        150 + // finalRowActive delay
        100;  // buffer

      const loopTimer = setTimeout(() => {
        setFadingOut(true);

        const resetTimer = setTimeout(() => {
          // Reset all animation state
          completedRowsRef.current.clear();
          setRevealedRows(0);
          setCountedValues(TABLE_DATA.map(() => 0));
          setPunchlineActive(false);
          setFinalRowActive(false);
          setFadingOut(false);
          setRestartTrigger((prev) => prev + 1);
        }, FADE_OUT_MS);
        timers.push(resetTimer);
      }, totalAnimTime + LOOP_HOLD_MS);
      timers.push(loopTimer);
    }, 200);

    timers.push(headerDelay);

    return () => {
      timers.forEach(clearTimeout);
      staggerTimers.current = [];
      counts.forEach((id) => cancelAnimationFrame(id));
      counts.clear();
    };
  }, [isVisible, prefersReducedMotion, animateCount, restartTrigger]);

  // --- If reduced motion, show everything immediately ---
  const showAll = prefersReducedMotion || !isVisible;
  const headerVisible = isVisible;

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden border border-white/10 bg-[#0a0a14] relative"
      style={{
        background: 'linear-gradient(135deg, #0a0a14 0%, #0d0d1a 50%, #0a0a14 100%)',
        opacity: fadingOut ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms ease-in-out`,
      }}
    >
      <style>{`
        @keyframes st-row-enter {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes st-header-enter {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes st-punchline-pulse {
          0% { background-color: transparent; }
          30% { background-color: rgba(100, 180, 255, 0.1); }
          70% { background-color: rgba(100, 180, 255, 0.06); }
          100% { background-color: rgba(100, 180, 255, 0.03); }
        }

        @keyframes st-final-glow {
          0% { box-shadow: inset 0 0 0 0 transparent; }
          50% { box-shadow: inset 0 0 20px rgba(100, 180, 255, 0.06); }
          100% { box-shadow: inset 0 0 12px rgba(100, 180, 255, 0.03); }
        }

        @keyframes st-number-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }

        .st-row-animated {
          opacity: 0;
          animation: st-row-enter ${ROW_ENTER_MS}ms ease-out forwards;
        }

        .st-header-animated {
          opacity: 0;
          animation: st-header-enter 300ms ease-out forwards;
        }

        .st-punchline-cell {
          animation: st-punchline-pulse 1.4s ease-out forwards;
        }

        .st-final-row {
          animation: st-final-glow 1s ease-out forwards;
        }

        .st-number-pop {
          animation: st-number-pop 300ms ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .st-row-animated,
          .st-header-animated {
            opacity: 1 !important;
            animation: none !important;
            transform: none !important;
          }
          .st-punchline-cell {
            animation: none !important;
            background-color: rgba(100, 180, 255, 0.04) !important;
          }
          .st-final-row {
            animation: none !important;
          }
        }
      `}</style>

      <div className="overflow-x-auto" style={{ overflowY: 'hidden' }}>
        <table
          className="w-full border-collapse"
          aria-label="Compression layers required by data size — logarithmic scaling from kilobytes to exabytes"
        >
          <thead>
            <tr
              className={
                headerVisible && !showAll ? 'st-header-animated' : ''
              }
              style={{ opacity: showAll ? 1 : undefined }}
            >
              <th
                scope="col"
                className="text-right px-3 sm:px-4 md:px-6 py-3 text-[10px] sm:text-xs font-medium tracking-widest uppercase"
                style={{
                  color: 'rgba(160, 175, 220, 0.55)',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  borderBottom: '1px solid rgba(120, 140, 200, 0.12)',
                }}
              >
                Data Size
              </th>
              <th
                scope="col"
                className="text-left px-3 sm:px-4 md:px-6 py-3 text-[10px] sm:text-xs font-medium tracking-widest uppercase"
                style={{
                  color: 'rgba(160, 175, 220, 0.55)',
                  borderBottom: '1px solid rgba(120, 140, 200, 0.12)',
                }}
              >
                What It Is
              </th>
              <th
                scope="col"
                className="text-center px-3 sm:px-4 md:px-6 py-3 text-[10px] sm:text-xs font-medium tracking-widest uppercase"
                style={{
                  color: 'rgba(160, 175, 220, 0.55)',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  borderBottom: '1px solid rgba(120, 140, 200, 0.12)',
                }}
              >
                Layers
              </th>
            </tr>
          </thead>
          <tbody>
            {TABLE_DATA.map((row, i) => {
              const isRevealed = showAll || i < revealedRows;
              const isPunchline = PUNCHLINE_INDICES.includes(i);
              const isFinal = i === FINAL_INDEX;
              const displayValue = showAll ? row.layers : countedValues[i];
              const animComplete = completedRowsRef.current.has(i);

              // The layer intensity — maps 0..13 to a faint blue bar
              const layerIntensity = row.layers / 13;

              return (
                <tr
                  key={`${restartTrigger}-${i}`}
                  className={[
                    'transition-colors',
                    isRevealed && !showAll ? 'st-row-animated' : '',
                    isFinal && finalRowActive ? 'st-final-row' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    opacity: showAll || animComplete ? 1 : undefined,
                    animationDelay:
                      isRevealed && !showAll ? '0ms' : undefined,
                    borderBottom: '1px solid rgba(120, 140, 200, 0.08)',
                  }}
                >
                  {/* Data Size */}
                  <td
                    className="text-right px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 text-xs sm:text-sm whitespace-nowrap"
                    style={{
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontVariantNumeric: 'tabular-nums',
                      color: 'rgba(200, 210, 240, 0.85)',
                    }}
                  >
                    {row.size}
                  </td>

                  {/* Description */}
                  <td
                    className="text-left px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 text-xs sm:text-sm"
                    style={{
                      color: isPunchline
                        ? 'rgba(200, 215, 245, 0.9)'
                        : 'rgba(180, 190, 220, 0.7)',
                    }}
                  >
                    {row.description}
                  </td>

                  {/* Layers */}
                  <td
                    className={[
                      'text-center px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 relative',
                      isPunchline && punchlineActive ? 'st-punchline-cell' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {/* Faint background bar proportional to layer count */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `linear-gradient(90deg, transparent 0%, rgba(100, 160, 255, ${
                          0.03 + layerIntensity * 0.05
                        }) 50%, transparent 100%)`,
                        opacity: isRevealed ? 1 : 0,
                        transition: 'opacity 400ms ease-out',
                      }}
                    />
                    <span
                      className={[
                        'relative z-10 font-semibold text-sm sm:text-base',
                        isPunchline && punchlineActive ? 'st-number-pop' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{
                        color:
                          isFinal && finalRowActive
                            ? 'rgba(140, 200, 255, 1)'
                            : isPunchline && punchlineActive
                              ? 'rgba(130, 195, 255, 0.95)'
                              : `rgba(${150 + layerIntensity * 80}, ${
                                  180 + layerIntensity * 40
                                }, 255, ${0.7 + layerIntensity * 0.25})`,
                      }}
                    >
                      {displayValue}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Subtle top/bottom edge fades for depth */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(120, 160, 255, 0.1), transparent)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(120, 160, 255, 0.06), transparent)',
        }}
      />
    </div>
  );
}
