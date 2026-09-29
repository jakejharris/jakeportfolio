# GLM TP3 release page

The current page, hub card and dynamic share card read one generated file. The
v1.8.4 data, code c2 measurements, share image and page are preserved at
`/jspark3/glm/v1.8.4/`.

Fill from the frozen `jspark3-results/1` file:

```sh
python3 scripts/glm_v2.py --fill "$FROZEN_NUMBERS"
python3 scripts/glm_v2.py --check --original "$FROZEN_NUMBERS"
```

The first command updates both the page and share card without rendering or
transcribing figures separately. It writes a public projection to
`docs/jspark-v2/glm-v2-source.json` and the generated page data to
`app/(site)/jspark3/glm-v2-release.json`. Evidence paths are replaced with their
SHA-256 references. The original file hash is retained. All number tokens are
copied from their original keys, including trailing zeroes. No figure, ratio,
headline winner or precision is calculated. Every base serving start is kept.

The fill accepts the existing contract: `release_m0`, `base_m0_*`, `opt_in_m1`
and `v1_1` sets; the five core cells; and optional prose and structured cells.
Only the release's own stock-weight start supplies current highlights. Missing
headline prefill needs `prefill_omitted_reason`. Decode cells remain required.
Other workload cells stay in the original results file. An unsupported set or
decode kind is refused for explicit mapping.

## Pending v2 evidence mapping

The original contract does not specify the new comparison or quality fields.
Until their mapping is agreed, missing evidence stays visibly pending and the
publication checker fails. The proposed optional `site_v2` object is:

- `comparison`: `publisher: "mmastrac"`, `tensor_parallel: 3`, a pinned GitHub
  `source` URL, `same_conditions: true`, and `cells` keyed like `release_m0`.
  Each reference cell has `lo`, `hi`, `unit: "tok/s"`,
  `class: "author-reported"`, and the identical `instrument` string. The
  page shows both ranges; it makes no computed speedup claim.
- `quality`: `claim: "lossless up to vLLM's own run-to-run noise"`, a literal
  numeric `floor`, its `unit`, its `metric`, and a public evidence `source`.
- `drafter_source`: the upstream DFlash2 license/download page. This is a
  link only. The default is non-commercial (CC BY-NC-ND); MTP-only is labelled
  "not measured at TP=3". No installation qualification is inferred.

Do not hand-fill missing release facts into this object. Adapt the mapping to
the release owner's frozen fields if they differ, then repeat the controls.

## Preview and publication checks

```sh
python3 scripts/glm_v2.py --fill scripts/fixtures/glm-v2-results.fixture.json --fixture
python3 scripts/glm_v2.py --check --preview
python3 -m unittest discover -s scripts -p 'test_glm_v2.py'
node scripts/check-glm-release.mjs
```

The fixture has explicit markers and invented values. The UI prints "Pending"
instead of those values. `--preview` validates the complete projection while
allowing pending evidence. The default publication checker and production Vercel
build both refuse the fixture, interim freezes, missing comparison, missing
quality floor or missing license link. CI's publication gate intentionally stays
red while this draft contains placeholders. Normal preview builds remain possible.
Once real measurements are filled, a fixture cannot overwrite them.

Share card: `/jspark3/glm/share/` (1200 by 630 PNG). It carries the full
release identity and license caveat in both preview and measured states. There
is no mutable generated PNG to forget to refresh.
Metadata includes the frozen source hash in the image URL to refresh cached previews.

This work prepares a draft. Filling data does not merge, publish a release or
deploy production. Publication still requires the release owner's go.
