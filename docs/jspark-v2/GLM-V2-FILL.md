# JSpark3 v2.0.0 TensorFold preview

`/jspark3/glm/` prepares JSpark3 v2.0.0 (GLM-5.3-Flash, TP3) on the TensorFold
engine. The hub and share card read the same generated data. v1.8.4 and its
measured code c2 row remain unchanged at `/jspark3/glm/v1.8.4/`.

This branch is preview only. No fill publishes, merges, changes the recipe's
main branch or clears the production hold. The route stays noindex and carries
a preview label even after a complete data fill. Publication is a separate decision.

## Fill when the final file is supplied

```sh
python3 scripts/glm_v2.py --fill "$FROZEN_NUMBERS"
python3 scripts/glm_v2.py --check --preview --original "$FROZEN_NUMBERS"
```

The release owner will supply the resealed file under `release/results-*.json`
on `jakejharris/jspark3`'s v2 branch, tagged v2.0.0. The final path and field mapping
are pending. No candidate measurements have been filled. Do not substitute an
interim file or numbers quoted in correspondence.

The fill writes `docs/jspark-v2/glm-v2-source.json` and
`app/(site)/jspark3/glm-v2-release.json`. It preserves literal JSON number tokens,
including trailing zeroes and signed margins, and records the original file's
SHA-256. Validation compares values; it does not calculate published percentages,
midpoints, speedups, ranges or row-count claims. Unsupported or missing fields
must be resolved against the frozen source, never filled by hand.

## TensorFold mapping

The preview follows the candidate file's `jspark3-results/1` and `tf` shape:

- Top-level `tag`, `version`, `state`, `release_date`, `frozen_at` identify the
  final release. Fixture, pending and interim states expose no measured figures.
- `tf.identity.engine_repo`, `weights`, `drafter` identify TensorFold and pinned
  model revisions. Private serving metadata is excluded from the public snapshot.
- `tf.rows.rigmark_code`, `rigmark_prose`, `rigmark_structured` supply `median`,
  `worst`, every repeat in `values`, `n`, `unit`, `class`, `instrument`,
  `vs_line`, `vs_line_pct`, `vs_upstream_tp3` and public receipt paths in `evidence`.
  Only single-stream RigMark rows are supported. The whole table is retained,
  including prose below the line. Neutral `above` is the accepted TP3 verdict.
- `tf.reference.line`, `upstream_tp3_set1` and `upstream_tp3_set2` supply each
  row's literal reference tokens and provenance class. The line is supplied as
  `derived-midpoint`; the site does not compute it. Published sets are
  `author-reported`. No other reference becomes a column.
- `tf.exact` supplies verdict, engine, rule, class, prompt counts, divergence
  count, scope, same-start serial-reference definition, drafting proof,
  receipt/hash and prompt-set disclosure. FAIL or INVALID cannot supply a claim.
- `tf.quality` supplies the measured check statuses/results and overall scope.
  Unrun checks remain visible alongside results. Release limitations must be
  supplied separately as approved prose, including installation qualifications.

The following `site_v2` publication fields are **proposed handoff fields**,
exercised by the fixture and tests. They must be confirmed or mapped to the actual
frozen file when it arrives; the candidate inspected during preparation does not
supply them yet:

- `exactness_claim`: the approved scoped sentence, copied unchanged. The checker
  binds its prompt count to `tf.exact.prompts`, the passed/tested count and the
  TensorFold exactness receipt. There is no frontend claim fallback.
- `comparison_claim`, `above_line_rows`, `total_rows`: approved wording and literal
  counts. The current allowed scope is two of three RigMark rows above the
  TP2-to-TP4 line on every repeat, with prose below. Each repeat must support the
  corresponding verdict. A missing repeat or a contrary result is refused.
- `comparison`: pinned `source` and `line_source` URLs, `same_conditions: false`,
  `conditions` and `engine_weights` prose. The page requires and prints the
  switched-200G versus cabled-triangle caveat, the explicit statement that this
  is not a matched-conditions comparison, and engine/weight differences.
- `license`: the non-commercial default drafter notice, no commercial-use
  clearance, and a pinned public `source` URL.
- `limitations`: approved release-specific disclosures, copied unchanged.
- `results_path`: the actual `release/results-*.json` filename at the tag.

Exactness leads the page. Comparison wording is limited to the approved scoped
sentence; no intensifiers, speed-win claim or all-rows claim is accepted. The
checker also refuses missing comparison caveats, invented/fixture markers in a
real source, unscoped exactness, row substitution, rounding, missing receipts,
private paths and public-copy hygiene violations. The non-commercial notice
appears on the page, hub and share card. No commercial-use clearance is offered.

## Verification and publication hold

```sh
python3 scripts/glm_v2.py --fill scripts/fixtures/glm-v2-results.fixture.json --fixture
python3 scripts/glm_v2.py --check --preview --original scripts/fixtures/glm-v2-results.fixture.json
python3 -m unittest discover -s scripts -p 'test_glm_v2.py'
node scripts/check-glm-release.mjs
```

The last command intentionally refuses publication. It requires complete evidence
and refuses the explicit preview-only hold even when synthetic final data passes
all data checks. `VERCEL_ENV=production` invokes the same refusal before building.
Regular preview builds validate the projection and remain available for review.
No test or filler removes the hold or writes to a CMS, scheduler or social service.

Share card: `/jspark3/glm/share/`, a 1200 by 630 PNG with the source-hash query in
metadata. It shows the same single-stream median tokens and scoped exactness text
as the page, with Pending in their place until the final input is qualified.
