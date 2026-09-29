"""The only boundary to change when the final multi-stream packet is sealed.

The producer has not frozen its JSON interface. Do not infer aggregate rates
from single-stream rates or read performance from implementation gate reports.
The normalized rows below belong to the site, not to the producer's schema.
"""

STREAMS = ('2', '4', '8')


def adapt_source(source):
    """Normalize a future packet here if its outer layout changes as well.

    Mapping must be idempotent and preserve original number/display tokens.
    The existing sealed single-stream contract already has the required layout.
    """
    return source


def pending():
    return [dict(id='streams-' + s, streams=s, workload_label=None, status='pending', aggregate=None, instrument=None,
                 workload=None, timing=None, cache=None, samples=None, evidence=[])
            for s in STREAMS]


def normalize(rows, ref, require, number, public_copy, receipt, measured_stats):
    """Validate mapped cells, keeping producer-supplied display strings verbatim."""
    require(isinstance(rows, list) and rows, 'multi-stream: rows required')
    groups = {}
    for row in rows:
        label = public_copy(row.get('workload_label'), 'multi-stream workload label')
        groups.setdefault(label, []).append(row.get('streams'))
    require(all(streams == list(STREAMS) for streams in groups.values()),
            'multi-stream: exactly 2, 4 and 8 streams required per workload')
    result = []
    for row in rows:
        require(row.get('status') == 'measured' and row.get('unit') == 'tok/s' and
                row.get('better') == 'higher', 'multi-stream: measured aggregate tok/s required')
        aggregate = measured_stats(row.get('aggregate') or {}, 1, 'higher', ref)
        require(aggregate['display'] is not None, 'multi-stream: aggregate result required')
        metadata = {key: public_copy(row.get(key), 'multi-stream ' + key)
                    for key in ('instrument', 'workload', 'timing', 'cache')}
        require('aggregate' in metadata['timing'].lower(), 'multi-stream: aggregate timing boundary required')
        evidence = row.get('evidence')
        require(isinstance(evidence, list) and evidence, 'multi-stream: receipts required')
        result.append(dict(id=row['workload_label'] + ':' + row['streams'],
                           streams=row['streams'], workload_label=row['workload_label'], status='measured', aggregate=aggregate,
                           samples=number(row['aggregate']['n'], 'multi-stream repeats', count=True),
                           evidence=[receipt(path, ref) for path in evidence], **metadata))
    return result


def project(source, ref, **validators):
    # Private rehearsals exercise the complete normalized data path. These keys
    # are deliberately not a proposed release schema and cannot enter real data.
    rehearsal = source.get('site_rehearsal')
    if rehearsal is not None:
        validators['require'](source.get('fixture') is True, 'multi-stream rehearsal requires fixture=true')
        return normalize(rehearsal, ref, **validators)
    decode = (source.get('tf') or {}).get('decode') or {}
    validators['require'](not any((decode.get('code_c' + s) or {}).get('class') == 'measured'
                                  for s in STREAMS),
                          'final multi-stream mapping is not sealed; update glm_v2_multistream.py')
    return pending()


def snapshot(source, require):
    """Whitelist only the mapped interface once the producer freezes it."""
    if 'site_rehearsal' not in source:
        return {}
    require(source.get('fixture') is True, 'multi-stream rehearsal requires fixture=true')
    return {'site_rehearsal': source['site_rehearsal']}
