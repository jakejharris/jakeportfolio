# JSpark3 v2.0.0 TensorFold preview fill

The page, hub and share card share one generated data file. The v1.8.4 page,
measurements and share image remain unchanged as history.

## Current sealed input

- Recipe commit: `6fffe3a34a44fc87ea1acc84841b58ecd35718cc`.
- File: `release/results-tf-glm-tp3.json`.
- SHA-256: `d07ff5f6ebcb0910e73398ab4b78b3fed434ccaca3cc4361d9eaa08ec7fbcc26`.
- Source version/tag: `v2.0.0`; state: `pending`; freeze and release dates: null.

The source bytes and metadata remain unchanged. The preview displays measured
results through an explicit review mapping bound to this exact hash. The page
remains noindex and labelled as a preview. The publication hold remains closed,
including if final release metadata is supplied later.

```sh
python3 scripts/glm_v2.py --fill "$FROZEN_NUMBERS" --review docs/jspark-v2/glm-v2-review.json
python3 scripts/glm_v2.py --check --preview --original "$FROZEN_NUMBERS"
```

The input path may use another filename if the bytes are identical. The mapping's
`results_path` determines the public link; no conventional alias is required.
Both version spellings `v2.0` and `v2.0.0` are accepted, with tag `v2.0.0`.
Final-state qualification requires `state: final`, a UTC `frozen_at` and a parseable
`release_date`. Those fields never remove the independent publication hold.

## Source and presentation mapping

`docs/jspark-v2/glm-v2-review.json` records the sealed commit, source path/hash and
README hash, plus the approved presentation fields. This is separate from the
numbers file: the supplied file has no `site_v2` object. A different file hash
cannot reuse this review mapping. The earlier proposed `site_v2` shape therefore
requires no upstream numbers-file rewrite for this preview.

The exactness headline is copied from the sealed README; its prompt count is
validated against the numbers file. Scope, prompt-set disclosure, exactness
verdict, drafting proof and receipt/hash come from `tf.exact`. The frontend has no
fixed exactness claim. The comparative sentence names code, structured and prose;
it does not invent a numeric headline count absent from the source.

- `tf.rows` supplies code/prose/structured single-stream RigMark medians, slowest
  repeats, every repeat token, sample counts, instruments, source percentages,
  verdicts and receipt paths.
- `tf.reference.line` and both published TP3 sets supply literal reference tokens.
  The site never computes the midpoint, rounds percentages, derives a speedup,
  chooses favorable rows or substitutes another workload.
- The legacy internal TP3 verdict enum is accepted only for the hash-bound review
  after the numeric comparisons pass. Its public projection uses neutral `above`;
  the retired intensifier never appears in page copy.
- `tf.quality` supplies observed results and unrun checks. Its overall summary
  lists RigMark gates as NOT-RUN while the detailed record says PASS. Both are
  retained, with an explicit note about the discrepancy; neither is repaired by
  the importer.
- The companion mapping supplies pinned reference URLs, the switched-200G and
  not-matched-conditions caveats, engine/weight differences, the non-commercial
  drafter notice, and release limitations grounded in the sealed docs.

Raw number tokens, including trailing zeroes and long signed percentages, pass
through the literal parser without float conversion. Full percentage tokens are
shown below the reference table so they remain readable on phones. The original
SHA-256 and exact public projection are verified by `--check --original`.
Private serving metadata is omitted; evidence links point to the sealed commit.

## Gates and verification

```sh
python3 -m unittest discover -s scripts -p 'test_glm_v2.py'
python3 scripts/glm_v2.py --check --preview --original "$FROZEN_NUMBERS"
node scripts/check-glm-release.mjs
```

The preview check passes after source-token, claim, evidence, comparison and
review-hash validation. The publication check intentionally fails: final source
state/dates are pending, and a separate preview-only hold also remains. A
production Vercel build invokes the same refusal. No filler or test removes that
hold or writes to a scheduler, CMS or social service.

Ordinary fixture/interim input without an explicit matching review cannot expose
results. Fixtures cannot use the sealed-preview exception, and cannot overwrite
this measured source. Tests exercise fixtures in isolation.

Share card: `/jspark3/glm/share/`, a 1200 by 630 PNG. Its metadata URL includes the
original source hash. It uses the same literal median tokens and scoped exactness
copy as the page, with the non-commercial drafter notice and preview label.
