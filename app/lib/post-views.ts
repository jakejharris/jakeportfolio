import { GoogleAuth } from 'google-auth-library';
import { unstable_cache } from 'next/cache';

const GA_HOSTNAMES = new Set(['jakejh.com', 'www.jakejh.com']);
const GA_REVALIDATE_SECONDS = 300;
const GA_STALE_AFTER_MS = GA_REVALIDATE_SECONDS * 2 * 1000;
const POST_PATH_PATTERN = /^\/posts\/([^/?#]+)\/?$/;
const ANALYTICS_READ_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

type DimensionValue = { value?: string | null };
type MetricValue = { value?: string | null };

export type GaRunReportResponse = {
  rows?: Array<{
    dimensionValues?: DimensionValue[];
    metricValues?: MetricValue[];
  }>;
};

export type GaRunReportRequest = {
  property: string;
  dateRanges: Array<{ startDate: string; endDate: string }>;
  dimensions: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  dimensionFilter: {
    andGroup: {
      expressions: Array<{
        filter: {
          fieldName: string;
          inListFilter?: { values: string[]; caseSensitive: boolean };
          stringFilter?: {
            matchType: 'BEGINS_WITH';
            value: string;
            caseSensitive: boolean;
          };
        };
      }>;
    };
  };
  limit: string;
};

export interface GaDataClient {
  runReport(request: GaRunReportRequest): Promise<GaRunReportResponse>;
}

export type PostViewCounts = Record<string, number>;

export type PostViewsSnapshot = {
  counts: PostViewCounts;
  lastSuccessfulFetchAt: string | null;
  lastSuccessfulFetchAgeMs: number | null;
  stale: boolean;
};

type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
};

class ViewCountMisconfiguration extends Error {}

const lastSuccessfulSnapshots = new Map<string, {
  counts: PostViewCounts;
  lastSuccessfulFetchAt: string;
}>();
const loggedViewCountFailures = new WeakSet<object>();

function logViewCountFailure(
  outcome: 'stale' | 'misconfig',
  error: unknown
) {
  if (
    (typeof error === 'object' && error !== null) ||
    typeof error === 'function'
  ) {
    if (loggedViewCountFailures.has(error)) {
      return;
    }
    loggedViewCountFailures.add(error);
  }

  console.log(JSON.stringify({
    evt: 'viewcount',
    outcome,
    reason: error instanceof Error ? error.message.slice(0, 200) : 'unknown',
    ts: new Date().toISOString(),
  }));
}

function getGaStartDate(cutoverAt: string): string {
  const cutover = new Date(cutoverAt);
  if (!Number.isFinite(cutover.getTime())) {
    throw new ViewCountMisconfiguration('viewsCutoverAt is missing or invalid');
  }

  // The baseline includes all views through the seed day. GA starts on the
  // following day so that the cutover day cannot be counted twice.
  cutover.setUTCDate(cutover.getUTCDate() + 1);
  return cutover.toISOString().slice(0, 10);
}

function normalizePropertyId(propertyId: string): string {
  const normalized = propertyId.replace(/^properties\//, '').trim();
  if (!/^\d+$/.test(normalized)) {
    throw new ViewCountMisconfiguration('GA_PROPERTY_ID must be a numeric property ID');
  }
  return normalized;
}

function parseServiceAccountJson(value: string): ServiceAccountCredentials {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new ViewCountMisconfiguration('GA_SERVICE_ACCOUNT_JSON is not valid JSON');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('client_email' in parsed) ||
    typeof parsed.client_email !== 'string' ||
    !('private_key' in parsed) ||
    typeof parsed.private_key !== 'string'
  ) {
    throw new ViewCountMisconfiguration(
      'GA_SERVICE_ACCOUNT_JSON is missing client_email or private_key'
    );
  }

  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key,
  };
}

function createGaClient(credentials: ServiceAccountCredentials): GaDataClient {
  const auth = new GoogleAuth({
    credentials,
    scopes: [ANALYTICS_READ_SCOPE],
  });

  return {
    async runReport({ property, ...data }) {
      const response = await auth.request<GaRunReportResponse>({
        url: `https://analyticsdata.googleapis.com/v1beta/${property}:runReport`,
        method: 'POST',
        data,
      });
      return response.data;
    },
  };
}

function buildRunReportRequest(
  propertyId: string,
  cutoverAt: string
): GaRunReportRequest {
  return {
    property: `properties/${normalizePropertyId(propertyId)}`,
    dateRanges: [{ startDate: getGaStartDate(cutoverAt), endDate: 'today' }],
    dimensions: [{ name: 'hostName' }, { name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: 'hostName',
              inListFilter: {
                values: [...GA_HOSTNAMES],
                caseSensitive: false,
              },
            },
          },
          {
            filter: {
              fieldName: 'pagePath',
              stringFilter: {
                matchType: 'BEGINS_WITH',
                value: '/posts/',
                caseSensitive: true,
              },
            },
          },
        ],
      },
    },
    limit: '100000',
  };
}

export function parsePostViewCounts(response: GaRunReportResponse): PostViewCounts {
  const counts = new Map<string, number>();

  for (const row of response.rows ?? []) {
    const hostname = row.dimensionValues?.[0]?.value?.toLowerCase();
    const pagePath = row.dimensionValues?.[1]?.value;
    const rawCount = row.metricValues?.[0]?.value;

    if (!hostname || !GA_HOSTNAMES.has(hostname) || !pagePath) {
      continue;
    }

    const pathMatch = pagePath.match(POST_PATH_PATTERN);
    const count = Number(rawCount);
    if (!pathMatch || !Number.isFinite(count) || count < 0) {
      continue;
    }

    const slug = pathMatch[1];
    counts.set(slug, (counts.get(slug) ?? 0) + count);
  }

  return Object.fromEntries(counts);
}

async function runPostViewReport(
  client: GaDataClient,
  propertyId: string,
  cutoverAt: string
): Promise<PostViewCounts> {
  const response = await client.runReport(
    buildRunReportRequest(propertyId, cutoverAt)
  );
  return parsePostViewCounts(response);
}

export async function fetchPostViewCounts(
  client: GaDataClient,
  propertyId: string,
  cutoverAt: string
): Promise<PostViewCounts> {
  try {
    return await runPostViewReport(client, propertyId, cutoverAt);
  } catch (error) {
    logViewCountFailure(
      error instanceof ViewCountMisconfiguration ? 'misconfig' : 'stale',
      error
    );
    return {};
  }
}

export async function refreshPostViewsSnapshot(
  cutoverAt: string,
  clientFactory: (credentials: ServiceAccountCredentials) => GaDataClient =
    createGaClient
) {
  try {
    const propertyId = process.env.GA_PROPERTY_ID;
    const serviceAccountJson = process.env.GA_SERVICE_ACCOUNT_JSON;

    if (!propertyId || !serviceAccountJson) {
      throw new ViewCountMisconfiguration(
        'GA_PROPERTY_ID and GA_SERVICE_ACCOUNT_JSON are required'
      );
    }

    const credentials = parseServiceAccountJson(serviceAccountJson);
    const counts = await runPostViewReport(
      clientFactory(credentials),
      propertyId,
      cutoverAt
    );

    return {
      counts,
      lastSuccessfulFetchAt: new Date().toISOString(),
    };
  } catch (error) {
    logViewCountFailure(
      error instanceof ViewCountMisconfiguration ? 'misconfig' : 'stale',
      error
    );
    throw error;
  }
}

const getCachedPostViewsSnapshot = unstable_cache(
  refreshPostViewsSnapshot,
  ['view-counts'],
  { revalidate: GA_REVALIDATE_SECONDS, tags: ['views'] }
);

export async function getPostViewsSnapshot(
  cutoverAt: string | null | undefined
): Promise<PostViewsSnapshot> {
  const snapshotKey = cutoverAt ?? '';

  try {
    if (!cutoverAt) {
      throw new ViewCountMisconfiguration('viewsCutoverAt is not set');
    }

    const snapshot = await getCachedPostViewsSnapshot(cutoverAt);
    lastSuccessfulSnapshots.set(snapshotKey, snapshot);

    const age = Date.now() - Date.parse(snapshot.lastSuccessfulFetchAt);
    return {
      ...snapshot,
      lastSuccessfulFetchAgeMs: age,
      stale: age > GA_STALE_AFTER_MS,
    };
  } catch (error) {
    logViewCountFailure(
      error instanceof ViewCountMisconfiguration ? 'misconfig' : 'stale',
      error
    );

    const lastSuccessful = lastSuccessfulSnapshots.get(snapshotKey);
    return {
      counts: lastSuccessful?.counts ?? {},
      lastSuccessfulFetchAt: lastSuccessful?.lastSuccessfulFetchAt ?? null,
      lastSuccessfulFetchAgeMs: lastSuccessful
        ? Date.now() - Date.parse(lastSuccessful.lastSuccessfulFetchAt)
        : null,
      stale: true,
    };
  }
}

export async function getPostViewCounts(
  cutoverAt: string | null | undefined
): Promise<PostViewCounts> {
  return (await getPostViewsSnapshot(cutoverAt)).counts;
}
