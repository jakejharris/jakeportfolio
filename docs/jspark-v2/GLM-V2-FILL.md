# JSpark3 v2.0.0 TensorFold preview fill

The page, hub and share card consume one generated file. Historical releases are
unchanged. This checkpoint is a preview, with an independent publication hold.

## Checkpoint input

- Commit: `d62319334312f33c4a5bf4b338885f012139b746` (local checkpoint).
- File: `release/results-tf-glm-tp3.json`.
- SHA-256: `917196d3b8180a6d8ac365569d14cbf8ce7cc1b9f076dab4e8dea58d41bd2b40`.
- State: `final`; tag/version: `v2.0.0`.
- Checkpoint freeze: `2026-09-29T15:27:27Z`; date: `2026-09-29`.

These are checkpoint metadata, not a publication decision. The final seal will
replace the dates and may replace measurements. The page remains noindex and
labelled as a preview. `published` stays null. The production gate refuses even
when the numbers file is final and otherwise qualified. Evidence URLs pin the
checkpoint commit; they await publication of the recipe source.

```sh
python3 scripts/glm_v2.py --fill "$FROZEN_NUMBERS" --review docs/jspark-v2/glm-v2-review.json
python3 scripts/glm_v2.py --check --preview --original "$FROZEN_NUMBERS"
```

The companion mapping binds source path/hash, commit and README hash to approved
nonnumeric presentation copy. The file has no `site_v2` object. A new seal requires
an updated hash-bound mapping and renewed validation; it cannot silently reuse
this checkpoint's mapping. Both version spellings `v2.0` and `v2.0.0` are accepted.

## Literal display contract

Raw numeric tokens pass through the parser without a float conversion, including
trailing zeroes. The sanitized snapshot preserves consumed values, conditions,
counts and traces for machine checks. The page renders only producer-supplied
`display` strings for measured figures. There is no numeric formatting fallback.
Missing or inconsistent display strings refuse the fill. Precision validation
checks the raw value against the display's precision tolerance without producing
a replacement string or choosing a rounding rule.

- RigMark median, slowest, repeats and signed percentage: `tf.rows.*.display`.
  Structured's signed tok/s margin is a display-only token in that same object.
- Reference values: each `tf.reference.*.display`. Conditions are the complete
  source sentences, rendered literally beside their tables. The earlier mapping
  rewrite is removed. Recipe topology and engine/weight differences remain
  separate qualifications in the companion.
- Exactness counts: `tf.exact.display`; drafting counters:
  `tf.exact.drafting_proof.display`. The headline remains the approved sealed
  README sentence, checked against the corpus, verdict and drafting proof. Scope,
  prompt-set disclosure and receipt come from the file.
- Quality counts: each `tf.quality.*.display`. The source's overall RigMark-gate
  NOT-RUN summary conflicts with its detailed PASS record; both statuses remain
  visible with a discrepancy note. The raw gate-count text has no display tokens
  and is retained only in the snapshot, not rendered as numerical copy.

Configuration labels, units, source prose and identifiers remain source labels;
they are not measured statistics. Raw request budgets, prompt/cache token arrays,
repeat counts, seeds and timestamps have no display strings. They remain available
for machine checks and receipts; the UI does not invent numerical display tokens
for them. Mode-specific budgets and cache behavior are disclosed in prose.

## Measurement families

The importer requires the complete matrix alongside single-stream RigMark:

| Family | Shape | Display and scope |
| --- | --- | --- |
| `tf.latency` | 18 measured cells | Separate first-token and first-content stats; seconds, lower is better; two decimal strings |
| `tf.prefill` | 4 measured, 1 not-measured | Cold prompt tokens / client first-token time; tok/s, higher is better; one decimal strings |
| `tf.decode` | 3 not-supported, 3 not-measured | Status and supplied reason; no zero or pending numerical substitutes |

Suffixless mode is **Max (default)**; `_think_off` mode is **Low**. Labels are
validated against rendered effort and serving-default fields. Low still reasons;
its first-token and first-content timings are never collapsed into one value.
The latency/prefill start is later than RigMark/exactness on the same build.
Warm resends currently miss the cache; appended turns reuse cached prompt tokens.

Conditional first-content stats exclude budget-censored observations, preserve
their traces and show a qualification beside the figure. Fully censored stats
are null and render “Not observed”. Missing/unsupported workloads instead render
“Not measured” / “Not supported” with the source reason. Queue behavior includes
the verified source read and receipt; it makes no concurrency-throughput claim.

The hub/share headline stays RigMark-only. Exactness is scoped to its own corpus.
Private serving metadata and internal source-read authority are omitted from the
public snapshot. The default drafter's non-commercial qualification is unchanged.

## Gates

```sh
python3 -m unittest discover -s scripts -p 'test_glm_v2.py'
python3 scripts/glm_v2.py --check --preview --original "$FROZEN_NUMBERS"
node scripts/check-glm-release.mjs
VERCEL_ENV=production node scripts/check-glm-build.mjs
```

The last two commands intentionally refuse with the preview-only publication
hold. Preview validation and Vercel preview builds pass independently. No command
above lifts the hold, merges a PR or writes to a CMS/social service.

Share card: `/jspark3/glm/share/`, a 1200 by 630 PNG, with the source hash in its
metadata URL. Fixture/interim input without a matching review cannot expose
results. Fixtures cannot overwrite measured source or use the review exception.
