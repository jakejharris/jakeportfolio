// On the pages people read, everything on the page is dry land: every line of
// text, image, card and code block. The shore's water may only use the
// lattice cells that stay clear of all of it, so it can never sit under or
// against the words, whatever the page's layout.

export interface LandRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Land {
  cols: number;
  rows: number;
  /** 1 where a cell comes within the beach of anything on the page. */
  dry: Uint8Array;
  /** px from each cell's center to the nearest dry cell's center, capped. */
  reach: Float32Array;
}

const SOLID_TAGS = new Set([
  'IMG', 'PICTURE', 'VIDEO', 'CANVAS', 'SVG', 'IFRAME', 'OBJECT', 'EMBED',
  'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'HR', 'TABLE', 'PRE',
]);

// A list item's marker sits in the list's left padding, outside its text.
const MARKER_ROOM = 28;

function paints(style: CSSStyleDeclaration) {
  if (style.backgroundImage !== 'none') return true;
  if (style.boxShadow !== 'none') return true;
  const color = style.backgroundColor;
  if (color && color !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(color) && !/\/\s*0\)$/.test(color)) return true;
  return (
    parseFloat(style.borderTopWidth) > 0 ||
    parseFloat(style.borderRightWidth) > 0 ||
    parseFloat(style.borderBottomWidth) > 0 ||
    parseFloat(style.borderLeftWidth) > 0
  );
}

const HEADINGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

/**
 * Boxes of everything visible inside `root`, relative to (originX, originY)
 * in viewport px. A block of running text is land from edge to edge, so the
 * water never gets into the ragged ends of its lines. A heading is land only
 * where its words are, so water may come up beside a short title. Anything
 * that paints a box of its own (image, card, code block) is land whole.
 */
export function measureLand(root: Element, originX: number, originY: number): LandRect[] {
  const rects: LandRect[] = [];
  const add = (rect: DOMRect | DOMRectReadOnly, grow = 0) => {
    if (rect.width <= 0 || rect.height <= 0) return;
    rects.push({
      left: rect.left - originX - grow,
      top: rect.top - originY,
      right: rect.right - originX,
      bottom: rect.bottom - originY,
    });
  };
  const styles = new Map<Element, CSSStyleDeclaration>();
  const styleOf = (element: Element) => {
    let style = styles.get(element);
    if (!style) {
      style = getComputedStyle(element);
      styles.set(element, style);
    }
    return style;
  };
  // The box a run of text flows in: its nearest ancestor that is not inline.
  const blockOf = (element: Element) => {
    let current: Element | null = element;
    while (current && current !== root) {
      if (!styleOf(current).display.startsWith('inline')) return current;
      current = current.parentElement;
    }
    return root;
  };
  const counted = new Set<Element>();
  const range = document.createRange();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue && node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
      const element = node as Element;
      // The water's own layers.
      if (element.hasAttribute('data-water-layer')) return NodeFilter.FILTER_REJECT;
      const tag = element.tagName.toUpperCase();
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE') return NodeFilter.FILTER_REJECT;
      const style = styleOf(element);
      if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
      if (SOLID_TAGS.has(tag) || paints(style)) {
        add(element.getBoundingClientRect());
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_SKIP;
    },
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent) continue;
    const block = blockOf(parent);
    const heading = block.closest('h1, h2, h3, h4, h5, h6');
    if (heading && HEADINGS.has(heading.tagName.toUpperCase()) && root.contains(heading)) {
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) add(rect);
    } else if (!counted.has(block)) {
      counted.add(block);
      const listItem = styleOf(block).display === 'list-item';
      add(block.getBoundingClientRect(), listItem ? MARKER_ROOM : 0);
    }
  }
  return rects;
}

/**
 * Mark every cell of a cols x rows lattice that comes within `beach` px of a
 * rect, then measure how far every other cell is from the nearest marked one
 * (two-pass chamfer, in px, capped at `cap`).
 */
export function rasterizeLand(
  rects: ReadonlyArray<LandRect>,
  cols: number,
  rows: number,
  cell: number,
  beach: number,
  cap: number
): Land {
  const dry = new Uint8Array(cols * rows);
  for (const rect of rects) {
    if (!(rect.right > rect.left && rect.bottom > rect.top)) continue;
    const c0 = Math.max(0, Math.floor((rect.left - beach) / cell));
    const c1 = Math.min(cols - 1, Math.ceil((rect.right + beach) / cell) - 1);
    const r0 = Math.max(0, Math.floor((rect.top - beach) / cell));
    const r1 = Math.min(rows - 1, Math.ceil((rect.bottom + beach) / cell) - 1);
    if (c1 < c0 || r1 < r0) continue;
    for (let row = r0; row <= r1; row++) dry.fill(1, row * cols + c0, row * cols + c1 + 1);
  }

  const reach = new Float32Array(cols * rows);
  for (let i = 0; i < reach.length; i++) reach[i] = dry[i] ? 0 : cap;
  const straight = cell;
  const diagonal = cell * Math.SQRT2;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      let d = reach[i];
      if (d === 0) continue;
      if (col > 0) d = Math.min(d, reach[i - 1] + straight);
      if (row > 0) {
        d = Math.min(d, reach[i - cols] + straight);
        if (col > 0) d = Math.min(d, reach[i - cols - 1] + diagonal);
        if (col < cols - 1) d = Math.min(d, reach[i - cols + 1] + diagonal);
      }
      reach[i] = d;
    }
  }
  for (let row = rows - 1; row >= 0; row--) {
    for (let col = cols - 1; col >= 0; col--) {
      const i = row * cols + col;
      let d = reach[i];
      if (d === 0) continue;
      if (col < cols - 1) d = Math.min(d, reach[i + 1] + straight);
      if (row < rows - 1) {
        d = Math.min(d, reach[i + cols] + straight);
        if (col < cols - 1) d = Math.min(d, reach[i + cols + 1] + diagonal);
        if (col > 0) d = Math.min(d, reach[i + cols - 1] + diagonal);
      }
      reach[i] = Math.min(d, cap);
    }
  }
  return { cols, rows, dry, reach };
}
