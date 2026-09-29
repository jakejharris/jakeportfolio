import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GLM_V2, V2_HIGHLIGHTS } from './glm-v2';
import GlmV2Measurements, { LatencyTable } from './v2/GlmV2Measurements';
import GlmV2Page from './v2/GlmV2Page';
import GlmV2Multistream from './v2/GlmV2Multistream';

test('RigMark displays literal checkpoint strings without changing source tokens', () => {
  assert.deepEqual(V2_HIGHLIGHTS.map(cell => cell.value), ['87.6', '47.2', '126.1']);
  assert.deepEqual(GLM_V2.rows.map(row => row.display.worst), ['87.5', '47.0', '126.1']);
  assert.deepEqual(GLM_V2.rows.map(row => row.median_text), ['87.609', '47.214', '126.093']);
  assert.equal(GLM_V2.comparison, null);
  assert.equal(GLM_V2.comparison_claim, null);
});

test('new sections render every matrix row, source display strings, units and status reasons', () => {
  const html = renderToStaticMarkup(React.createElement(GlmV2Measurements));
  for (const row of [...GLM_V2.latency, ...GLM_V2.prefill, ...GLM_V2.decode]) {
    assert.ok(html.includes(`data-measurement="${row.id}"`), row.id);
  }
  for (const row of GLM_V2.latency) {
    for (const stats of [row.first_token, row.first_content]) {
      assert.ok(html.includes(`${stats.display!.median} s`));
      assert.ok(html.includes(`${stats.display!.worst} s`));
    }
  }
  assert.ok(html.includes('1322.6')); assert.ok(html.includes('1407.7'));
  assert.ok(html.includes('Max (default)')); assert.ok(html.includes('Low'));
  assert.ok(html.includes('lower is better')); assert.ok(html.includes('higher is better'));
  assert.ok(html.includes('Not measured'));
  assert.ok(!html.includes('Concurrent requests queue'));
  assert.ok(!/thinking off|Pending|\bC[248]\b|toFixed/.test(html));
  assert.ok(!html.includes('0.1536546119605191'));
});

test('rendering preserves supplied precision and censored-answer qualifications', () => {
  const row = structuredClone(GLM_V2.latency[0]);
  // If the producer supplies different display precision, the view must not format it.
  row.first_token.display!.median = '0.1500';
  row.first_content.conditional = true;
  let html = renderToStaticMarkup(React.createElement(LatencyTable, { rows: [row], mode: 'Max (default)' }));
  assert.ok(html.includes('0.1500 s'));
  assert.ok(html.includes('budget-censored requests excluded'));
  row.first_content.display = null;
  html = renderToStaticMarkup(React.createElement(LatencyTable, { rows: [row], mode: 'Max (default)' }));
  assert.ok(html.includes('Not observed'));
  assert.ok(html.includes('not observed within the response budget'));
});

test('candidate preview suppresses stale comparisons and quality claims', () => {
  const html = renderToStaticMarkup(React.createElement(GlmV2Page));
  assert.ok(html.includes('Earlier sealed single-stream checkpoint'));
  assert.ok(html.includes('5.5 GiB memory envelope'));
  assert.ok(html.includes('ESTIMATE'));
  assert.ok(html.includes('v2.0.1'));
  assert.equal((html.match(/data-multistream=/g) ?? []).length, 3);
  assert.ok(!/above the line|below the line|Published first set|byte-identical|CONTENDERS ONLY|overall PASS/.test(html));
  assert.ok(!/\u2014|\/home\/|\bW_[A-Z]\b/.test(html));
});

test('multi-stream view never reformats supplied strings or derives a scaling factor', () => {
  const row = structuredClone(GLM_V2.multistream[0]);
  row.status = 'measured';
  row.aggregate = { display: { median: '901.2000', worst: '901.1000', values: ['901.1000', '901.2000', '901.3000'] }, trace: [] };
  const html = renderToStaticMarkup(React.createElement(GlmV2Multistream, { rows: [row] }));
  assert.ok(html.includes('901.2000'));
  assert.ok(html.includes('901.1000'));
  assert.ok(html.includes('Aggregate tok/s'));
  assert.ok(!/toFixed|speedup|\u00d7|beats/.test(html));
});
