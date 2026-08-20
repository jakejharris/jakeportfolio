import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchPostViewCounts,
  refreshPostViewsSnapshot,
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

test('cached refresh logs a stale event before rethrowing a GA failure', async (t) => {
  const logs: string[] = [];
  t.mock.method(console, 'log', (message: string) => logs.push(message));

  const previousPropertyId = process.env.GA_PROPERTY_ID;
  const previousServiceAccountJson = process.env.GA_SERVICE_ACCOUNT_JSON;
  process.env.GA_PROPERTY_ID = '123456789';
  process.env.GA_SERVICE_ACCOUNT_JSON = JSON.stringify({
    client_email: 'views@example.com',
    private_key: 'test-private-key',
  });
  t.after(() => {
    if (previousPropertyId === undefined) {
      delete process.env.GA_PROPERTY_ID;
    } else {
      process.env.GA_PROPERTY_ID = previousPropertyId;
    }
    if (previousServiceAccountJson === undefined) {
      delete process.env.GA_SERVICE_ACCOUNT_JSON;
    } else {
      process.env.GA_SERVICE_ACCOUNT_JSON = previousServiceAccountJson;
    }
  });

  const client: GaDataClient = {
    async runReport() {
      throw new Error('cached GA outage');
    },
  };

  await assert.rejects(
    refreshPostViewsSnapshot(
      '2026-08-20T19:42:00.000Z',
      () => client
    ),
    /cached GA outage/
  );

  assert.equal(logs.length, 1);
  assert.deepEqual(JSON.parse(logs[0]), {
    evt: 'viewcount',
    outcome: 'stale',
    reason: 'cached GA outage',
    ts: JSON.parse(logs[0]).ts,
  });
});

test('cached refresh classifies invalid GA configuration as misconfig', async (t) => {
  const logs: string[] = [];
  t.mock.method(console, 'log', (message: string) => logs.push(message));

  const previousPropertyId = process.env.GA_PROPERTY_ID;
  const previousServiceAccountJson = process.env.GA_SERVICE_ACCOUNT_JSON;
  process.env.GA_PROPERTY_ID = 'not-a-property-id';
  process.env.GA_SERVICE_ACCOUNT_JSON = JSON.stringify({
    client_email: 'views@example.com',
    private_key: 'test-private-key',
  });
  t.after(() => {
    if (previousPropertyId === undefined) {
      delete process.env.GA_PROPERTY_ID;
    } else {
      process.env.GA_PROPERTY_ID = previousPropertyId;
    }
    if (previousServiceAccountJson === undefined) {
      delete process.env.GA_SERVICE_ACCOUNT_JSON;
    } else {
      process.env.GA_SERVICE_ACCOUNT_JSON = previousServiceAccountJson;
    }
  });

  await assert.rejects(
    refreshPostViewsSnapshot('2026-08-20T19:42:00.000Z'),
    /GA_PROPERTY_ID must be a numeric property ID/
  );

  assert.equal(logs.length, 1);
  assert.deepEqual(JSON.parse(logs[0]), {
    evt: 'viewcount',
    outcome: 'misconfig',
    reason: 'GA_PROPERTY_ID must be a numeric property ID',
    ts: JSON.parse(logs[0]).ts,
  });
});
