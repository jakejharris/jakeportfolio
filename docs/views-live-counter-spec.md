# Live post view counter

Public view totals live in dedicated, non-drafted Sanity documents so publishing
a stale post draft cannot overwrite the counter.

## Data model

Each post slug maps to one document:

```json
{ "_id": "views.<slug>", "_type": "postView", "count": 0 }
```

`viewCount` remains on the published post as the migration source and legacy
fallback. `viewCountBase` is the next fallback. Public pages display:

```text
postView.count ?? post.viewCountBase ?? post.viewCount ?? 0
```

All live reads bypass the CDN and Next.js data cache with `cache: 'no-store'`.
Home and tag pages batch their slugs into one GROQ query.

## Write path

`POST /api/views/` accepts `{ "slug": string }`. Unless
`VIEW_WRITES_ENABLED` is exactly `1`, it immediately returns `204`.

For an accepted request the route requires an `Origin` matching the request URL
or `Sec-Fetch-Site: same-origin`; conflicting or cross-origin headers return
`403`. It validates the slug and verifies a published post exists for it before
deriving `views.<slug>`. Unknown slugs return `404`. The route then uses one
Sanity transaction to `createIfNotExists` at zero and increment `count`. A
lightweight bot User-Agent denylist and best-effort two-second per-instance
IP-and-slug throttle skip mutations and return the current live count.

The browser stores `localStorage["viewed:<slug>"]` as a timestamp before the
request. A valid marker suppresses another write for 24 hours. Storage access is
wrapped in `try/catch` and fails open.

## Migration and rollout

With writes disabled, preview the historical seed:

```bash
npm run seed:postviews
```

After reviewing every `{slug, count}` pair, the operator may run:

```bash
npm run seed:postviews -- --commit
```

The commit mode requires `SANITY_API_WRITE_TOKEN` and idempotently upserts each
published post's current `viewCount` into `views.<slug>`. Enable writes only in a
later deployment after the seed has completed. In Vercel, scope
`VIEW_WRITES_ENABLED=1` to the Production environment so previews cannot mutate
production counts. Rollback is a redeploy with `VIEW_WRITES_ENABLED=0`; existing
counts remain readable.

## GA4

GA4 is an admin-only diagnostic. It is never added to the public displayed
count. Its report range uses the GA property calendar, defaults to
`America/Chicago`, and can be overridden with `GA_PROPERTY_TIME_ZONE`.
