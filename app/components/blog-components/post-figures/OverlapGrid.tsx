import type { OverlapGridValue } from '@/app/types/sanity';
import { checkOverlap, overlapCells, type OverlapCell } from '@/app/lib/post-figures';

import { FigureFrame } from './Frame';

const COLUMNS = 10;
const UNIT = 10;
const CELL = 7.4;
const INSET = (UNIT - CELL) / 2;

/** One grid of questions: misses filled with the accent, shared misses ringed. */
function Grid({ cells, shows }: { cells: OverlapCell[]; shows: (cell: OverlapCell) => boolean }) {
  const rows = Math.ceil(cells.length / COLUMNS);
  return (
    <svg viewBox={`0 0 ${COLUMNS * UNIT} ${rows * UNIT}`} aria-hidden="true" focusable="false">
      {cells.map((cell, index) => {
        const x = (index % COLUMNS) * UNIT;
        const y = Math.floor(index / COLUMNS) * UNIT;
        const missed = shows(cell);
        return (
          <g key={index}>
            <rect
              x={x + INSET}
              y={y + INSET}
              width={CELL}
              height={CELL}
              rx={0.8}
              className={missed ? 'pf-cell-miss' : 'pf-cell'}
            />
            {missed && cell === 'both' && (
              <rect x={x + 0.45} y={y + 0.45} width={UNIT - 0.9} height={UNIT - 0.9} rx={1.4} className="pf-cell-ring" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Two checkers that each miss some of the same set of questions, and what
 * is left when each checks the other: only the misses they share.
 */
export default function OverlapGrid({ value }: { value: OverlapGridValue }) {
  const { total, aMisses, bMisses, shared } = value;
  if (checkOverlap(value) !== true) return null;
  const cells = overlapCells(total, aMisses, bMisses, shared);
  const aName = value.aName || 'A';
  const bName = value.bName || 'B';
  const bothLabel = value.bothLabel || 'Missed by Both';
  const illustration = value.illustration !== false;
  const label = value.label || (illustration ? 'Illustration' : undefined);

  const panels = [
    { name: `${aName} Misses`, count: aMisses, shows: (c: OverlapCell) => c === 'a' || c === 'both' },
    { name: `${bName} Misses`, count: bMisses, shows: (c: OverlapCell) => c === 'b' || c === 'both' },
    { name: bothLabel, count: shared, shows: (c: OverlapCell) => c === 'both' },
  ];

  return (
    <FigureFrame
      kind="overlapGrid"
      title={value.title}
      label={label}
      caption={value.caption}
      sourceTitle={value.sourceTitle}
      sourceUrl={value.sourceUrl}
      sourceDetail={value.sourceDetail}
    >
      <p className="sr-only">
        {illustration ? 'Illustration, not measured data. ' : ''}
        Out of {total} questions, {aName} misses {aMisses} and {bName} misses {bMisses}.
        {' '}
        {shared === 0 ? 'None of their misses are the same' : `${shared} of those misses are the same`}, so
        {' '}
        {shared} {shared === 1 ? 'question is' : 'questions are'} missed by both: {bothLabel.toLowerCase()}.
      </p>
      <div className="pf-overlap" aria-hidden="true">
        {panels.map((panel) => (
          <div key={panel.name} className="pf-panel">
            <Grid cells={cells} shows={panel.shows} />
            <div>
              <p className="pf-panel-name">{panel.name}</p>
              <p className="pf-panel-count">
                <strong className="tabular">{panel.count}</strong>
                <span className="tabular">of {total}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
      <ul className="pf-legend" aria-hidden="true">
        <li>
          <svg viewBox="0 0 10 10">
            <rect x={INSET} y={INSET} width={CELL} height={CELL} rx={0.8} className="pf-cell" />
          </svg>
          Caught
        </li>
        <li>
          <svg viewBox="0 0 10 10">
            <rect x={INSET} y={INSET} width={CELL} height={CELL} rx={0.8} className="pf-cell-miss" />
          </svg>
          Missed
        </li>
        {shared > 0 && (
          <li>
            <svg viewBox="0 0 10 10">
              <rect x={INSET} y={INSET} width={CELL} height={CELL} rx={0.8} className="pf-cell-miss" />
              <rect x={0.45} y={0.45} width={9.1} height={9.1} rx={1.4} className="pf-cell-ring" />
            </svg>
            Missed by Both
          </li>
        )}
      </ul>
    </FigureFrame>
  );
}
