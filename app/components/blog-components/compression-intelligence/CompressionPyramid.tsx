'use client';

// "The structure mirrors the three-tier agent hierarchy, generalized." A
// thousand chunks of corpus at the base; every chunk compresses at the same
// time, ten to one, into the layer above, and again, until one cell is left
// for the frontier model. Each layer keeps something different, and every
// layer stays: point at a cell, or pick a layer, to see everything under it,
// which is where the model zooms in when the top is not enough.

import { useEffect, useRef, useState } from 'react';

import { rgba, useCanvasColors } from '../canvas-theme';
import {
  Choice,
  DIM,
  FAINT,
  Figure,
  Replay,
  useAnimator,
  useBox,
  useFontsReady,
  useReducedMotion,
  useSeen,
} from './figure';
import { PYRAMID_LAYERS, PYRAMID_SHAPES, ancestorOf, parentOf, type PyramidShape } from './figures';
import { dotted, easeInOut, easeOut, lerp, monoFamily, prepare, span } from './lattice';

const STORY_MS = 6400;
const APPEAR: [number, number] = [0.02, 0.16];
const FLOWS: Array<[number, number]> = [
  [0.2, 0.4],
  [0.44, 0.6],
  [0.64, 0.78],
];
const READ: [number, number] = [0.84, 0.96];

const CHUNKS = PYRAMID_SHAPES[0].cols * PYRAMID_SHAPES[0].rows;

type Part = 'rest' | 0 | 1 | 2 | 3;
const PARTS: Part[] = ['rest', 0, 1, 2, 3];

const CAPTIONS: Record<Part, string> = {
  rest: 'Every chunk in a layer compresses at the same time, ten to one, and each layer keeps something different. Every layer stays, so the top can zoom back in.',
  0: 'One chunk of the corpus, and every cell above it that carries it.',
  1: `One early cell holds 10 chunks, kept as ${PYRAMID_LAYERS[1].keeps}.`,
  2: `One middle cell holds 100 chunks, kept as ${PYRAMID_LAYERS[2].keeps}.`,
  3: `The top holds all ${CHUNKS.toLocaleString('en-US')} chunks, kept as ${PYRAMID_LAYERS[3].keeps}.`,
};

// What each layer keeps, in lines that fit beside it. The narrow figure
// has room for a word or two.
const KEEPS = {
  wide: [
    ['small models,', 'every chunk at once'],
    ['facts and entities'],
    ['relationships, causal chains'],
    ['reasoning patterns, structure'],
  ],
  narrow: [['1,000 chunks'], ['facts, entities'], ['relationships'], ['reasoning']],
};

const COUNTS = ['1,000 chunks', '100 cells', '10 cells', '1 cell'];

interface LayerRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Layout {
  width: number;
  height: number;
  wide: boolean;
  pitch: number;
  cell: number;
  shapes: PyramidShape[];
  layers: LayerRect[];
  marker: { x: number; y: number; size: number };
  left: number;
  right: number;
  font: number;
}

interface Target {
  layer: number;
  col: number;
  row: number;
}

/** The cell each layer button zooms to: those above a chunk near the middle of the base. */
const PICKS: Target[] = PYRAMID_SHAPES.map((_, layer) => ({
  layer,
  ...ancestorOf(PYRAMID_SHAPES, 0, 24, 10, layer),
}));

const LAYER_OPTIONS = PYRAMID_LAYERS.map((layer, index) => ({
  value: String(index),
  label: index === 0 ? 'Raw' : layer.name,
}));

function layoutFor(width: number, height: number): Layout {
  // Wide figures set the words beside the base, which needs about 600 px.
  const wide = width >= 600;
  const shapes = PYRAMID_SHAPES;
  const pitch = 5;
  const gaps = [26, 24, 24];
  const layers: LayerRect[] = [];
  let bottom = height - (wide ? 14 : 28);
  shapes.forEach((shape, l) => {
    const w = shape.cols * pitch - 1;
    const h = shape.rows * pitch - 1;
    const rect = { x: Math.round((width - w) / 2), y: bottom - h, w, h };
    layers.push(rect);
    bottom = rect.y - (gaps[l] ?? 0);
  });
  const top = layers[layers.length - 1];
  const size = 11;
  const markerY = top.y - 24 - size;
  // Wide figures set the words beside the pyramid; narrow ones square them
  // to its base, with the base's own words underneath.
  return {
    width,
    height,
    wide,
    pitch,
    cell: pitch - 1,
    shapes,
    layers,
    marker: { x: Math.round(width / 2 - size / 2), y: markerY, size },
    left: wide ? 20 : layers[0].x,
    right: wide ? width - 20 : layers[0].x + layers[0].w,
    font: wide ? 11 : 10,
  };
}

function cellPos(layout: Layout, layer: number, col: number, row: number) {
  const rect = layout.layers[layer];
  return { x: rect.x + col * layout.pitch, y: rect.y + row * layout.pitch };
}

/** The layer and cell under a point, with some slack around small layers. */
function targetAt(layout: Layout, x: number, y: number): Target | null {
  for (let l = layout.layers.length - 1; l >= 0; l--) {
    const rect = layout.layers[l];
    const shape = layout.shapes[l];
    const slack = Math.max(0, 12 - rect.h) / 2 + 3;
    if (y < rect.y - slack || y > rect.y + rect.h + slack) continue;
    if (x < rect.x - slack || x > rect.x + rect.w + slack) continue;
    const col = Math.min(shape.cols - 1, Math.max(0, Math.floor((x - rect.x) / layout.pitch)));
    const row = Math.min(shape.rows - 1, Math.max(0, Math.floor((y - rect.y) / layout.pitch)));
    return { layer: l, col, row };
  }
  return null;
}

/** Whether a cell is the target, under it, or above it on its way to the top. */
function related(layout: Layout, target: Target, layer: number, col: number, row: number) {
  if (layer === target.layer) return col === target.col && row === target.row;
  if (layer < target.layer) {
    const above = ancestorOf(layout.shapes, layer, col, row, target.layer - layer);
    return above.col === target.col && above.row === target.row;
  }
  const above = ancestorOf(
    layout.shapes,
    target.layer,
    target.col,
    target.row,
    layer - target.layer
  );
  return above.col === col && above.row === row;
}

/** A little unevenness, so a layer settles like a crowd rather than a block. */
const jitter = (col: number, row: number) => (((col * 7 + row * 13) % 10) / 10) * 0.12;

export default function CompressionPyramid() {
  const colors = useCanvasColors();
  const reduced = useReducedMotion();
  const fontsReady = useFontsReady();
  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionRefs = useRef<Partial<Record<string, HTMLSpanElement | null>>>({});
  const layoutRef = useRef<Layout | null>(null);
  const box = useBox(canvasRef);
  const seen = useSeen(figureRef, 0.5);
  // A cell picked with the buttons or a tap stays until it is released; a
  // mouse over the canvas zooms only while it is there.
  const [picked, setPicked] = useState<Target | null>(null);
  const [hovered, setHovered] = useState<Target | null>(null);
  const target = hovered ?? picked;
  const targetRef = useRef<Target | null>(null);

  const showCaption = (part: Part) => {
    for (const key of PARTS) {
      const element = captionRefs.current[String(key)];
      if (element) element.style.visibility = key === part ? 'visible' : 'hidden';
    }
  };

  const draw = (value: number) => {
    const canvas = canvasRef.current;
    const layout = layoutRef.current;
    if (!canvas || !layout || !colors.ready) return;
    const ctx = prepare(canvas, layout.width, layout.height);
    if (!ctx) return;

    const { fg, accent, isDark } = colors;
    const { cell, shapes, layers } = layout;
    const zoom = targetRef.current;

    const appear = span(value, ...APPEAR);
    const flows = FLOWS.map((range) => span(value, ...range));
    const read = span(value, ...READ);

    // Denser layers are drawn stronger: raw text in the foreground, then
    // the accent at rising strength up to the single top cell.
    const inks = [
      rgba(fg, isDark ? 0.36 : 0.3),
      rgba(accent, 0.45),
      rgba(accent, 0.72),
      rgba(accent, 1),
    ];

    /** How present a layer's cell is: the base fades in, the rest arrive. */
    const presence = (layer: number, col: number, row: number) => {
      if (layer === 0) {
        const at = (1 - row / shapes[0].rows) * 0.6 + jitter(col, row);
        return easeOut(span(appear, at * 0.8, at * 0.8 + 0.3));
      }
      return easeOut(span(flows[layer - 1], 0.7, 1));
    };

    // The pyramid's outline, dotted, from each layer to the next.
    ctx.fillStyle = rgba(fg, isDark ? 0.26 : 0.28);
    for (let l = 0; l < layers.length - 1; l++) {
      const below = layers[l];
      const above = layers[l + 1];
      ctx.globalAlpha = presence(l + 1, 0, 0) * (zoom ? 0.5 : 1);
      if (ctx.globalAlpha <= 0) continue;
      dotted(
        ctx,
        { x: below.x - 3, y: below.y - 4 },
        { x: above.x - 3, y: above.y + above.h + 4 },
        3
      );
      dotted(
        ctx,
        { x: below.x + below.w + 2, y: below.y - 4 },
        { x: above.x + above.w + 2, y: above.y + above.h + 4 },
        3
      );
    }

    // The layers, bottom up.
    shapes.forEach((shape, l) => {
      for (let row = 0; row < shape.rows; row++) {
        for (let col = 0; col < shape.cols; col++) {
          const shown = presence(l, col, row);
          if (shown <= 0) continue;
          const lit = !zoom || related(layout, zoom, l, col, row);
          const { x, y } = cellPos(layout, l, col, row);
          ctx.globalAlpha = shown * (lit ? 1 : 0.18);
          ctx.fillStyle = zoom && lit && l === 0 ? rgba(fg, isDark ? 0.7 : 0.62) : inks[l];
          ctx.fillRect(x, y, cell, cell);
        }
      }
    });

    // Compression in flight: every cell of a layer sends a copy up to the
    // cell it becomes, all at once.
    flows.forEach((flow, l) => {
      if (flow <= 0 || flow >= 1) return;
      const shape = shapes[l];
      ctx.fillStyle = rgba(accent, 1);
      for (let row = 0; row < shape.rows; row++) {
        for (let col = 0; col < shape.cols; col++) {
          const t = easeInOut(span(flow, jitter(col, row), 0.88 + jitter(col, row)));
          if (t <= 0 || t >= 1) continue;
          const from = cellPos(layout, l, col, row);
          const parent = parentOf(shape, col, row);
          const to = cellPos(layout, l + 1, parent.col, parent.row);
          ctx.globalAlpha = lerp(0.35, 0.8, t);
          ctx.fillRect(
            Math.round(lerp(from.x, to.x, t)),
            Math.round(lerp(from.y, to.y, t)),
            cell,
            cell
          );
        }
      }
    });

    // The frontier model reads the top cell, and only that.
    const { marker } = layout;
    const topLayer = layers[layers.length - 1];
    const reading = easeOut(read);
    ctx.globalAlpha = zoom && zoom.layer !== layers.length - 1 ? 0.4 : 1;
    ctx.strokeStyle = rgba(fg, 0.3);
    ctx.lineWidth = 1;
    ctx.strokeRect(marker.x + 0.5, marker.y + 0.5, marker.size - 1, marker.size - 1);
    if (reading > 0) {
      ctx.globalAlpha *= reading;
      ctx.strokeStyle = rgba(accent, 1);
      ctx.strokeRect(marker.x + 0.5, marker.y + 0.5, marker.size - 1, marker.size - 1);
      ctx.fillStyle = rgba(accent, 0.8);
      dotted(
        ctx,
        { x: marker.x + marker.size / 2 - 0.5, y: marker.y + marker.size + 3 },
        { x: marker.x + marker.size / 2 - 0.5, y: topLayer.y - 4 },
        3
      );
    }

    // The target of a zoom, ringed.
    if (zoom) {
      const { x, y } = cellPos(layout, zoom.layer, zoom.col, zoom.row);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = rgba(accent, 0.8);
      ctx.strokeRect(x - 2.5, y - 2.5, cell + 5, cell + 5);
    }

    // Labels: each layer's name, and on a wide figure its size, on the left;
    // what it keeps on the right.
    const family = monoFamily(canvas);
    ctx.font = `${layout.font}px ${family}`;
    ctx.textBaseline = 'middle';
    const lead = layout.font + 4;
    const label = (
      layer: number | 'model',
      name: string,
      size: string,
      keeps: readonly string[],
      y: number,
      shown: number,
      stacked = false
    ) => {
      const focus = !zoom || zoom.layer === layer;
      ctx.globalAlpha = shown * (focus ? 1 : 0.45);
      ctx.textAlign = 'left';
      ctx.fillStyle = rgba(fg, 0.85);
      ctx.fillText(name, layout.left, stacked ? y - lead / 2 : y);
      ctx.fillStyle = rgba(fg, 0.5);
      if (size && stacked) ctx.fillText(size, layout.left, y + lead / 2);
      else if (size) ctx.fillText(size, layout.left + ctx.measureText(`${name}  `).width, y);
      ctx.textAlign = 'right';
      keeps.forEach((text, i) =>
        ctx.fillText(text, layout.right, y + (i - (keeps.length - 1) / 2) * lead)
      );
    };
    const keeps = layout.wide ? KEEPS.wide : KEEPS.narrow;
    label(
      'model',
      'Frontier model',
      '',
      [layout.wide ? 'reads only the top' : 'reads the top'],
      marker.y + marker.size / 2,
      1
    );
    for (let l = layers.length - 1; l >= 1; l--) {
      label(
        l,
        PYRAMID_LAYERS[l].name,
        layout.wide ? COUNTS[l] : '',
        keeps[l],
        layers[l].y + layers[l].h / 2,
        Math.max(0.35, presence(l, 0, 0))
      );
    }
    if (layout.wide) {
      // Two lines, like the words across from it, to stay clear of the base.
      label(0, PYRAMID_LAYERS[0].name, COUNTS[0], keeps[0], layers[0].y + layers[0].h / 2, 1, true);
    } else {
      label(0, PYRAMID_LAYERS[0].name, '', keeps[0], layers[0].y + layers[0].h + 15, 1);
    }
    ctx.globalAlpha = 1;
  };

  const animator = useAnimator(draw, STORY_MS);

  useEffect(() => {
    if (!box) return;
    layoutRef.current = layoutFor(box.width, box.height);
    animator.redraw();
  }, [animator, box, colors, fontsReady]);

  useEffect(() => {
    if (reduced) {
      animator.to(1, true);
      return;
    }
    if (!seen) return;
    const timer = window.setTimeout(() => animator.to(1), 300);
    return () => window.clearTimeout(timer);
  }, [animator, reduced, seen]);

  useEffect(() => {
    targetRef.current = target;
    showCaption(target ? (target.layer as Part) : 'rest');
    animator.redraw();
    // showCaption only touches refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animator, target]);

  const pointAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const layout = layoutRef.current;
    if (!canvas || !layout) return null;
    const rect = canvas.getBoundingClientRect();
    return targetAt(layout, clientX - rect.left, clientY - rect.top);
  };

  const same = (a: Target | null, b: Target | null) =>
    a === b || (!!a && !!b && a.layer === b.layer && a.col === b.col && a.row === b.row);

  return (
    <Figure
      figureRef={figureRef}
      label="A compression pyramid. A thousand chunks of corpus at the base compress ten to one, all at once, into 100 early cells that keep facts and entities, then 10 middle cells that keep relationships and causal chains, then one deep cell that keeps reasoning patterns and structure. The frontier model reads only that top cell, and every layer below is kept so it can zoom back in."
      title="Recursive compression"
      meta="10 to 1 per layer"
      footer={
        <>
          {/* Every caption shares one grid cell, so the figure keeps the
              height of the longest. */}
          <span className="grid flex-1 basis-64">
            {PARTS.map((part) => (
              <span
                key={part}
                ref={(element) => {
                  captionRefs.current[String(part)] = element;
                }}
                className="col-start-1 row-start-1"
                style={{ visibility: part === 'rest' ? 'visible' : 'hidden', color: DIM }}
              >
                {CAPTIONS[part]}
              </span>
            ))}
          </span>
          <span className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="flex items-center gap-2">
              <span style={{ color: FAINT }}>Zoom</span>
              <Choice
                label="Zoom into one layer"
                options={LAYER_OPTIONS}
                value={picked ? String(picked.layer) : null}
                onChange={(layer) => setPicked(PICKS[Number(layer)])}
                onClear={() => setPicked(null)}
              />
            </span>
            <Replay onClick={() => animator.run(0, 1)} />
          </span>
          <span className="sr-only" aria-live="polite">
            {picked ? CAPTIONS[picked.layer as Part] : ''}
          </span>
        </>
      }
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="block h-[300px] w-full touch-manipulation"
        onPointerMove={(event) => {
          if (event.pointerType !== 'mouse') return;
          const next = pointAt(event.clientX, event.clientY);
          setHovered((current) => (same(current, next) ? current : next));
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setHovered(null);
        }}
        onPointerUp={(event) => {
          if (event.pointerType === 'mouse') return;
          const next = pointAt(event.clientX, event.clientY);
          setPicked((current) => (same(current, next) ? null : next));
        }}
      />
    </Figure>
  );
}
