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
