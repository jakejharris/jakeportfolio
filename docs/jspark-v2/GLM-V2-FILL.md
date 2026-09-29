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

The fill accepts `release_m0`, `base_m0_*`, `opt_in_m1` and `v1_1` sets.
Only the release's own stock-weight start supplies current highlights. Missing
headline prefill needs `prefill_omitted_reason`. Decode cells remain required.
The release's prefill is 32k cold; `prefill_128k` and the separate RigMark code,
prose and structured rows keep their own instrument labels. There is no prose
stream figure: RigMark prose must never stand in for `decode_prose_c1` or
`decode_prose_c4`. The hub and share card therefore highlight code and prefill.

## Confirmed v2 mapping and remaining freeze inputs

The release numbers generator emits `site_v2` with these fields:

- `comparison`: `publisher: "mmastrac"`, `tensor_parallel: 3`, a pinned GitHub
  `source` URL, `same_instruments: true`, `same_conditions: false`, and
  `condition_differences`. The page prints the differences: upstream uses a 200G
  switch, while this release uses three DGX Sparks cabled as a triangle. Upstream
  figures are author-reported. Each reference cell has `lo`, `hi`, `unit: "tok/s"`,
  `class: "author-reported"`, and the same `instrument` string as its measured
  counterpart. No computed speedup or v1.8.4 comparison is shown.
- `quality`: `exact_class`, `verdict_bearing_prompts`, the approved `claim`,
  `known_issue`, `known_issue_fields` and a public evidence `source`. The checker
  copies the sentence unchanged, validates its prompt count against the literal
  numeric token, and requires a passing `v2.exact.verdict`.
  `EXACT-ON-CORPUS` permits only the scoped byte-identical sentence about the
  prompts whose no-drafter cold reruns were themselves identical.
  `NONEXACT-NEARTIE` permits only the predeclared-tolerance sentence. FAIL and
  INVALID are refused. The long-context issue is reported separately and never
  used to qualify the exactness verdict.
- `drafter_source`: an object with pinned `url` and `card` links, `license`,
  `license_url`, `without_drafter` and `mtp`. DFlash2 is non-commercial under
  CC BY-NC-ND 4.0 and is linked upstream only. JSpark3 does not distribute it;
  the licence's terms go with any copy.
- `publication` and `instruments`: recognized source metadata, retained in the
  original frozen file. They do not create install or run claims on this page.

The path qualifications are exact:

- `SPEC_METHOD=none: booted for this release, speed not measured`. This path
  avoids the non-commercial drafter.
- `SPEC_METHOD=mtp: wired but not booted at TP=3`. Its weights reach the shards
  unpadded and may not load; this path is not recommended.

The third amendment supersedes the earlier noise-based claim. No noise-floor
field or "lossless up to noise" wording is accepted. The approved long-context
known-issue sentence lives in `glm-v2-copy.json`, copied verbatim from that
amendment, and is also present with its structured fields in the fixture. At
freeze the page uses the supplied `quality.known_issue` beside the verdict.
The cause remains unassigned pending isolation of the serving stack.

The fixture exercises the confirmed comparison and drafter shapes with invented
benchmark bands. No interim benchmark figures, prompt count or quality verdict
have been filled. The final file, release date, freeze timestamp and installation
receipt remain pending. The declared tag is v2.0.0 and still needs the final seal.
Validate the final file's complete fields at freeze; never hand-fill missing facts.
Until the installation receipt passes, only an install-guide link is allowed,
with no fresh-machine runnability claim. The guide path is `jspark3/INSTALL.md`.

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
build both refuse the fixture, pending/interim freezes, missing comparison, missing
quality verdict or missing license link. CI's publication gate intentionally stays
red while this draft contains placeholders. Normal preview builds remain possible.
Once real measurements are filled, a fixture cannot overwrite them.

Share card: `/jspark3/glm/share/` (1200 by 630 PNG). It carries the full
release identity and license caveat in both preview and measured states. There
is no mutable generated PNG to forget to refresh.
Metadata includes the frozen source hash in the image URL to refresh cached previews.

This work prepares a draft. Filling data does not merge, publish a release or
deploy production. Publication still requires the release owner's go.
