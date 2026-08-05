# Spec: Views Endpoint Hardening

**Author:** Fable (Argus) · 2026-08-05
**Motivation:** On 2026-07-16..23 an automated client inflated `ai-driven-trip-planning-with-ag` by ~2,400 views (20-50/hr around the clock, ~48s median spacing) via the open `POST /api/views` endpoint. Sanity transaction history confirmed every increment flowed through the API route. Nothing about the requester was recorded, so the actor is untraceable. Separately, `POST /api/viewadmin` performs arbitrary count writes with **no server-side auth at all** (the admin page's `password === 'password'` check is client-side theater).

## Goals

1. Make casual/automated inflation of `POST /api/views` impractical.
2. Make any future abuse **attributable** (structured request logging).
3. Put real auth on `/api/viewadmin` (P1).
4. Zero new infrastructure; at most one tiny dependency (`isbot`).

Non-goals: perfect bot-proofing (impossible without CAPTCHA/edge WAF), moving to GA-derived counts, analytics redesign.

### Threat model

`Origin`, `Referer`, `User-Agent`, and client-supplied `X-Forwarded-For` values are attacker-controlled. The render token is a publicly scrapeable bearer credential that can be replayed for its two-hour lifetime; it is not proof that a human was served the page. Together, these gates raise the cost from a one-line curl loop to fetching a page and spoofing plausible headers. That is intended to stop the July-class bot and no more. Any attribution is available only within Vercel's log-retention window and only if a person or watcher inspects the logs.

## Current shape (read first)

- `app/(site)/posts/[slug]/ViewCounter.tsx` - client comp; sessionStorage dedup; `POST /api/views {slug}` on first view per tab-session.
- `app/api/views/route.ts` - finds post by slug, `writeClient.patch().inc({viewCount:1})`. No origin/UA/rate checks.
- `app/api/viewadmin/route.ts` - GET lists all counts; POST sets arbitrary `changeAmount`. **No auth.**
- `app/(site)/viewadmin/page.tsx` - client page, fake local password gate (`'password'` literal).
- `app/(site)/posts/[slug]/page.tsx:206` - renders `<ViewCounter slug initialCount>`.
- No `middleware.ts`. Node runtime (no runtime pragma). Next 15.5 App Router, TS strict. No test framework - gates are `npm run build` + the acceptance script below.

## Design

### 1. `POST /api/views` - layered gate

Order of checks (cheapest first, every rejection or internal failure logged then returned as **204 with no body** so callers cannot use response details to learn which gate fired; a counted view still returns 200 with the current count):

1. **Slug shape**: `/^[a-z0-9][a-z0-9-]{0,127}$/` else 204.
2. **Origin/Referer allowlist**: at least one of `Origin`/`Referer` present AND its host ∈ {`www.jakejh.com`, `jakejh.com`, the exact `VERCEL_BRANCH_URL`/`VERCEL_PROJECT_PRODUCTION_URL` hosts when configured, project previews matching `jakeportfolio-[a-z0-9-]+.vercel.app` only when those variables are absent, `localhost`/`127.0.0.1` with or without a port in dev}. Else 204.
3. **User-Agent**: missing UA or `isbot(ua)` → 204. (Dep: `isbot`, ~no transitive deps.)
4. **Render token** (a two-hour replayable bearer minted while rendering this slug, not proof that the page reached a human):
   - New helper `app/lib/view-token.ts`: `mintViewToken(slug)` / `verifyViewToken(token, slug)`. HMAC-SHA256 over `slug + "." + issuedAtMs` with secret `VIEWS_TOKEN_SECRET` (node `crypto`; `timingSafeEqual` for compare). Token format `${issuedAtMs}.${hex}`.
   - Valid window: issuedAt ≤ now ≤ issuedAt + 2h.
   - `page.tsx` mints server-side and passes `viewToken` prop; `ViewCounter` includes it in the POST body. Missing/invalid/expired/slug-mismatch → 204.
5. **Best-effort dedup**: module-level `Map<ipHash+slug, ts>` with 24h TTL, LRU-capped at 5,000 entries. Hit → 204. Per-lambda-instance memory resets on cold start, so it blunts loops but is not a guarantee. Shared egress addresses (including CGNAT) can cause distinct readers of the same slug to be undercounted; that is an accepted tradeoff.
6. All gates passed → increment exactly 1 (existing Sanity patch), return `{viewCount}` 200.

### 2. Structured logging (attribution)

One `console.log(JSON.stringify(...))` line per request, accepted or rejected:

```json
{"evt":"views","slug":"...","outcome":"inc"|"rej","reason":"origin"|"bot"|"token"|"dedup"|"slug"|"json"|"notfound"|"error"|null,"ua":"<first 120 chars>","ip":"<sha256(ip + VIEWS_TOKEN_SECRET) first 16 hex>"|null,"source":"<first 200 chars of rejected Origin or Referer>","ts":"ISO"}
```

IP source: prefer Vercel's `x-vercel-forwarded-for`, then `x-real-ip`; outside the platform, fall back to the last `x-forwarded-for` element under the assumption that the nearest trusted proxy appended it. The same value feeds dedup and logging. It is hashed and never logged raw; when `VIEWS_TOKEN_SECRET` is absent, `ip` is `null` rather than an unsalted IP hash. Rejection logs also include the first 200 characters of the supplied Origin or Referer. These records land in Vercel runtime logs, but same-day attribution is realistic only while they remain within Vercel's configured retention window and someone or a future watcher looks at them.

### 3. `POST+GET /api/viewadmin` - real auth (P1)

- Both handlers require `Authorization: Bearer ${VIEWADMIN_TOKEN}` (new env var), compared with `timingSafeEqual`; missing env var → route returns 503 (fail closed). Failure → 401 JSON.
- `app/(site)/viewadmin/page.tsx`: replace the fake `'password'` gate - the password field's value becomes the bearer token, held in React state only (never persisted), sent on every GET/POST. Remove the `'password'` literal entirely.

### 4. Client (`ViewCounter.tsx`)

- Add `viewToken` prop, include in POST body. Keep sessionStorage dedup. Treat any non-200 as silent no-op (keep showing `initialCount`). No retries.

### 5. Env & docs

- `.env.example` (create if absent): add `VIEWS_TOKEN_SECRET=`, `VIEWADMIN_TOKEN=` with one-line comments. README or the spec notes: both must be set in Vercel before merge deploys (deployer's job, not this PR's).
- If `VIEWS_TOKEN_SECRET` is unset: tokens mint as empty strings, verification fails, views never increment, and request logs use `"ip":null`; article rendering continues (fail closed, acceptable).

## Acceptance criteria (run and paste results)

`scripts/verify-views-hardening.mjs` (plain node, no framework) exercises token mint/verify and canonical timestamps; source allowlisting; trusted IP sourcing and no-secret privacy; dedup TTL anchoring and LRU eviction; and admin-auth absent/empty/wrong-length/equal-length-wrong cases. Run with `node scripts/verify-views-hardening.mjs`.

Manual matrix against `npm run dev` (curl, paste outputs in the PR):

| # | Request | Expect |
|---|---------|--------|
| 1 | POST /api/views, no Origin/Referer | 204, log `rej/origin` |
| 2 | POST with `Origin: https://evil.com` | 204, log `rej/origin` |
| 3 | Valid origin, UA `curl/8` (isbot-true) or missing | 204, log `rej/bot` |
| 4 | Valid origin+browser UA, no/garbage token | 204, log `rej/token` |
| 5 | Full valid flow (mint token via helper) | 200 `{viewCount:+1}`, log `inc` |
| 6 | Repeat #5 same IP+slug immediately | 204, log `rej/dedup` |
| 7 | GET /api/viewadmin, no bearer | 401 |
| 8 | GET /api/viewadmin, correct bearer | 200 post list |
| 9 | `npm run build` | green |

## Constraints

- Branch `harden/views-endpoint` (you are on it). Commit locally; **do not push**, do not run `gh`.
- Only touch: the five files above, `app/lib/view-token.ts` (new), `scripts/verify-views-hardening.mjs` (new), `.env.example`, `package.json`/lockfile (isbot only). Nothing else.
- No new deps beyond `isbot`. No middleware.ts. No edge runtime changes. Keep TS strict-clean.
- Match existing code style (the routes use plain try/catch + NextResponse).

## Deferred follow-ups

- Consider folding the IP hash into the token's HMAC message as a deliberate token-design change.
- Consider a separate `VIEWS_IP_HASH_SECRET` so token-secret rotation does not also rotate log identities.
- Add a log drain and daily rejection-count alert in the operations layer.
- Mirror the API slug pattern in Sanity's authoring-side validation.
