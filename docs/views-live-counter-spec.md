# Live view counter + GA4 timezone fix

Status: revised implementation spec for K3 after Opus 5 / GLM panel review. This document intentionally contains no feature implementation.

## Recommendation

Store live totals in dedicated, API-owned Sanity documents, not in editable `post` documents. Each counter is a non-drafted document with `_type: "postView"`, deterministic `_id: "views.${slug}"`, and numeric `count`. A draft publication can replace fields on the published `post`, but it cannot overwrite this separate document.

The public site stops adding GA4 deltas to displayed counts. GA4 continues firing through `app/(site)/layout.tsx` for Jake's analytics dashboard, and view-admin keeps the GA4 delta as a separate diagnostic. GA4 is not part of the public count's read or failure path.

After hydration, the post header sends one session-deduped POST. The route reads the published post's immutable legacy count server-side, atomically creates the counter from it if absent, increments it, and returns Sanity's committed total. The current browser updates within one request; another browser sees the shared value on its next cold load or refresh. There is no polling, websocket, SSE, optimistic increment, or hybrid GA/live formula in v1.

## Repository evidence reviewed

This design is based on the current contents of:

- `app/lib/post-views.ts` and `app/lib/post-views.test.ts`
- `app/(site)/posts/[slug]/ViewCounter.tsx` and `app/(site)/posts/[slug]/page.tsx`
- `app/(site)/page.tsx` and `app/(site)/tags/[slug]/page.tsx`
- `app/(site)/viewadmin/page.tsx` and `app/api/viewadmin/route.ts`
- `app/lib/sanity.client.ts` and `app/api/revalidate/route.ts`
- `sanity-schemas/post.ts` and `app/types/sanity.ts`
- `scripts/seed-view-baseline.mjs`, its helper, and its tests
- `docs/views-ga4-runbook.md`, `.env.example`, `next.config.js`, `package.json`, and `CLAUDE.md`
- Git history for PR #42, including the deleted public route, HMAC helper, and endpoint-hardening spec

The draft-aware post page (`draftSanityFetch`) makes a counter field on `post` unsafe: a draft snapshots post fields, so publishing an older draft could replace a newer counter. `postView` documents are never created with a `drafts.` ID, never referenced from or copied into a post draft, and are not exposed as editable Studio content. The existing Sanity webhook is scoped to post mutations, so `postView` writes do not create post revalidation fan-out.

No Redis/KV client or other counter store is installed. The existing server-only `SANITY_API_WRITE_TOKEN` and `writeClient` already support authenticated mutations.

## Data model and display source of truth

| Value | Meaning after this change | Publicly displayed? |
|---|---|---:|
| `postView.count` | Durable raw live total for one slug | Yes; first choice |
| `post.viewCountBase` | Historical fallback captured at the GA4 cutover | Only if `postView` is absent/unavailable |
| `post.viewCount` | Untouched legacy audit trail | Only if both newer values are absent |
| `post.viewsCutoverAt` | Original GA4 reporting boundary | No; GA diagnostic only |
| GA4 `screenPageViews` delta | Analytics/readership comparison since cutover | No; view-admin/GA dashboard only |

Every surface uses:

```ts
postViewCount ?? post.viewCountBase ?? post.viewCount ?? 0
```

The relevant GROQ projections and TypeScript shapes must include both post fallback fields. `viewCount` and `viewCountBase` remain untouched by live traffic and Studio publishing.

`postView` is an API-only Content Lake document type. Do not add it to the Studio authoring workflow: Content Lake accepts the `_type`, while the deterministic published ID and lack of an editable Studio document type keep it non-drafted. A document contains only `_id`, `_type`, and `count`.

## Store choice

Sanity remains the right v1 store at this traffic level. Its transactions support `createIfNotExists` plus atomic `.inc()` patches, the write client already exists, and a separate document removes both draft-publish loss and post-webhook churn. It requires no package, datastore, or new credential.

Vercel KV is no longer a new-project option; [Vercel directs new KV workloads to Marketplace Redis](https://vercel.com/docs/redis). Upstash would work but adds a resource, dependency, secrets, seeding, and batch-read code. Edge Config is read-oriented and unsuitable for a write per page view. If traffic later makes Sanity mutations material, preserve the API/client contract and swap the storage implementation to Upstash then.

GA4 remains the better measure of readership, but its processing delay and the existing five-minute cache make it unsuitable for this UI.

## Fresh, dynamic read path

Add `app/lib/live-post-views.ts` with two small exports:

- `getPostViewId(slug)` returns `views.${slug}`.
- `getLivePostViewCounts(slugs)` performs one GROQ query for the requested deterministic IDs, projects `{_id, count}`, maps IDs back to slugs, and returns `Record<string, number>`.

The helper must call the uncached Sanity API with `cache: 'no-store'` (or the exact equivalent `revalidate: 0`) on every render. It must not use ISR, the API CDN, `unstable_cache`, or a revalidation tag. On query failure it logs a bounded error and returns `{}`, allowing each page to use its stored post baseline rather than zero.

All three public surfaces call this helper after fetching their post data:

- Post page requests one slug and passes the fresh total to `ViewCounter`.
- Home requests all listed slugs in one query.
- Tag page requests all listed slugs in one query.

The uncached counter fetch makes the rendered count dynamic even if the surrounding post content remains tag-cached. In particular, it does not depend on the post page's `post:${slug}` tag or the webhook's separate `post` tag, so that current tag mismatch cannot stale the live total. A cold request after a committed mutation sees it because Sanity mutation visibility remains `sync`.

## Increment and dedup design

### Route handler

Add `POST /api/views/` in `app/api/views/route.ts`. The trailing slash is intentional because `next.config.js` has `trailingSlash: true`; the client calls this URL directly and must not incur a `308` redirect.

Contract:

- First instruction: if `process.env.VIEW_WRITES_ENABLED !== '1'`, return `204` without parsing or writing.
- Request JSON: `{ "slug": string }`.
- Validate slug with `/^[a-z0-9][a-z0-9-]{0,127}$/`.
- Query the published/non-draft post by slug through the published Sanity client and read `viewCount`; use `0` when it is absent. Do not use a draft perspective.
- Derive `_id` as `views.${slug}` without looking up the post document ID.
- In one transaction, `createIfNotExists({_id, _type: 'postView', count: post.viewCount ?? 0})`, then patch that ID with `.inc({count: 1})`.
- Commit with `visibility: 'sync'` and return `200 {"viewCount": committedCount}` from the returned document. Verify the installed client transaction response shape during implementation; use `returnDocuments: true` rather than adding a pre-increment read.
- Malformed requests return useful `400` JSON; mutation failures return `500` JSON. The kill switch is the only intentional `204`.

The seed comes only from the published post on the server. Draft previews and clients cannot choose it. `createIfNotExists` means only the first transaction initializes the document, while every accepted transaction increments once. Optional pre-seeding is still allowed but not required for rollout.

Do not add HMAC tokens, origin/referer checks, IP hashing, user-agent/bot gates, server dedup, silent rejection responses, middleware, or WAF logic. The normal write originates from a post-hydration effect, so crawlers that do not execute client JavaScript do not increment. Scripted callers still can: this is an engaging raw counter, not a fraud-resistant analytics system.

### Client behavior

Restore `ViewCounter` as a client component with `slug` and `initialCount` props.

1. In an effect keyed on `slug` and `initialCount`, reset component state to `initialCount` so App Router reuse cannot show the previous post's value.
2. Read and write `sessionStorage` key `viewed:${slug}` only inside `try/catch`. If storage is unavailable (Safari private mode or a sandboxed iframe), continue without dedup rather than breaking render.
3. If the key is absent, set it before the request so normal remounts cannot double-submit.
4. POST `{slug}` directly to `/api/views/`.
5. A `204` means writes are disabled: retain the rendered count and session marker.
6. On a valid `200`, set state to the returned committed count. Do not optimistically add one; concurrent viewers may mean the result is greater than `initialCount + 1`.
7. On network, other non-2xx, or malformed-response failure, retain `initialCount` and try to remove the session key inside `try/catch`, permitting a later navigation to try again. There is no in-place retry loop.
8. Cancel or ignore an old request's state update when the slug changes or the component unmounts.

`sessionStorage` means one raw view per slug per tab session when storage works. New tabs, new sessions, preview deployments, bots that hydrate, and direct scripted calls can increment again. GA4 remains Jake's source for true readership analysis.

No polling is included. The current viewer updates immediately after commit; another browser updates on its next load or refresh. An already-open second browser does not tick automatically. Polling remains a roughly 15-LOC future upgrade if Jake later wants that behavior.

## Admin behavior

- View-admin GET reads `postView` totals through the same uncached helper and returns the baseline fallback only when a live document is absent/unavailable.
- Keep `gaDelta` and GA freshness as separate diagnostics; never add GA to the live displayed count.
- Relabel the UI to "Live displayed count" and "GA4 views since cutover" and remove the old GA-derived displayed formula.
- Manual corrections mutate `postView.count`, not either post field. The authenticated POST may keep its existing post lookup to obtain slug and baseline, then atomically `createIfNotExists` and `inc(changeAmount)` so it cannot overwrite a concurrent public increment.
- Two concurrent authenticated corrections could theoretically pass the same non-negative precheck and their atomic decrements could drive the count below zero. This is an accepted v1 risk because view-admin is authenticated and has one administrator.
- `app/(site)/layout.tsx` is unchanged; Google Analytics continues firing.

## Failure behavior and kill switch

- A failed live read returns no counter override and renders `viewCountBase ?? viewCount ?? 0`; it never manufactures a zero when historical data exists.
- A failed increment keeps the server-rendered value and never shows an uncommitted optimistic count.
- GA credentials, latency, or outage cannot affect public counts.
- `VIEW_WRITES_ENABLED` defaults disabled unless exactly `1`. Changing it affects only a new Vercel deployment; after setting it to `0`/unset, trigger and await a redeploy to stop writes. Reads and historical totals continue working.
- Route errors log only slug plus a bounded error message—no user agent, IP, origin, or token data.

## Seed and migration plan

No bulk `postView` migration is required.

1. The existing `seed:view-baseline` script remains a post-baseline audit tool only. Its dry run should confirm `viewCountBase` is present where expected; it must not overwrite existing values.
2. On the first accepted live view, the route reads the published post and the transaction creates `postView.count` from `viewCount ?? 0`, then increments it. `createIfNotExists` makes concurrent first views seed once and each increment once.
3. `viewCount`, `viewCountBase`, and `viewsCutoverAt` remain unchanged forever by live-counter traffic.
4. New posts may lack a baseline; their existing `viewCount` (normally `0`) supplies the fallback seed.
5. Optional pre-seeding may create `views.${slug}` documents from each published post's `viewCount ?? 0` before enabling writes. It is operationally safer if desired but is not implementation or merge scope.

Because the counter lives outside `post`, creating a draft, accumulating views, and publishing that draft cannot reset it.

## GA4 timezone fix

The fix still matters for view-admin diagnostics, though GA is no longer public-display-critical.

Use `process.env.GA_PROPERTY_TIME_ZONE || 'America/Chicago'`. Document the optional override in `.env.example` and the runbook, but do not add it to `next.config.js`'s production build guard. Existing GA credential guards stay unchanged.

Replace `getGaStartDate` with property-calendar range logic:

1. Validate `viewsCutoverAt` as an instant.
2. Build an `Intl.DateTimeFormat` for the configured IANA zone inside `try/catch`. Wrap its `RangeError` as `ViewCountMisconfiguration('GA_PROPERTY_TIME_ZONE is invalid')`.
3. Use `formatToParts()` to extract numeric property-local year, month, and day for both cutover and `now`; assemble `YYYY-MM-DD` explicitly.
4. Add one calendar day without reparsing a local date string: pass the extracted integers to `Date.UTC(year, month - 1, day + 1)`, then read that UTC date's UTC year/month/day and format them. Never call `new Date(localDateString)` and never add a day to the original cutover instant.
5. Use the explicit property-local current date as `endDate`; do not send GA's relative `'today'`.
6. If `firstEligibleDay > propertyToday`, do not call GA. Treat `{counts: {}}` as a successful refresh and stamp `lastSuccessfulFetchAt` with the same injected `now`, so view-admin reports healthy/zero-delta rather than a false stale warning.
7. Otherwise issue `{startDate: firstEligibleDay, endDate: propertyToday}`. Every emitted request is ordered by construction.

Inject `now` into the date/report helper for deterministic tests. Other GA failures keep the existing stale-snapshot behavior.

## Exact implementation files and LOC budget

Estimates are net LOC, not formatted diff churn. The implementation should stay near this budget and justify material growth.

| File | Change | Net LOC estimate |
|---|---|---:|
| `app/lib/live-post-views.ts` | Deterministic IDs + uncached batch read/map/fallback | +18 |
| `app/api/views/route.ts` | Kill gate + published seed read + create/increment transaction | +35 |
| `app/(site)/posts/[slug]/ViewCounter.tsx` | Safe storage, prop reset, trailing-slash POST, committed update | +23 |
| `app/(site)/posts/[slug]/page.tsx` | Add fallbacks/live read; remove GA display read | -5 |
| `app/(site)/page.tsx` | Batch live read; remove GA batch/formula | -6 |
| `app/(site)/tags/[slug]/page.tsx` | Batch live read; remove GA batch/formula | -5 |
| `app/api/viewadmin/route.ts` | Read/correct `postView`; keep GA separate | -4 |
| `app/(site)/viewadmin/page.tsx` | Relabel and remove GA-derived display state | -8 |
| `app/types/sanity.ts` | Make legacy fallback field match projections/optionality | +1 |
| `app/lib/post-views.ts` | Property-local range + successful pre-range result | +19 |
| `app/lib/post-views.test.ts` | Clocked Central-boundary/range/zone tests | +18 |
| `.env.example` | Kill switch + optional GA timezone override | +4 |
| `docs/views-ga4-runbook.md` | Analytics-only role, timezone, counter rollout notes | +5 |
| **Total** | **Both fixes, all display surfaces coherent** | **about +95 net LOC** |

About +68 net LOC is runtime/types code; the rest is tests and operations documentation. `next.config.js`, `package.json`, the lockfile, post schema, seed scripts, and GA layout should not change.

## Environment and rollout

No Vercel storage provisioning is needed.

1. Confirm `SANITY_API_WRITE_TOKEN` can create/patch published `postView` documents in each counting environment.
2. Add `VIEW_WRITES_ENABLED=0` initially in Vercel Production, Preview, and Development. Preview increments are accepted as part of this deliberately raw counter.
3. Confirm the GA property timezone; add `GA_PROPERTY_TIME_ZONE` only if it differs from the `America/Chicago` default.
4. Deploy with writes disabled and verify cold reads fall back to the historical baseline.
5. Set `VIEW_WRITES_ENABLED=1`, trigger and await a Vercel redeploy, then run the live smoke. Do not add origin gates to distinguish Preview.
6. Watch route errors and Sanity mutation volume for one day. Move storage behind the same contract only if measured traffic warrants it.

The counter and every public/admin display switch in one deployment. Never deploy a formula that adds GA after `postView` writes begin.

Rollback: set `VIEW_WRITES_ENABLED=0`/unset, trigger a Vercel redeploy, and await it. The newly deployed route returns `204`, public reads continue showing the last committed `postView` total, and no count data is rewritten. A code rollback may follow later, but disabling writes does not require restoring GA or subtracting increments.

## Test plan

### Automated

Run `npm test` and `npm run typecheck`.

Extend `post-views.test.ts` with deterministic cases:

- `2026-08-21T02:30:00Z` is August 20 in `America/Chicago`, so its first eligible calendar day is August 21, not August 22.
- While property-local today is August 20, no GA client call occurs and the refresh returns a successful, fresh empty snapshot.
- After Central midnight, the emitted range is August 21 through August 21.
- Historical ranges use explicit ordered dates and never contain `'today'`.
- Invalid cutover and invalid IANA zone are classified as misconfiguration.
- Existing hostname/path aggregation, outage, and credential tests remain green using an injected clock.

Do not add a mocking framework or generic counter service to test Sanity's transaction primitive. The counter integration is covered by the smoke.

### Live smoke

Use a test post and record its baseline/current `postView` value.

1. With writes disabled, load the post: no mutation occurs, the fallback count remains visible, and `/api/views/` returns `204`.
2. Enable writes. Browser A fresh tab: one direct POST to `/api/views/` occurs with no `308`; the header advances to the value Sanity holds after the transaction.
3. Refresh Browser A in the same tab: no POST occurs and the latest server-rendered total remains visible.
4. Browser B cold load (fresh browser process/private profile, not an already-open cached tab): its server render already includes Browser A's committed increment, then its own POST updates to the new committed value.
5. Cold-load home and the post's tag page; both show the same committed count without waiting for ISR or a webhook.
6. Simulate `sessionStorage.getItem`, `setItem`, and `removeItem` throwing; the component still renders and a request failure does not crash it.
7. Exercise a non-writing/invalid Sanity token: the header retains its non-zero server value. Restore the token.
8. In view-admin, verify live and GA values remain separate and a `+1`/`-1` correction changes `postView.count` without touching post fields.
9. Open the post in Studio and keep the draft open. Increment the live count, edit and publish the draft, then confirm the same `postView` count survives publication.
10. Verify the late-evening Central GA case produces either no request with a healthy empty snapshot or an ordered explicit range; no `start_date must be <= end_date` error appears.

## Acceptance criteria

- Live totals exist only in published `postView` documents with deterministic IDs; post drafts and publication cannot overwrite them.
- A first tab-session view updates to Sanity's committed value; same-tab refresh does not write again when storage works.
- A cold second browser, home, tag, and post render see the shared count through an uncached read within seconds.
- A missing/unavailable counter falls back through `viewCountBase`, then `viewCount`, and never resets to zero when historical data exists.
- `viewCount`, `viewCountBase`, and `viewsCutoverAt` are untouched by live traffic.
- The environment gate stops writes with a `204` while preserving reads.
- Storage access cannot crash the client, reused components reset on slug/count changes, and POST has no trailing-slash redirect.
- GA4 is never added to public counts; analytics continues firing independently.
- No HMAC, origin/referer, bot, IP, server dedup, polling, or new store is introduced.
- Every issued GA request uses explicit property-local dates with `startDate <= endDate`; a pre-range refresh is successful and healthy.
- Tests and typecheck pass within the LOC budget.

## Open questions for reviewers (Opus 5 / K3 / GLM)

1. Confirm the installed Sanity client's `transaction().commit({returnDocuments: true})` response shape and the smallest typed way to select the final `postView.count` without an extra read.
2. Is optional pre-seeding operationally worthwhile before enabling writes, or should lazy `createIfNotExists` remain the only rollout path? Either choice must preserve the v1 data model and no-bulk-migration requirement.
3. What measured Sanity mutation/error threshold should trigger the documented Upstash swap later? Redis is not part of v1.
