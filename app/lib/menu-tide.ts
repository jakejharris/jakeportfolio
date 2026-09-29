// The mobile menu arrives as a tide. Lattice cells go under in order of their
// distance from where the menu was opened, behind a band of checkerboard
// foam, so the page is covered one cell at a time. Run backwards, the same
// front drains back to its origin; inverted, it opens a hole from a tapped
// link onto the next page.

import { TIDE_CELL } from './pixel-tide';

/** Still showing the page. */
export const PAGE = 0;
/** Covered, at the leading edge: every other cell, a checkerboard. */
export const LEAD = 1;
/** Covered, just behind the front. */
export const FOAM = 2;
/** Covered: the menu. */
export const SEA = 3;

// Band widths, in cells. The lead band is half covered, so the page shows
// through it as a checkerboard.
const LEAD_BAND = 2;
const FOAM_BAND = 1.5;
// How far, in cells, a cell's distance is nudged so the front is ragged
// like water rather than a drawn circle. Fixed per cell: the same shoreline
// every time.
const JITTER = 0.8;

export interface TideField {
  cols: number;
  rows: number;
  cell: number;
  /** Per cell: roughened distance from its center to the origin, in px. */
  dist: Float32Array;
  /** How far the front travels between nothing covered and all covered. */
  span: number;
}

// Deterministic noise in [0, 1) per cell.
function noise(col: number, row: number) {
  let h = Math.imul(col + 1, 374761393) ^ Math.imul(row + 1, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Distances for a tide from (x, y) over a width x height viewport. */
export function tideField(width: number, height: number, x: number, y: number, cell = TIDE_CELL): TideField {
  const cols = Math.max(1, Math.ceil(width / cell));
  const rows = Math.max(1, Math.ceil(height / cell));
  const dist = new Float32Array(cols * rows);
  let far = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const exact = Math.hypot(col * cell + cell / 2 - x, row * cell + cell / 2 - y);
      const d = Math.max(0, exact + (noise(col, row) - 0.5) * JITTER * cell);
      dist[row * cols + col] = d;
      if (d > far) far = d;
    }
  }
  return { cols, rows, cell, dist, span: far + (LEAD_BAND + FOAM_BAND) * cell + 2 };
}

/**
 * Fill `out` with each cell's state when the front has travelled `travel` of
 * the way out from the origin (0 = at the origin, 1 = past the far corner).
 * A flood covers what the front has passed; a hole (the menu leaving through
 * a link) uncovers it. The foam sits on the menu's side of the edge either
 * way.
 */
export function tideCells(field: TideField, travel: number, hole: boolean, out: Uint8Array) {
  const { dist, cell } = field;
  const lead = LEAD_BAND * cell;
  const foam = FOAM_BAND * cell;
  const reach = Math.min(1, Math.max(0, travel)) * field.span;
  for (let i = 0; i < dist.length; i++) {
    // How far this cell sits on the page's side of the lead band's inner
    // edge. At no travel every cell is past the lead band on one side, at
    // full travel on the other.
    const side = hole ? reach - foam - 1 - dist[i] : dist[i] - reach + lead + 1;
    if (side >= lead) out[i] = PAGE;
    else if (side >= 0) {
      const col = i % field.cols;
      const row = (i - col) / field.cols;
      out[i] = (col + row) % 2 === 0 ? LEAD : PAGE;
    } else if (side >= -foam) out[i] = FOAM;
    else out[i] = SEA;
  }
}

/**
 * clip-path covering every cell that is not PAGE: one rectangle per run of
 * covered cells in a row, in px from the viewport's top left corner.
 */
export function tidePath(cells: Uint8Array, cols: number, rows: number, cell = TIDE_CELL) {
  let d = '';
  for (let row = 0; row < rows; row++) {
    let col = 0;
    while (col < cols) {
      if (cells[row * cols + col] === PAGE) {
        col++;
        continue;
      }
      const start = col;
      while (col < cols && cells[row * cols + col] !== PAGE) col++;
      const w = (col - start) * cell;
      d += `M${start * cell} ${row * cell}h${w}v${cell}h${-w}z`;
    }
  }
  // A lone move covers nothing; an empty path would not parse and would
  // leave the whole menu showing.
  return `path('${d || 'M0 0'}')`;
}
