# Live view counter + GA4 timezone fix

Status: implementation spec for Opus 5 / K3 / GLM review. This document intentionally contains no feature implementation.

## Recommendation

Use Sanity as the live counter store. It is already provisioned, the server-only `writeClient` is already configured, and Sanity documents support atomic `.inc()` patches. Reuse `viewCountBase` as the displayed live total: it already contains every post's historical seed, so this avoids another field, datastore, dependency, and migration.

The public site must stop adding GA4 deltas to displayed counts. GA4 continues to fire through `app/(site)/layout.tsx` for Jake's analytics dashboard, and the internal view-admin page may continue showing the GA4 delta as a separate diagnostic. GA4 is not part of the public count's read or failure path.

The post header becomes a small client component again. On the first visit to a slug in a tab session, it calls a minimal route handler, waits for Sanity's committed count, and replaces the server-rendered count with the returned value. Other browsers see the shared value on their next load or refresh, normally within one Sanity round trip. There is deliberately no polling, websocket, SSE, optimistic increment, or hybrid GA/live formula.

## Repository evidence reviewed

The design above is based on the current contents of:

- `app/lib/post-views.ts` and `app/lib/post-views.test.ts`
- `app/(site)/posts/[slug]/ViewCounter.tsx` and `app/(site)/posts/[slug]/page.tsx`
- `app/(site)/page.tsx` and `app/(site)/tags/[slug]/page.tsx`, which also display counts
- `app/(site)/viewadmin/page.tsx` and `app/api/viewadmin/route.ts`
- `app/lib/sanity.client.ts` and `app/api/revalidate/route.ts`
- `sanity-schemas/post.ts` and `app/types/sanity.ts`
- `scripts/seed-view-baseline.mjs`, its helper, and its tests
- `docs/views-ga4-runbook.md`, `.env.example`, `next.config.js`, `package.json`, and `CLAUDE.md`
- Git history for PR #42, including the deleted `app/api/views/route.ts`, `app/lib/view-token.ts`, and `docs/specs/views-endpoint-hardening.md`

No Redis/KV client or other durable counter is currently installed or configured. The existing `SANITY_API_WRITE_TOKEN` and `writeClient` already support the authenticated server-side mutations used by view-admin.

## Chosen data model and source of truth

| Value | Meaning after this change | Publicly displayed? |
|---|---|---:|
| `viewCount` | Untouched legacy audit trail from before PR #42 | No; fallback seed only |
| `viewCountBase` | Historical seed plus every accepted live raw-view increment | Yes; sole source of truth |
| `viewsCutoverAt` | Original GA4 reporting boundary | No; GA diagnostic only |
| GA4 `screenPageViews` delta | Analytics/readership comparison since cutover | No; view-admin/GA dashboard only |

Keeping the existing field name is intentional. Renaming or adding `liveViewCount` would require a schema change, a bulk migration, dual-read fallback logic, and an admin update without improving what visitors see. Update the field's Studio title/description to say that it is now the live displayed total; do not touch `viewCount` or rewrite `viewsCutoverAt`.

Every public read uses this safe fallback:

```ts
post.viewCountBase ?? post.viewCount ?? 0
```

The relevant GROQ projections must therefore include both fields. This prevents a zero reset if rollout finds an old post whose baseline was never seeded.

## Store choice

Choose the already-wired Sanity Content Lake for v1. Sanity documents explicitly support [atomic `.inc()` counter patches](https://www.sanity.io/docs/apis-and-sdks/js-client-mutations), and the current client uses the uncached API (`useCdn: false`) with `revalidate: 0`. It meets this blog's durability, shared-state, and seconds-level refresh requirements with zero new packages or infrastructure.

Alternatives considered:

- Vercel KV is no longer a new-project option; [Vercel directs new KV workloads to Marketplace Redis](https://vercel.com/docs/redis). Upstash Redis would be technically sound (`SETNX` seed plus `INCR`, `MGET` for lists), but it adds a Marketplace resource, `@upstash/redis`, two secrets, a counter helper, batch reads, and cross-store seed/fallback behavior. That is disproportionate for this low-traffic counter and Jake's minimal-LOC constraint.
- Edge Config is optimized for globally replicated runtime configuration and read-heavy data, not a write on every page view. Its write model and seconds-level propagation make it a worse counter than either Sanity or Redis.
- GA4 remains the better measure of readership but cannot produce the requested live UI because processing lags and the existing query is cached for five minutes.

The accepted cost of the Sanity choice is one post-document mutation (and potentially one existing Sanity webhook delivery) per accepted session view. If actual traffic or webhook churn becomes material, keep the API/client contract and replace only its storage implementation with Upstash later.

## Increment and dedup design

### Route handler, not a server action

Add `POST /api/views` in `app/api/views/route.ts`. A route handler is the smaller, clearer boundary for a post-hydration `fetch`, returns the committed value directly, and avoids coupling the client component to the React Server Action transport.

Contract:

- Request JSON: `{ "slug": string }`
- Validate with the old, simple slug shape: `/^[a-z0-9][a-z0-9-]{0,127}$/`.
- Query the published post by slug for `_id` and legacy `viewCount`; return a useful `400`, `404`, or `500` JSON response on failure.
- Apply one patch: `.setIfMissing({ viewCountBase: post.viewCount ?? 0 }).inc({ viewCountBase: 1 }).commit()`.
- Return `200 { "viewCount": updatedPost.viewCountBase }` only after the mutation commits.
- Do not retry the mutation server-side: POST is not idempotent and a retry after an ambiguous network failure can double-count.

The chained `setIfMissing` and `inc` are applied atomically and in that order. Concurrent first views seed once and each increment once.

Do not add HMAC tokens, origin/referer checks, IP hashing, user-agent/bot gates, in-memory or Redis rate limits, silent `204` responses, middleware, or WAF logic. The route validates only the data it needs to mutate safely.

### Client behavior

Restore `ViewCounter` as a client component with `slug` and `initialCount` props.

1. Render `initialCount` during SSR and hydration.
2. In `useEffect`, check `sessionStorage` key `viewed:${slug}`.
3. If absent, set the key before starting the request so React remounts or fast rerenders cannot double-submit.
4. POST the slug. On a valid `200`, set state to the returned committed count; do not optimistically add one.
5. On network, non-2xx, or malformed-response failure, keep the initial count and remove the session key so a later full navigation/refresh may try again. Do not loop or retry in place.
6. If the key is already present, make no write and retain the fresh server-rendered value.

`sessionStorage` intentionally means one raw view per slug per tab session. New tabs, new browser sessions, scripted calls, and bots can increment again. This number is an engaging raw-view counter, not unique humans or verified readers. GA4 remains Jake's source for real readership analysis.

No GET polling is included. The current viewer sees its committed increment immediately; a second browser sees the shared total when it loads or refreshes. An already-open second browser does not tick in real time. That is the smallest design that satisfies "within seconds, not hours" without continuous Content Lake reads.

## Public and admin read paths

- Post page: remove `getPostViewCounts`; pass `slug` and the fallback live total to `ViewCounter`.
- Home and tag pages: remove the GA batch read and render the fallback live total directly.
- View-admin API: keep GA snapshot fields as diagnostics, but never add `gaDelta` to `viewCountBase`. Return the live count and GA delta as separate values.
- View-admin UI: label the values "Live displayed count" and "GA4 views since cutover"; remove the redundant GA-derived "Displayed views" row. Manual corrections change the live count.
- View-admin POST: use `setIfMissing(...).inc({ viewCountBase: changeAmount })` rather than setting an absolute value after the read. The existing read still validates that the resulting number is non-negative, while atomic `inc` avoids overwriting a public increment that lands between read and commit.
- `app/(site)/layout.tsx`: no change. `GoogleAnalytics` continues firing normally.

## Failure behavior

- A failed increment never changes the UI to `0`, never shows an error in the post header, and never displays an uncommitted optimistic value. It keeps the server-rendered `viewCountBase ?? viewCount ?? 0`.
- A missing baseline is initialized from immutable legacy `viewCount`, in the same patch as the first increment.
- Public pages do not call the GA Data API, so GA credentials, latency, cache state, or outage cannot freeze or reset their counts.
- A later request uses Sanity's latest committed document and naturally recovers. There is no in-memory last-known map for the live counter because the count and already-required post content live in the same document/store.
- Route failures should be logged once with slug and a bounded error message, but no user agent, IP, origin, or token data.

## Seed and migration plan

There is no new datastore migration.

1. Before rollout, run the existing `npm run seed:view-baseline` dry run and confirm published posts are already skipped as seeded. If any legitimate published post lacks both seed fields, review the dry run and use the existing `--commit` path before deployment.
2. Do not rerun or overwrite already-present `viewCountBase` values. A value of `0` is present and valid.
3. Keep `viewCount` untouched as the audit trail.
4. Keep every existing `viewsCutoverAt` unchanged so the GA diagnostic retains its historical boundary.
5. The route's `setIfMissing` is the race-safe backstop for an unseeded post. New posts receive `viewCountBase: 0` through the schema initial value.

This seeds exactly once because neither the script nor the live route overwrites a present `viewCountBase`. The first live request increments only after the default has been established.

## GA4 timezone fix

The timezone fix remains required even though GA is removed from the public display path: `viewadmin` still uses the report for diagnostics, and silently returning only the fallback on a valid configuration is incorrect. Its user impact is reduced from public-count correctness to admin analytics correctness.

Add required production configuration `GA_PROPERTY_TIME_ZONE` with the GA4 property's IANA timezone, expected to be `America/Chicago`. Add it to `.env.example`, the production env guard in `next.config.js`, Vercel, and the runbook.

Replace `getGaStartDate` with property-calendar date-range logic:

1. Validate `viewsCutoverAt` as an instant.
2. Use `Intl.DateTimeFormat(..., { timeZone: GA_PROPERTY_TIME_ZONE }).formatToParts()` to produce `YYYY-MM-DD` for both the cutover instant and the current instant. Do not slice a UTC ISO timestamp.
3. Add one calendar day to the property-local cutover date because the baseline includes the cutover day.
4. Replace GA's relative `endDate: 'today'` with the explicit property-local current date.
5. If the first eligible GA day is later than property-local today, do not issue a report; return an empty GA delta. Do not clamp backward to the cutover day, which would double-count the baseline day.
6. Otherwise issue `{ startDate: firstEligibleDay, endDate: propertyToday }`. Every emitted request is therefore ordered by construction.

The date helper should accept an explicit `now` in tests. Invalid cutover timestamps and invalid IANA timezones remain `ViewCountMisconfiguration` failures and preserve the existing stale-result behavior.

## Exact implementation files and LOC budget

Estimates are net LOC, not formatted diff churn. K3 should stop and justify the change if implementation grows materially beyond this budget.

| File | Change | Net LOC estimate |
|---|---|---:|
| `app/api/views/route.ts` | Minimal published-post lookup + atomic seed/increment | +42 |
| `app/(site)/posts/[slug]/ViewCounter.tsx` | Session guard, POST, committed-state update, stale fallback | +31 |
| `app/(site)/posts/[slug]/page.tsx` | Query legacy fallback; remove GA read; pass live props | -4 |
| `app/(site)/page.tsx` | Query fallback; remove GA batch/formula | -6 |
| `app/(site)/tags/[slug]/page.tsx` | Query/type fallback; remove GA batch/formula | -5 |
| `app/api/viewadmin/route.ts` | Separate live/GA values; atomic manual correction | -2 |
| `app/(site)/viewadmin/page.tsx` | Relabel/simplify live and GA rows | -8 |
| `sanity-schemas/post.ts` | Live-total description + `initialValue: 0` | +2 |
| `app/lib/post-views.ts` | Property-local explicit range and pre-range no-op | +24 |
| `app/lib/post-views.test.ts` | Late-evening Central, no-range, and ordered-range tests | +28 |
| `.env.example` | Document `GA_PROPERTY_TIME_ZONE` | +3 |
| `next.config.js` | Require timezone beside GA Data API credentials | +1 |
| `docs/views-ga4-runbook.md` | Analytics-only role and timezone setup | +6 |
| **Total** | **Two changes, all display surfaces coherent** | **about +102 net LOC** |

Only about +66 net LOC is runtime/schema code; the remainder is tests and operational documentation. `package.json`, the lockfile, `app/types/sanity.ts`, seed scripts, and the GA layout should not change. Mirror the schema description/initial value in the separate `jakeportfolio-studio` repository as an operational follow-up, not by adding frontend migration code.

## Vercel and environment setup

Counter provisioning clicks: none. Do not create Vercel KV, Upstash Redis, or Edge Config for this version, and do not add a counter package.

Before deploy, Jake should:

1. Confirm the existing `SANITY_API_WRITE_TOKEN` is available to the environments that are allowed to increment and can patch published `post` documents. The secret remains server-only.
2. In GA4 Admin, copy the property's exact timezone.
3. Add `GA_PROPERTY_TIME_ZONE=America/Chicago` (or the actual IANA value) to Vercel Production, Preview, and Development beside the existing GA credentials, then redeploy.
4. Decide whether Preview points at production Sanity. With the deliberately open raw counter, preview visits will count if Preview uses the production dataset; a separate preview dataset is the honest isolation mechanism, not origin-header filtering.

## Test plan

### Automated

Run `npm test` and `npm run typecheck` (do not weaken the repository's compiler settings).

Extend `post-views.test.ts` with deterministic cases:

- A cutover at `2026-08-21T02:30:00Z` formats as August 20 in `America/Chicago`, so its first eligible day is August 21 rather than August 22.
- While property-local today is still August 20, the helper returns no range and the GA client is not called.
- After Central midnight, the emitted request uses August 21 for both start and end.
- A normal historical cutover produces explicit ordered dates; no request contains `'today'`.
- Invalid `viewsCutoverAt` and invalid `GA_PROPERTY_TIME_ZONE` preserve misconfiguration logging/fallback.
- Keep the existing hostname/path aggregation, GA outage, and credential tests green; inject the clock rather than depending on the machine date.

Do not add a mocking framework or extract a generic counter service just to unit-test Sanity's documented atomic primitive. The counter's integration behavior is covered by the live smoke below.

### Live smoke

Use a test post/dataset first, record the starting count, and inspect Sanity after each step.

1. Browser A, fresh tab: load the post. The server value renders without a zero flash, one POST occurs, the header advances by exactly one after the response, and Sanity matches it.
2. Refresh Browser A in the same tab: no POST occurs and the latest committed total remains visible.
3. Browser B/private window: load the same post. It increments exactly once and shows Browser A's count plus one. Refresh Browser A and confirm it sees Browser B's committed value.
4. Open the home page and the post's tag page; both show the same live total after refresh.
5. Temporarily exercise a deployment with a non-writing/missing Sanity token: the POST returns a non-2xx response and the header retains its non-zero server value. Restore the token before production.
6. In view-admin, confirm "Live displayed count" matches the public pages, GA4 remains separate, and a `+1`/`-1` correction changes the live total without adding GA.
7. Around the reproduced late-evening Central boundary (or with the injected-clock test), confirm no GA request is sent with `startDate > endDate` and no `start_date must be <= end_date` log appears.

## Merge order and rollout

1. Review this spec with Opus 5 / K3 / GLM and settle the open questions below before implementation.
2. Confirm/supply `GA_PROPERTY_TIME_ZONE`, verify the existing Sanity write token, and audit the baseline with the current dry-run script.
3. Implement the timezone helper/tests first; it is independently safe and keeps the internal GA diagnostic correct.
4. Implement the Sanity route and switch every public/admin display path in the same PR. Do not deploy a state where both the live base and GA delta are added after live writes begin.
5. Update the runbook and mirror the small schema metadata change in the Studio repository.
6. Let Vercel's Preview build validate production compilation. Run the smoke against an isolated test dataset/post, then deploy Production.
7. After deploy, watch route errors, Sanity mutation volume, and webhook volume for one day. Raw-count inflation is a known product tradeoff; do not respond by quietly restoring the deleted token/origin/bot gates.

Rollback is code-only: remove the client POST and return public reads to the stored `viewCountBase`. Do not subtract already-recorded increments or rewrite the legacy audit field. Reintroducing GA into the displayed formula is a separate product decision, not an emergency rollback step.

## Acceptance criteria

- A first tab-session view changes the visible number after one committed server request.
- A refresh or another browser reads the same durable shared count within seconds.
- Same-tab refresh does not increment again; a new session may.
- Home, tag, post, and view-admin agree on the live displayed value.
- Public counts never add GA4 and never reset to zero when a legacy value exists.
- Store failure leaves the last server-rendered value visible and retryable on a later navigation.
- `viewCount` and `viewsCutoverAt` are unchanged.
- No HMAC, origin/referer, bot, IP, server dedup, silent `204`, polling, or new storage dependency is introduced.
- Every issued GA request uses explicit property-local dates with `startDate <= endDate`; before the first eligible day, no request is issued.
- Tests and typecheck pass within the LOC budget.

## Open questions for reviewers (Opus 5 / K3 / GLM)

1. Is reusing `viewCountBase` as the evolving live total an acceptable semantic compromise for the minimal-LOC requirement, or is preserving it as an immutable baseline worth a new `liveViewCount` field and migration?
2. Does per-view Sanity document mutation/webhook churn at this site's actual traffic justify Upstash now, despite the extra resource, secrets, dependency, seed logic, and batch reads? Please quantify the threshold rather than preferring Redis categorically.
3. Is "current viewer updates immediately; other browsers update on load/refresh" sufficiently live, or is a short GET poll worth continuous Sanity reads and roughly 15-20 more runtime LOC?
4. Should Preview increments be accepted as part of the intentionally raw number, or should Vercel Preview use a separate Sanity dataset? Do not solve this with spoofable origin/referer gates.
5. Should `GA_PROPERTY_TIME_ZONE` be required in every production build as specified, or is a code default of `America/Chicago` preferable for one fewer provisioning step?
