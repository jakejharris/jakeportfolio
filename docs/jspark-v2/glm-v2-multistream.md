# GLM v2.0.0 multi-stream preview

The preview preserves the earlier sealed single-stream checkpoint while the
replacement candidate packet is pending. Concurrent serving has separate rows
for 2, 4 and 8 streams. No scaling factor or reference comparison is inferred.
The publication hold remains enforced by the build and release validators.

## Packet boundary

The multi-stream producer has not frozen the release JSON interface.
`scripts/glm_v2_multistream.py` owns both the input mapping and its public
snapshot whitelist, including an outer-layout adapter if the packet changes its
container schema. Once the contract is sealed, only this file needs to change
to map the source cells. The renderer consumes the normalized contract below;
these names are a site interface, not proposed producer field names.

| Normalized field | Required meaning |
| --- | --- |
| `streams` | One of the literal labels `2`, `4`, `8`, in that order |
| `workload_label` | The packet's workload label; each workload has its own complete 2, 4, 8 stream rows |
| `status` | `pending` or `measured` |
| `aggregate` | Producer-supplied median, slowest repeat, repeats, repeat count, display strings and receipt traces |
| `instrument` | Instrument name and frozen revision, including the qualification of any extended ruler |
| `workload` | Prompt family, input/output budgets and effort mode |
| `timing` | Aggregate output numerator and wall-clock denominator with their start/end boundaries |
| `cache` | Cache state and prefix reuse conditions |
| `evidence` | Public receipt paths within the sealed release |

The mapped input also declares `unit: tok/s` and `better: higher`. Raw numeric
tokens and literal display strings are validated separately. The importer does
not create display strings, change precision or derive published rates. A
measurement with an unknown mapping is refused; missing results remain pending.

The final packet must supply its source revision, numbers hash, copy-source
hash, result path and updated per-check qualification. The quality document must
exist before its results are admitted:

```sh
python3 scripts/glm_v2.py --fill SEALED_NUMBERS --review SEALED_REVIEW --quality-run QUALITY_DOCUMENT
node scripts/check-glm-release.mjs --preview
```

The quality document is read and hashed by the importer. Updated sealed results
must include `agent_tools`, N/A for `nll` and `toolcall`, and raw `needle` results.
An overall PASS or a contenders-only result is refused. The earlier checkpoint's
incomplete panel stays hidden until those sealed per-check results are present.

## Private rehearsal

A fixture source may carry `site_rehearsal` with mapped multi-stream cells.
It must declare `fixture: true`. This reserved fixture key cannot enter real
source data. Rehearsals write only to a destination outside this repository:

```sh
python3 scripts/glm_v2.py --fill PRIVATE_FIXTURE --fixture --rehearsal PRIVATE_OUTPUT
```

The ordinary fill and validation paths refuse a visible rehearsal projection.
Browser rehearsal captures must show the synthetic banner. Fixture numbers and
screenshots are kept outside the public repository.

## Producer /2 boundary

`glm_v2_multistream.py` now projects `jspark3-results/2` independently of the
older `tf` checkpoint. Both winning variants use the same fill command. The
winning variant stays in the source projection; rendered data carries a serial
boolean, default stream count and optional opt-out setting instead.

The accepted producer pointers are `v2.rows.rigmark_code`, `rigmark_prose` and
`rigmark_structured`; `sparkdash.code.c1..c4`, `sparkdash.prose.c1..c4` and
`sparkdash.prefill.8k/16k/32k/64k/128k`; and `concurrency.default_streams`,
`concurrency.opt_out.setting` and the reviewed concurrency gates. Optional
`sparkdash.code.c8` or `prose.c8` is explicitly an extended ruler. Optional
`sparkdash.per_stream.<workload>.<cell>` is never divided out of an aggregate.
The sparkDash tables use one run per row, thinking off, with separate aggregate
and per-stream columns. RigMark keeps repeat statistics in its own table.

Every RigMark row must contain producer `display.median`, `display.worst` and
`display.values`. sparkDash must supply `display.<workload>.<cell>` and, when
per-stream rates exist, `display.per_stream.<workload>.<cell>`. Decode display
strings have one decimal; prefill display strings have zero decimals and allow
thousands separators. These are **required producer additions**, not fields
observed in the sample. The site refuses raw-only packets rather than applying
the card formatter. The lead must confirm display pointers/rule at the boundary
before calling the final integration ready.

Receipt objects must name public `release/receipts/*.json` exports with SHA-256
hashes. Instrument revision and output budget stay attached to sparkDash. No
comparison/reference block, private wrapper, or known-issue diagnosis is copied.
Exactness uses `site_v2.quality.claim` verbatim, bound to the winning
`v2.exact_scope.exact_result_sha256`, verdict-bearing prompt list and count.
`site_v2.publication.commit/tag` must match the hash-bound review revision/tag.
The quality document is independently read and hashed by `--quality-run` before
per-check results render; NLL/toolcall stay N/A and there is no overall PASS.

The hash-bound review's `site_v2.sections` may carry `admission`, `revisit`,
`effort`, `api` and `limitations`, each with `paragraphs` and public receipt
objects. This is a **site-owned review contract awaiting lead input**, not an
assertion about unknown producer fields. Missing sections render pending.
The API section must carry the exact winning build's installation qualification;
no earlier checkpoint receipt establishes final runnability. Admission must be
reviewed for that variant, including refusal before queueing for the serial
variant. Revisit capacity remains ESTIMATE without measurements, and a
bit-neutral claim needs the served-weights revisit equality receipt.

Optional `v2.latency`, `v2.prefill`, `v2.decode` use the existing trace-backed
measurement contract with separate `_high`, `_max`, `_think_off` rows. These
pointers are a proposed adapter input awaiting confirmation, not sample fields.
High has `effort_label: "High (default)"`, Max `"Max"`, Low `"Low"`; only High
has `serving_default: true`. Missing final matrices render pending and never
reuse checkpoint values. First-answer timing/censoring and client-effective
prefill retain their existing definitions.

A real fill requires `state: final`, final identity/date, source revision,
original hash and README hash-bound review. Sample and pending states refuse.
Synthetic fills run only with `fixture: true`, `state: fixture`, and
`--rehearsal` to a destination outside the repository; they never replace the
committed checkpoint. Publication hold is unconditional for either variant.
Producer finalization with N/A checks, final display pointers and final section
review remain external dependencies; accepting the sample's key shape does not
resolve them.
