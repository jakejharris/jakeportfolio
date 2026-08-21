import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import {
  fetchPostViewCounts,
  refreshPostViewsSnapshot,
  type GaDataClient,
  type GaRunReportRequest,
} from './post-views';

const GA_ENV_KEYS = [
  'GA_PROPERTY_ID',
  'GA_SERVICE_ACCOUNT_JSON',
  'GA_PROPERTY_TIME_ZONE',
] as const;

function stubGaCredentials(
  t: TestContext,
  overrides: Record<string, string> = {}
) {
  const previous = GA_ENV_KEYS.map((key) => [key, process.env[key]] as const);
  process.env.GA_PROPERTY_ID = '123456789';
  process.env.GA_SERVICE_ACCOUNT_JSON = JSON.stringify({
    client_email: 'views@example.com',
    private_key: 'test-private-key',
  });
  delete process.env.GA_PROPERTY_TIME_ZONE;
  for (const [key, value] of Object.entries(overrides)) {
    process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

test('maps the batched report and sums both post path variants', async (t) => {
  stubGaCredentials(t);
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
    '2026-08-20T19:42:00.000Z',
    new Date('2026-08-21T15:00:00.000Z')
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
    { startDate: '2026-08-21', endDate: '2026-08-21' },
  ]);
});

test('returns an empty map when the GA client fails', async (t) => {
  stubGaCredentials(t);
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
    '2026-08-20T19:42:00.000Z',
    new Date('2026-08-21T15:00:00.000Z')
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
  stubGaCredentials(t);
  const logs: string[] = [];
  t.mock.method(console, 'log', (message: string) => logs.push(message));

  const client: GaDataClient = {
    async runReport() {
      throw new Error('cached GA outage');
    },
  };

  await assert.rejects(
    refreshPostViewsSnapshot(
      '2026-08-20T19:42:00.000Z',
      () => client,
      new Date('2026-08-21T15:00:00.000Z')
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
  stubGaCredentials(t, { GA_PROPERTY_ID: 'not-a-property-id' });
  const logs: string[] = [];
  t.mock.method(console, 'log', (message: string) => logs.push(message));

  await assert.rejects(
    refreshPostViewsSnapshot(
      '2026-08-20T19:42:00.000Z',
      undefined,
      new Date('2026-08-21T15:00:00.000Z')
    ),
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

test('uses the property-local cutover day for the first eligible GA day', async (t) => {
  stubGaCredentials(t);
  let request: GaRunReportRequest | undefined;
  const client: GaDataClient = {
    async runReport(receivedRequest) {
      request = receivedRequest;
      return { rows: [] };
    },
  };

  // 2026-08-21T02:30:00Z is still August 20 in America/Chicago, so the first
  // eligible GA day is August 21, not August 22.
  const counts = await fetchPostViewCounts(
    client,
    '123456789',
    '2026-08-21T02:30:00.000Z',
    new Date('2026-08-22T15:00:00.000Z')
  );

  assert.deepEqual(counts, {});
  assert.deepEqual(request?.dateRanges, [
    { startDate: '2026-08-21', endDate: '2026-08-22' },
  ]);
});

test('returns a fresh empty snapshot without calling GA before the eligible day', async (t) => {
  stubGaCredentials(t);
  const now = new Date('2026-08-21T02:30:00.000Z'); // August 20 in America/Chicago
  let gaCalled = false;
  const client: GaDataClient = {
    async runReport() {
      gaCalled = true;
      return { rows: [] };
    },
  };

  const snapshot = await refreshPostViewsSnapshot(
    '2026-08-21T02:30:00.000Z',
    () => client,
    now
  );

  assert.equal(gaCalled, false);
  assert.deepEqual(snapshot, {
    counts: {},
    lastSuccessfulFetchAt: now.toISOString(),
  });
});

test('emits an explicit one-day range once the eligible day starts locally', async (t) => {
  stubGaCredentials(t);
  let request: GaRunReportRequest | undefined;
  const client: GaDataClient = {
    async runReport(receivedRequest) {
      request = receivedRequest;
      return {
        rows: [
          {
            dimensionValues: [
              { value: 'jakejh.com' },
              { value: '/posts/first-post/' },
            ],
            metricValues: [{ value: '5' }],
          },
        ],
      };
    },
  };

  // 2026-08-21T06:00:00Z is 01:00 Central on August 21: the eligible day began.
  const now = new Date('2026-08-21T06:00:00.000Z');
  const snapshot = await refreshPostViewsSnapshot(
    '2026-08-21T02:30:00.000Z',
    () => client,
    now
  );

  assert.deepEqual(request?.dateRanges, [
    { startDate: '2026-08-21', endDate: '2026-08-21' },
  ]);
  assert.deepEqual(snapshot, {
    counts: { 'first-post': 5 },
    lastSuccessfulFetchAt: now.toISOString(),
  });
});

test('classifies an invalid cutover timestamp as misconfiguration', async (t) => {
  stubGaCredentials(t);
  const logs: string[] = [];
  t.mock.method(console, 'log', (message: string) => logs.push(message));

  await assert.rejects(
    refreshPostViewsSnapshot(
      'not-a-date',
      undefined,
      new Date('2026-08-21T15:00:00.000Z')
    ),
    /viewsCutoverAt is missing or invalid/
  );

  assert.equal(logs.length, 1);
  assert.deepEqual(JSON.parse(logs[0]), {
    evt: 'viewcount',
    outcome: 'misconfig',
    reason: 'viewsCutoverAt is missing or invalid',
    ts: JSON.parse(logs[0]).ts,
  });
});

test('classifies an invalid GA_PROPERTY_TIME_ZONE as misconfiguration', async (t) => {
  stubGaCredentials(t, { GA_PROPERTY_TIME_ZONE: 'Not/AZone' });
  const logs: string[] = [];
  t.mock.method(console, 'log', (message: string) => logs.push(message));

  await assert.rejects(
    refreshPostViewsSnapshot(
      '2026-08-20T19:42:00.000Z',
      undefined,
      new Date('2026-08-21T15:00:00.000Z')
    ),
    /GA_PROPERTY_TIME_ZONE is invalid/
  );

  assert.equal(logs.length, 1);
  assert.deepEqual(JSON.parse(logs[0]), {
    evt: 'viewcount',
    outcome: 'misconfig',
    reason: 'GA_PROPERTY_TIME_ZONE is invalid',
    ts: JSON.parse(logs[0]).ts,
  });
});
