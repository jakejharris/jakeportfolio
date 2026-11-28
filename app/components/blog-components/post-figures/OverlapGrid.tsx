import type { OverlapGridValue } from '@/app/types/sanity';
import { checkOverlap, overlapCells, type OverlapCell } from '@/app/lib/post-figures';

import { FigureFrame } from './Frame';

const COLUMNS = 10;
const UNIT = 10;
const CELL = 7.4;
const INSET = (UNIT - CELL) / 2;

type Mark = 'miss' | 'both' | 'caught';

/**
 * One grid of questions. The grey cells are one drawing; every marked cell
 * (a miss, a shared miss with its ring, or in the last grid a miss the other
 * checker caught) is its own small drawing over it, so the motion can fade
 * and pulse it on the compositor.
 */
function Grid({ cells, mark }: { cells: OverlapCell[]; mark: (cell: OverlapCell) => Mark | undefined }) {
  const rows = Math.ceil(cells.length / COLUMNS);
  return (
    <div className="pf-grid">
      <svg viewBox={`0 0 ${COLUMNS * UNIT} ${rows * UNIT}`} aria-hidden="true" focusable="false">
        {cells.map((_, index) => (
          <rect
            key={index}
            x={(index % COLUMNS) * UNIT + INSET}
            y={Math.floor(index / COLUMNS) * UNIT + INSET}
            width={CELL}
            height={CELL}
            rx={0.8}
            className="pf-cell"
          />
        ))}
      </svg>
      {cells.map((cell, index) => {
        const kind = mark(cell);
        if (!kind) return null;
        return (
          <svg
            key={index}
            className="pf-hit"
            data-mark={kind}
            viewBox={`0 0 ${UNIT} ${UNIT}`}
            aria-hidden="true"
            focusable="false"
            style={{
              left: `${(index % COLUMNS) * UNIT}%`,
              top: `${(Math.floor(index / COLUMNS) * 100) / rows}%`,
              height: `${100 / rows}%`,
            }}
          >
            <CellMark kind={kind} />
          </svg>
        );
      })}
    </div>
  );
}

function CellMark({ kind }: { kind: Mark }) {
  return (
    <>
      <rect
        x={INSET}
        y={INSET}
        width={CELL}
        height={CELL}
        rx={0.8}
        className={kind === 'caught' ? 'pf-cell-caught' : 'pf-cell-miss'}
      />
      {kind === 'both' && <rect x={0.45} y={0.45} width={UNIT - 0.9} height={UNIT - 0.9} rx={1.4} className="pf-cell-ring" />}
    </>
  );
}

/**
 * Two checkers that each miss some of the same set of questions, and what
 * is left when each checks the other: only the misses they share. In the
 * last grid, the misses the other checker caught stay as outlines.
 *
 * Motion (CSS only, see MotionGate): the marks clear, each checker's misses
 * appear in turn, then the caught ones, and the shared misses pulse once in
 * all three grids before a long rest. The HTML is the settled state.
 */
export default function OverlapGrid({ value }: { value: OverlapGridValue }) {
  const { total, aMisses, bMisses, shared } = value;
  if (checkOverlap(value) !== true) return null;
  const cells = overlapCells(total, aMisses, bMisses, shared);
  const aName = value.aName || 'A';
  const bName = value.bName || 'B';
  const defaultBoth = 'Missed by Both';
  const customBoth =
    typeof value.bothLabel === 'string' && value.bothLabel.trim() && value.bothLabel.trim().toLowerCase() !== defaultBoth.toLowerCase()
      ? value.bothLabel.trim()
      : undefined;
  const bothLabel = customBoth ?? defaultBoth;
  const illustration = value.illustration !== false;
  const label = value.label || (illustration ? 'Illustration' : undefined);

  const caught = aMisses + bMisses - 2 * shared;
  const own = (mine: OverlapCell) => (c: OverlapCell) => (c === 'both' ? 'both' : c === mine ? 'miss' : undefined);
  const panels: Array<{ id: string; name: string; count: number; mark: (c: OverlapCell) => Mark | undefined }> = [
    { id: 'a', name: `${aName} Misses`, count: aMisses, mark: own('a') },
    { id: 'b', name: `${bName} Misses`, count: bMisses, mark: own('b') },
    { id: 'both', name: bothLabel, count: shared, mark: (c) => (c === 'both' ? 'both' : c === 'hit' ? undefined : 'caught') },
  ];

  return (
    <FigureFrame
      kind="overlapGrid"
      motion
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
        {shared} {shared === 1 ? 'question is' : 'questions are'} missed by both
        {customBoth ? `, shown as ${customBoth}` : ''}.
      </p>
      <div className="pf-overlap" aria-hidden="true">
        {panels.map((panel) => (
          <div key={panel.id} className="pf-panel" data-panel={panel.id}>
            <Grid cells={cells} mark={panel.mark} />
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
        {caught > 0 && (
          <li>
            <svg viewBox="0 0 10 10">
              <CellMark kind="caught" />
            </svg>
            Caught by Other
          </li>
        )}
        {shared > 0 && (
          <li>
            <svg viewBox="0 0 10 10">
              <CellMark kind="both" />
            </svg>
            Missed by Both
          </li>
        )}
      </ul>
    </FigureFrame>
  );
}
