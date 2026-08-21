# GA4 view diagnostic runbook

GA4 data appears only in `/viewadmin`; public counters do not depend on it.
Missing or failing GA credentials leave the public `postView` count untouched
and make the admin diagnostic report stale.

1. Enable the Google Analytics Data API and give a dedicated service account
   Viewer access to the jakejh.com property.
2. Configure `GA_PROPERTY_ID` with the numeric property ID and
   `GA_SERVICE_ACCOUNT_JSON` with the complete key JSON. These are runtime admin
   diagnostics and are not part of the production build guard.
3. Confirm the GA property timezone. The code defaults to `America/Chicago`; set
   `GA_PROPERTY_TIME_ZONE` only when the property uses another IANA timezone.
4. Confirm existing posts retain their `viewCountBase` and `viewsCutoverAt`
   values. GA ranges begin on the calendar day after the cutover in the property
   timezone, preventing a double-counted cutover day.
5. In Query Explorer, verify dimensions `hostName` and `pagePath` with metric
   `screenPageViews`. Both `/posts/<slug>` and `/posts/<slug>/` are aggregated;
   preview hosts are excluded.

The admin page shows the live displayed count and GA4 views since cutover as
separate values. GA processing delay is expected and does not affect live reads.
