# Spec: Views Endpoint Hardening

**Author:** Fable (Argus) · 2026-08-05
**Motivation:** On 2026-07-16..23 an automated client inflated `ai-driven-trip-planning-with-ag` by ~2,400 views (20-50/hr around the clock, ~48s median spacing) via the open `POST /api/views` endpoint. Sanity transaction history confirmed every increment flowed through the API route. Nothing about the requester was recorded, so the actor is untraceable. Separately, `POST /api/viewadmin` performs arbitrary count writes with **no server-side auth at all** (the admin page's `password === 'password'` check is client-side theater).

## Goals

1. Make casual/automated inflation of `POST /api/views` impractical.
2. Make any future abuse **attributable** (structured request logging).
3. Put real auth on `/api/viewadmin` (P1).
4. Zero new infrastructure; at most one tiny dependency (`isbot`).

Non-goals: perfect bot-proofing (impossible without CAPTCHA/edge WAF), moving to GA-derived counts, analytics redesign.

## Current shape (read first)

- `app/(site)/posts/[slug]/ViewCounter.tsx` - client comp; sessionStorage dedup; `POST /api/views {slug}` on first view per tab-session.
- `app/api/views/route.ts` - finds post by slug, `writeClient.patch().inc({viewCount:1})`. No origin/UA/rate checks.
- `app/api/viewadmin/route.ts` - GET lists all counts; POST sets arbitrary `changeAmount`. **No auth.**
- `app/(site)/viewadmin/page.tsx` - client page, fake local password gate (`'password'` literal).
- `app/(site)/posts/[slug]/page.tsx:206` - renders `<ViewCounter slug initialCount>`.
- No `middleware.ts`. Node runtime (no runtime pragma). Next 15.5 App Router, TS strict. No test framework - gates are `npm run build` + the acceptance script below.

## Design

### 1. `POST /api/views` - layered gate

Order of checks (cheapest first, every rejection logged then returned as **204 with no body** so callers can't distinguish counted vs not):

1. **Slug shape**: `/^[a-z0-9][a-z0-9-]{0,127}$/` else 204.
2. **Origin/Referer allowlist**: at least one of `Origin`/`Referer` present AND its host ∈ {`www.jakejh.com`, `jakejh.com`, `*.vercel.app` previews of this project, `localhost:*` in dev}. Else 204.
3. **User-Agent**: missing UA or `isbot(ua)` → 204. (Dep: `isbot`, ~no transitive deps.)
4. **Render token** (proof the post page was actually served for this slug):
   - New helper `app/lib/view-token.ts`: `mintViewToken(slug)` / `verifyViewToken(token, slug)`. HMAC-SHA256 over `slug + "." + issuedAtMs` with secret `VIEWS_TOKEN_SECRET` (node `crypto`; `timingSafeEqual` for compare). Token format `${issuedAtMs}.${hex}`.
   - Valid window: issuedAt ≤ now ≤ issuedAt + 2h.
   - `page.tsx` mints server-side and passes `viewToken` prop; `ViewCounter` includes it in the POST body. Missing/invalid/expired/slug-mismatch → 204.
5. **Best-effort dedup**: module-level `Map<ipHash+slug, ts>` with 24h TTL, LRU-capped at 5,000 entries. Hit → 204. Document plainly in a comment: per-lambda-instance memory, resets on cold start - it blunts loops, it is not a guarantee.
6. All gates passed → increment exactly 1 (existing Sanity patch), return `{viewCount}` 200.

### 2. Structured logging (attribution)

One `console.log(JSON.stringify(...))` line per request, accepted or rejected:

```json
{"evt":"views","slug":"...","outcome":"inc"|"rej","reason":"origin"|"bot"|"token"|"dedup"|"slug"|null,"ua":"<first 120 chars>","ip":"<sha256(ip + VIEWS_TOKEN_SECRET) first 16 hex>","ts":"ISO"}
```

IP source: `request.headers.get('x-forwarded-for')?.split(',')[0]`. Hashed, never raw. These land in Vercel runtime logs → any recurrence is attributable same-day.

### 3. `POST+GET /api/viewadmin` - real auth (P1)

- Both handlers require `Authorization: Bearer ${VIEWADMIN_TOKEN}` (new env var), compared with `timingSafeEqual`; missing env var → route returns 503 (fail closed). Failure → 401 JSON.
- `app/(site)/viewadmin/page.tsx`: replace the fake `'password'` gate - the password field's value becomes the bearer token, held in React state only (never persisted), sent on every GET/POST. Remove the `'password'` literal entirely.

### 4. Client (`ViewCounter.tsx`)

- Add `viewToken` prop, include in POST body. Keep sessionStorage dedup. Treat any non-200 as silent no-op (keep showing `initialCount`). No retries.

### 5. Env & docs

- `.env.example` (create if absent): add `VIEWS_TOKEN_SECRET=`, `VIEWADMIN_TOKEN=` with one-line comments. README or the spec notes: both must be set in Vercel before merge deploys (deployer's job, not this PR's).
- If `VIEWS_TOKEN_SECRET` is unset: token verify fails ⇒ views never increment, site otherwise unaffected (fail closed, acceptable).

## Acceptance criteria (run and paste results)

`scripts/verify-views-hardening.mjs` (plain node, no framework) exercising `view-token.ts` logic: mint→verify ok; wrong slug fails; expired fails; tampered sig fails. Run with `node scripts/verify-views-hardening.mjs`.

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
