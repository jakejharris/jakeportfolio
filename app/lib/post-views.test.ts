import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchPostViewCounts,
  type GaDataClient,
  type GaRunReportRequest,
} from './post-views';

test('maps the batched report and sums both post path variants', async () => {
  let request: GaRunReportRequest | undefined;
  const client: GaDataClient = {
    async runReport(receivedRequest) {
      request = receivedRequest;
      return {
        rows: [
          {
            dimensionValues: [
              { value: 'jakejh.com' },
              { value: '/posts/first-post' },
            ],
            metricValues: [{ value: '3' }],
          },
          {
            dimensionValues: [
              { value: 'www.jakejh.com' },
              { value: '/posts/first-post/' },
            ],
            metricValues: [{ value: '4' }],
          },
          {
            dimensionValues: [
              { value: 'jakejh.com' },
              { value: '/posts/second-post/' },
            ],
            metricValues: [{ value: '2' }],
          },
          {
            dimensionValues: [
              { value: 'preview.vercel.app' },
              { value: '/posts/first-post/' },
            ],
            metricValues: [{ value: '100' }],
          },
          {
            dimensionValues: [
              { value: 'jakejh.com' },
              { value: '/posts/first-post/comments' },
            ],
            metricValues: [{ value: '100' }],
          },
        ],
      };
    },
  };

  const counts = await fetchPostViewCounts(
    client,
    '123456789',
    '2026-08-20T19:42:00.000Z'
  );

  assert.deepEqual(counts, {
    'first-post': 7,
    'second-post': 2,
  });
  assert.equal(request?.property, 'properties/123456789');
  assert.deepEqual(request?.dimensions, [
    { name: 'hostName' },
    { name: 'pagePath' },
  ]);
  assert.deepEqual(request?.metrics, [{ name: 'screenPageViews' }]);
  assert.deepEqual(request?.dateRanges, [
    { startDate: '2026-08-21', endDate: 'today' },
  ]);
});

test('returns an empty map when the GA client fails', async (t) => {
  const logs: string[] = [];
  t.mock.method(console, 'log', (message: string) => logs.push(message));

  const client: GaDataClient = {
    async runReport() {
      throw new Error('mock GA outage');
    },
  };

  const counts = await fetchPostViewCounts(
    client,
    '123456789',
    '2026-08-20T19:42:00.000Z'
  );

  assert.deepEqual(counts, {});
  assert.equal(logs.length, 1);
  assert.deepEqual(JSON.parse(logs[0]), {
    evt: 'viewcount',
    outcome: 'stale',
    reason: 'mock GA outage',
    ts: JSON.parse(logs[0]).ts,
  });
});
