# GA4 view-count cutover runbook

Complete these steps before merging the GA4 view-counter change.

1. In Google Cloud, enable the Google Analytics Data API, create a service account for the site, and export a JSON key for it. In GA4 Admin, open the jakejh.com property's access management and grant that service-account email the Viewer role on this property only.
2. In Vercel, add `GA_PROPERTY_ID` (the numeric property ID, not the `G-` measurement ID) and the complete service-account key JSON as `GA_SERVICE_ACCOUNT_JSON`. Set both variables in Production, Preview, and Development. A Vercel production build intentionally fails when either variable is missing.
3. In the GA4 property, set event-data retention to 14 months. If the blog still uses this design as the retention horizon approaches, add the documented v2 upgrade: a nightly snapshot that rolls older GA counts into the Sanity baseline.
4. With `NEXT_PUBLIC_SANITY_PROJECT_ID` and `SANITY_API_WRITE_TOKEN` available locally, preview the one-time mutation:

   ```bash
   npm run seed:view-baseline
   ```

   Review every post, then seed all published posts in one batched mutation:

   ```bash
   npm run seed:view-baseline -- --commit
   ```

   The script copies each post's existing `viewCount` into `viewCountBase` and writes the same `viewsCutoverAt` timestamp to every post. The original `viewCount` remains untouched as an audit trail. GA querying begins on the day after this timestamp, preventing the seed day from being counted twice.
5. Before merging, use GA4 Query Explorer with dimensions `hostName` and `pagePath` and metric `screenPageViews`. Confirm which trailing-slash form GA records, confirm preview hosts are excluded, and verify a non-zero GA delta for at least three established posts. The implementation accepts and sums both `/posts/<slug>` and `/posts/<slug>/`.
6. Merge only after the credentials, retention setting, seed, and Query Explorer checks are complete. Without working GA credentials the read path safely renders the Sanity baseline and logs a stale/misconfiguration event; credentials are set first so a deployment cannot silently remain baseline-only.

GA4 processing can lag by hours and the site caches the batched report for five minutes, so the GA delta is not expected to increment immediately on refresh.

## Live counter and timezone notes

- GA4 is analytics/diagnostic-only: public pages never add the GA delta to displayed counts. Displayed counts come from `postView` documents (`views.<slug>`), falling back to `viewCountBase` then `viewCount`; view-admin shows live and GA4 values side by side.
- GA date ranges use the property's IANA timezone, defaulting to `America/Chicago`; set `GA_PROPERTY_TIME_ZONE` only if the property differs. The next-day boundary is computed in property-local time, so a late-evening Central cutover starts GA querying the following local day.
- Roll out the live counter with `VIEW_WRITES_ENABLED=0` (POST /api/views returns 204), then set `1`, trigger a redeploy, and await it after cold reads are verified. To stop writes, set `0`/unset, trigger a redeploy, and await it; reads keep showing the last committed totals.
- Two concurrent authenticated admin corrections could theoretically pass the same non-negative precheck and drive the count below zero; this is an accepted v1 risk for a single-admin tool.
