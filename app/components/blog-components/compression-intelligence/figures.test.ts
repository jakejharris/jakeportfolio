import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONTEXT_BYTES,
  DRIFT_CELLS,
  DRIFT_KEPT,
  DRIFT_NOISE,
  FULL_READ_TOKENS,
  GRADUATED_TOKENS,
  HAIKU_PER_SONNET,
  HAIKU_READS,
  HAIKU_RETURNS,
  LOG_LENGTH,
  MATCHES,
  PASSES,
  PYRAMID_SHAPES,
  REPO,
  RELEVANT_COUNT,
  SCALE_ROWS,
  SED_LINES,
  SONNET_READS,
  STEPS,
  TOKENS_PER_CELL,
  TOKENS_PER_READ_CELL,
  ancestorOf,
  buildLog,
  cellOfLine,
  descent,
  driftCells,
  formatBytes,
  keptAfter,
  layersFor,
  parentOf,
  savedShare,
  signalShare,
} from './figures';

test('the log is 500 lines, and 15 of them explain the bug', () => {
  const log = buildLog();
  assert.equal(log.length, LOG_LENGTH);
  assert.equal(log.filter((line) => line.relevant).length, RELEVANT_COUNT);
  assert.equal(RELEVANT_COUNT, 15);
  assert.deepEqual(
    log.map((line) => line.n),
    Array.from({ length: LOG_LENGTH }, (_, i) => i + 1)
  );
  assert.equal(signalShare(LOG_LENGTH), 3);
  assert.equal(signalShare(RELEVANT_COUNT), 100);
});

test('each Haiku reads 4,000 tokens and returns 300; each Sonnet reads five replies', () => {
  assert.equal(HAIKU_READS / TOKENS_PER_CELL, 40);
  assert.equal(HAIKU_RETURNS / TOKENS_PER_CELL, 3);
  assert.equal(SONNET_READS, HAIKU_PER_SONNET * HAIKU_RETURNS);
  assert.equal(SONNET_READS, 1500);
});

test('reading every file costs 15,000 tokens; tree, rg and sed cost about 670', () => {
  const cells = REPO.reduce((sum, file) => sum + file.cells, 0);
  assert.equal(cells * TOKENS_PER_READ_CELL, FULL_READ_TOKENS);
  const graduated = STEPS.reduce((sum, step) => sum + step.cells, 0) * TOKENS_PER_READ_CELL;
  assert.ok(Math.abs(graduated - GRADUATED_TOKENS) <= TOKENS_PER_READ_CELL / 2);
  assert.equal(savedShare(), 95);
});

test('rg and sed point at lines that exist, and sed prints the lines around 142', () => {
  for (const [file, line] of MATCHES) {
    assert.ok(cellOfLine(line) < REPO[file].cells, `${REPO[file].path}:${line}`);
  }
  assert.ok(MATCHES.some(([file, line]) => file === 0 && line === 142));
  const sed = STEPS.find((step) => step.id === 'sed');
  assert.equal(cellOfLine(SED_LINES[1]) - cellOfLine(SED_LINES[0]) + 1, sed?.cells);
  assert.ok(SED_LINES[0] <= 142 && 142 <= SED_LINES[1]);
  assert.equal(STEPS.find((step) => step.id === 'rg')?.cells, MATCHES.length);
});

test("the hero's traceback fails inside process_data, in the lines sed prints", () => {
  const frame = buildLog().find((line) => line.text.includes('models/user.py'));
  const failing = Number(frame?.text.match(/line (\d+)/)?.[1]);
  // The definition is at 142, so the line that raised comes after it.
  assert.ok(failing > 142 && failing <= SED_LINES[1], `line ${failing}`);
});

test('every pyramid layer is ten to one, each group under the cell it becomes', () => {
  const sizes = PYRAMID_SHAPES.map((shape) => shape.cols * shape.rows);
  assert.deepEqual(sizes, [1000, 100, 10, 1]);
  for (let layer = 0; layer < PYRAMID_SHAPES.length - 1; layer++) {
    const shape = PYRAMID_SHAPES[layer];
    const above = PYRAMID_SHAPES[layer + 1];
    const children = new Map<string, number>();
    for (let row = 0; row < shape.rows; row++) {
      for (let col = 0; col < shape.cols; col++) {
        const parent = parentOf(shape, col, row);
        assert.ok(parent.col < above.cols && parent.row < above.rows);
        const key = `${parent.col},${parent.row}`;
        children.set(key, (children.get(key) ?? 0) + 1);
      }
    }
    assert.equal(children.size, above.cols * above.rows);
    for (const count of children.values()) assert.equal(count, 10);
  }
  assert.deepEqual(ancestorOf(PYRAMID_SHAPES, 0, 49, 19, 3), { col: 0, row: 0 });
});

test('the scaling table: log₁₀ of the corpus over an 800 KB window, rounded up', () => {
  assert.equal(CONTEXT_BYTES, 200_000 * 4);
  assert.deepEqual(
    SCALE_ROWS.map((row) => layersFor(row.bytes)),
    [0, 4, 5, 7, 8, 8, 18]
  );
  for (const row of SCALE_ROWS) {
    assert.equal(
      layersFor(row.bytes),
      Math.max(0, Math.ceil(Math.log10(row.bytes / CONTEXT_BYTES) - 1e-9))
    );
    const steps = descent(row.bytes);
    assert.equal(steps.length, layersFor(row.bytes) + 1);
    assert.equal(steps[0], row.size);
  }
  assert.deepEqual(descent(50e12), [
    '50 TB',
    '5 TB',
    '500 GB',
    '50 GB',
    '5 GB',
    '500 MB',
    '50 MB',
    '5 MB',
    '500 KB',
  ]);
  assert.equal(formatBytes(1.5e21), '1.5 ZB');
});

test('eight passes at 95% keep about 66% of the input', () => {
  assert.equal(PASSES, 8);
  assert.equal(Math.round(keptAfter(PASSES)), 66);
  assert.deepEqual(DRIFT_KEPT, [100, 95, 90, 86, 81, 77, 74, 70, 66]);
  assert.equal(DRIFT_NOISE, 34);
});

test('layer-aware passes drop only noise; the same prompt drops signal at the same rate', () => {
  const aware = driftCells('aware');
  const same = driftCells('same');
  assert.equal(aware.length, DRIFT_CELLS);
  // The same hundred cells go into both runs.
  assert.deepEqual(
    aware.map((cell) => cell.noise),
    same.map((cell) => cell.noise)
  );
  for (const cells of [aware, same]) {
    for (let pass = 1; pass <= PASSES; pass++) {
      const alive = cells.filter((cell) => cell.dropped === 0 || cell.dropped > pass);
      assert.equal(alive.length, DRIFT_KEPT[pass]);
    }
  }
  assert.ok(aware.every((cell) => cell.dropped > 0 === cell.noise));
  const signalLeft = (pass: number) =>
    same.filter((cell) => !cell.noise && (cell.dropped === 0 || cell.dropped > pass)).length;
  assert.deepEqual(
    Array.from({ length: PASSES + 1 }, (_, pass) => signalLeft(pass)),
    Array.from({ length: PASSES + 1 }, (_, pass) => Math.round(66 * 0.95 ** pass))
  );
});
