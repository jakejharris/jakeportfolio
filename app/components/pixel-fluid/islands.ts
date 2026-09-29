// Text the pixel water treats as dry land. Any element marked
// data-fluid-island is traced glyph by glyph from its laid-out characters,
// and the water reads the distance to those outlines, so it can never be drawn
// under or against the letters.

export const ISLAND_SELECTOR = '[data-fluid-island]';
// Frosted glass cards are land whole: the water behind them would only blur
// into a smear.
const GLASS_SELECTOR = '.pageLinkContainer';
const GLASS_MARGIN = 6;

/** Distance to the nearest land for a document-space box, sampled on a grid. */
export interface IslandField {
  left: number;
  top: number;
  /** CSS px per sample. */
  step: number;
  cols: number;
  rows: number;
  /** CSS px from each sample's center to the nearest land. */
  dist: Float32Array;
}

// Coarser than a device pixel and finer than a lattice cell. The water only
// needs to know which 18px cells come near the ink.
const SAMPLE_STEP = 3;
// Beyond this the water ignores land, so the grid stops here. It has to cover
// the engine's beach, shelf and cell slack (under 100px).
const ISLAND_REACH = 140;
// The outline grows by this share of the font size before the water measures
// it: big type keeps a wider beach than small type.
const MARGIN_PER_FONT_SIZE = 0.2;
const MIN_MARGIN = 4;
const FAR = 1e20;

interface Glyph {
  text: string;
  x: number;
  top: number;
  font: string;
  ascent: number;
  margin: number;
}

function casedText(text: string, transform: string) {
  if (transform === 'uppercase') return text.toUpperCase();
  if (transform === 'lowercase') return text.toLowerCase();
  return text;
}

function glyphsOf(element: Element, ctx: CanvasRenderingContext2D, glyphs: Glyph[]) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    const value = node.nodeValue ?? '';
    if (!parent || !value.trim()) continue;
    const style = getComputedStyle(parent);
    const fontSize = parseFloat(style.fontSize) || 16;
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const margin = Math.max(MIN_MARGIN, fontSize * MARGIN_PER_FONT_SIZE);
    ctx.font = font;
    const metrics = ctx.measureText('Hg');
    const ascent = metrics.fontBoundingBoxAscent || fontSize * 0.8;
    for (let i = 0; i < value.length; i++) {
      if (!value[i].trim()) continue;
      // Surrogate pairs and combining marks stay one glyph.
      let end = i + 1;
      while (end < value.length && /[̀-ͯ\udc00-\udfff]/.test(value[end])) end++;
      range.setStart(node, i);
      range.setEnd(node, end);
      const rect = range.getClientRects()[0];
      if (rect && rect.width > 0) {
        glyphs.push({
          text: casedText(value.slice(i, end), style.textTransform),
          x: rect.left + window.scrollX,
          top: rect.top + window.scrollY,
          font,
          ascent,
          margin,
        });
      }
      i = end - 1;
    }
  }
}

/**
 * Exact 1D squared distance transform (Felzenszwalb and Huttenlocher), in
 * place over `f` with `stride` between samples.
 */
function transform1d(
  f: Float64Array,
  offset: number,
  stride: number,
  n: number,
  out: Float64Array,
  v: Int32Array,
  z: Float64Array
) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    const fq = f[offset + q * stride] + q * q;
    let s = (fq - (f[offset + v[k] * stride] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (fq - (f[offset + v[k] * stride] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    out[q] = dq * dq + f[offset + v[k] * stride];
  }
  for (let q = 0; q < n; q++) f[offset + q * stride] = out[q];
}

/**
 * Euclidean distance, in samples, from every cell of a cols x rows mask to the
 * nearest set cell. Unset everywhere gives very large distances.
 */
export function distanceField(mask: Uint8Array, cols: number, rows: number): Float32Array {
  const f = new Float64Array(cols * rows);
  for (let i = 0; i < f.length; i++) f[i] = mask[i] ? 0 : FAR;
  const n = Math.max(cols, rows);
  const out = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < cols; x++) transform1d(f, x, cols, rows, out, v, z);
  for (let y = 0; y < rows; y++) transform1d(f, y * cols, 1, cols, out, v, z);
  const dist = new Float32Array(cols * rows);
  for (let i = 0; i < f.length; i++) dist[i] = Math.sqrt(f[i]);
  return dist;
}

/**
 * Trace every island on the page: the glyphs of marked text, and, for the
 * page's own water (the default selector), its glass cards whole. Null when
 * there is none.
 */
export function measureIslands(selector = ISLAND_SELECTOR): IslandField | null {
  const elements = document.querySelectorAll(selector);
  const boxes: DOMRect[] = [];
  if (selector === ISLAND_SELECTOR) {
    document.querySelectorAll(GLASS_SELECTOR).forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        boxes.push(new DOMRect(rect.left + window.scrollX, rect.top + window.scrollY, rect.width, rect.height));
      }
    });
  }
  if (!elements.length && !boxes.length) return null;

  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) return null;
  const glyphs: Glyph[] = [];
  elements.forEach((element) => glyphsOf(element, probe, glyphs));
  if (!glyphs.length && !boxes.length) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const g of glyphs) {
    probe.font = g.font;
    const width = probe.measureText(g.text).width;
    minX = Math.min(minX, g.x - g.margin);
    minY = Math.min(minY, g.top - g.margin);
    maxX = Math.max(maxX, g.x + width + g.margin);
    maxY = Math.max(maxY, g.top + g.ascent * 1.5 + g.margin);
  }
  for (const box of boxes) {
    minX = Math.min(minX, box.left - GLASS_MARGIN);
    minY = Math.min(minY, box.top - GLASS_MARGIN);
    maxX = Math.max(maxX, box.right + GLASS_MARGIN);
    maxY = Math.max(maxY, box.bottom + GLASS_MARGIN);
  }

  const step = SAMPLE_STEP;
  const left = Math.floor(minX - ISLAND_REACH);
  const top = Math.floor(minY - ISLAND_REACH);
  const cols = Math.ceil((maxX - minX + ISLAND_REACH * 2) / step);
  const rows = Math.ceil((maxY - minY + ISLAND_REACH * 2) / step);

  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.scale(1 / step, 1 / step);
  ctx.translate(-left, -top);
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  ctx.lineJoin = 'round';
  ctx.textBaseline = 'alphabetic';
  for (const g of glyphs) {
    ctx.font = g.font;
    const baseline = g.top + g.ascent;
    ctx.lineWidth = g.margin * 2;
    ctx.strokeText(g.text, g.x, baseline);
    ctx.fillText(g.text, g.x, baseline);
  }
  for (const box of boxes) {
    ctx.fillRect(box.left - GLASS_MARGIN, box.top - GLASS_MARGIN, box.width + GLASS_MARGIN * 2, box.height + GLASS_MARGIN * 2);
  }

  const alpha = ctx.getImageData(0, 0, cols, rows).data;
  const mask = new Uint8Array(cols * rows);
  for (let i = 0; i < mask.length; i++) mask[i] = alpha[i * 4 + 3] > 64 ? 1 : 0;

  const dist = distanceField(mask, cols, rows);
  for (let i = 0; i < dist.length; i++) dist[i] *= step;
  return { left, top, step, cols, rows, dist };
}

/** Distance in CSS px from a document point to the nearest land. */
export function islandDistance(field: IslandField | null, x: number, y: number) {
  if (!field) return Infinity;
  const col = Math.floor((x - field.left) / field.step);
  const row = Math.floor((y - field.top) / field.step);
  if (col < 0 || row < 0 || col >= field.cols || row >= field.rows) return Infinity;
  return field.dist[row * field.cols + col];
}
