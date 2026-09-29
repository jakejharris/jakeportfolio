import assert from 'node:assert/strict';
import test from 'node:test';
import { GLM_V2, V2_HIGHLIGHTS, v2Percent, v2Throughput } from './glm-v2';

test('candidate display matches the sealed README without changing source tokens', () => {
  const original = JSON.stringify(GLM_V2);
  assert.deepEqual(V2_HIGHLIGHTS.map(cell => cell.value), ['87.6', '47.2', '126.1']);
  assert.deepEqual(GLM_V2.rows.map(row => v2Percent(row.margin_text, row.display?.margin)), ['+4.8%', '-1.6%', '+0.4%']);
  assert.deepEqual(GLM_V2.rows.map(row => v2Throughput(row.worst_text, row.display?.worst)), ['87.5', '47.0', '126.1']);
  assert.deepEqual(GLM_V2.rows.map(row => row.median_text), ['87.609', '47.214', '126.093']);
  assert.equal(JSON.stringify(GLM_V2), original);
});

test('absent display strings use one decimal and signed percentages at render time', () => {
  assert.deepEqual(['87.609', '47.214', '126.093'].map(value => v2Throughput(value)), ['87.6', '47.2', '126.1']);
  assert.deepEqual(['4.7954545454545436', '-1.6375000000000089', '0.39251592356688295'].map(value => v2Percent(value)), ['+4.8%', '-1.6%', '+0.4%']);
  assert.equal(v2Throughput('48.0'), '48.0');
  assert.equal(v2Throughput(), 'Pending');
  assert.equal(v2Percent('0'), '+0.0%');
});

test('provided display strings take precedence over fallback formatting', () => {
  assert.equal(v2Throughput('1.25', '1.2'), '1.2');
  assert.equal(v2Percent('1.25', '+1.2%'), '+1.2%');
});
