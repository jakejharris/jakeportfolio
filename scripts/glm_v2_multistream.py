"""The only boundary to change when the final multi-stream packet is sealed.

The /2 producer keys are mapped below. Missing display and section contracts
remain explicit lead dependencies. Never infer aggregate rates from single-stream
rates or read performance from implementation gate reports.
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


# /2 keeps the producer's raw tokens. Display strings are a required producer
# addition: unlike the HF formatter, the site never manufactures display digits.
def snapshot_v2(source):
    def keep(value, keys):
        return {key: value[key] for key in keys if key in value}
    out = keep(source, ('schema', 'state', 'fixture', 'frozen_at', 'tag', 'version', 'release_date', 'variant'))
    v2 = source.get('v2') or {}
    out['v2'] = {
        'rows': {key: keep(row, ('median', 'worst', 'values', 'n', 'instrument', 'evidence', 'display'))
                 for key, row in (v2.get('rows') or {}).items() if key.startswith('rigmark_')},
        'quality': {key: keep(value, ('status', 'observed', 'reason', 'evidence')) for key, value in (v2.get('quality') or {}).items()}, 'quality_overall': v2.get('quality_overall'),
        'exact': keep(v2.get('exact') or {}, ('verdict', 'receipt')),
        'latency': v2.get('latency') or {}, 'prefill': v2.get('prefill') or {}, 'decode': v2.get('decode') or {},
        'exact_scope': keep(v2.get('exact_scope') or {}, ('exact_class', 'verdict_bearing', 'exact_result_sha256')),
    }
    out['site_v2'] = {'drafter_source': keep((source.get('site_v2') or {}).get('drafter_source') or {}, ('card', 'license')), 'publication': keep((source.get('site_v2') or {}).get('publication') or {}, ('repo', 'tag', 'commit')), 'quality': keep((source.get('site_v2') or {}).get('quality') or {},
                                   ('claim', 'exact_class', 'verdict_bearing_prompts'))}
    out['concurrency'] = keep(source.get('concurrency') or {}, ('default_streams', 'opt_out', 'gates'))
    sd = source.get('sparkdash') or {}
    out['sparkdash'] = keep(sd, ('status', 'code', 'prose', 'prefill', 'display', 'per_stream', 'evidence'))
    out['sparkdash']['instrument'] = keep(sd.get('instrument') or {}, ('repo', 'commit', 'max_tokens'))
    return out


def project_v2(source, digest, review, rehearsal, gate):
    r, n, copy = gate.require, gate.number, gate.public_copy
    fixture = source.get('fixture') is True
    r(source.get('state') == ('fixture' if fixture else 'final'), 'final /2 seal required; samples and pending packets refused')
    r(source.get('variant') in ('W_A', 'W_C'), 'winning variant required')
    r(source.get('tag') == 'v2.0.0' and source.get('version') in ('v2.0', 'v2.0.0'), 'final release identity required')
    gate.date.fromisoformat(source.get('release_date', ''))
    frozen = source.get('frozen_at', '')
    r(frozen.endswith('Z'), 'final freeze timestamp required')
    gate.datetime.fromisoformat(frozen.replace('Z', '+00:00'))
    r(not source.get('FAKE_VALUES') and (fixture or not gate.re.search(r'sample|synthetic|placeholder|invented', gate.string_values(snapshot_v2(source)), gate.re.I)), 'fake values refused')
    r(rehearsal is fixture, 'fixtures require private rehearsal; real fills cannot rehearse')
    r(fixture or review is not None, '/2 fill requires hash-bound site review')
    if review:
        r(review.get('source_sha256') == digest, 'sealed preview source hash mismatch')
        r(gate.re.fullmatch(r'[a-f0-9]{40}', review.get('commit', '')), 'sealed commit required')
        r((source.get('site_v2') or {}).get('publication', {}).get('commit') == review['commit'] and (source.get('site_v2') or {}).get('publication', {}).get('tag') == 'v2.0.0', 'winning source revision mismatch')
        r((review.get('copy_source') or {}).get('path') == 'README.md' and gate.re.fullmatch(r'[a-f0-9]{64}', review['copy_source'].get('sha256', '')), 'sealed copy source required')
    ref = review['commit'] if review else 'v2.0.0'
    site = (review or {}).get('site_v2') or {}
    def evidence(items):
        r(isinstance(items, list) and items, 'public export receipts required')
        links = []
        for item in items:
            r(isinstance(item, dict) and gate.re.fullmatch(r'[a-f0-9]{64}', item.get('sha256', '')) and item['sha256'] != '0'*64, 'receipt export hash required')
            links.append(gate.receipt(item.get('receipt'), ref))
        return links
    rows = []
    v2 = source.get('v2') or {}
    for key in gate.METRICS:
        row = (v2.get('rows') or {}).get(key) or {}
        median, worst = n(row.get('median'), key), n(row.get('worst'), key)
        count = n(row.get('n'), key, count=True)
        values = [n(value, key) for value in row.get('values', [])]
        r(len(values) == int(count) and min(map(gate.Decimal, values)) == gate.Decimal(worst), 'RigMark repeat mismatch')
        ordered = sorted(map(gate.Decimal, values)); mid = len(ordered)//2
        expected = ordered[mid] if len(ordered)%2 else (ordered[mid-1]+ordered[mid])/2
        r(abs(expected-gate.Decimal(median)) <= gate.Decimal('0.000000000001'), 'RigMark median mismatch')
        instrument = copy(row.get('instrument'), 'RigMark instrument')
        r('RigMark' in instrument and 'single stream' in instrument, 'single-stream RigMark instrument required')
        rows.append(dict(id=key, median_text=median, worst_text=worst, samples_text=count, values_text=values,
                         display=gate.stats_display(row, 1), instrument=instrument, evidence=evidence(row.get('evidence'))))
    sd = source.get('sparkdash') or {}
    r(sd.get('status') == 'RECORDED', 'recorded sparkDash results required')
    instrument = sd.get('instrument') or {}
    r(instrument.get('repo') == 'github.com/MiaAI-Lab/sparkDash' and gate.re.fullmatch(r'[a-f0-9]{40}', instrument.get('commit', '')), 'pinned sparkDash instrument required')
    budget = n(instrument.get('max_tokens'), 'sparkDash output budget', count=True)
    links = evidence(sd.get('evidence'))
    cells = []
    for workload, keys in (('code', ('c1','c2','c3','c4')), ('prose', ('c1','c2','c3','c4')), ('prefill', ('8k','16k','32k','64k','128k'))):
        supplied = sd.get(workload) or {}
        r(set(supplied) <= set(keys) | ({'c8'} if workload != 'prefill' else set()), 'unknown sparkDash cell')
        for key in (*keys, *(['c8'] if 'c8' in supplied else [])):
            raw = supplied.get(key)
            n(raw, 'sparkDash value')
            display = gate.display_token(((sd.get('display') or {}).get(workload) or {}).get(key), raw, 0 if workload == 'prefill' else 1, grouped=workload == 'prefill')
            per = ((sd.get('per_stream') or {}).get(workload) or {}).get(key)
            if per is not None:
                n(per, 'per-stream value')
                per = gate.display_token((((sd.get('display') or {}).get('per_stream') or {}).get(workload) or {}).get(key), per, 1)
            cells.append(dict(id=workload+'-'+key, workload=workload, label=key[1:]+' streams' if key.startswith('c') else key,
                              display=display, per_stream=per, extension=key=='c8'))
    concurrency = source.get('concurrency') or {}
    default = n(concurrency.get('default_streams'), 'default streams', count=True)
    r(default == '1' if source['variant']=='W_A' else default in ('2','4','8'), 'candidate default mismatch')
    setting = None
    if source['variant'] == 'W_C':
        setting = copy((concurrency.get('opt_out') or {}).get('setting'), 'opt-out setting')
        for key in ('C-4', 'C-6', 'C-7', 'C-8', 'C-9', 'C-11'):
            r(str((concurrency.get('gates') or {}).get(key, '')).startswith('PASS'), 'concurrency review gate missing')
    # Missing section pointers are explicitly owner-controlled. The site does not
    # turn template claims or an earlier checkpoint into the winning run's facts.
    sections = {}
    for key in ('admission', 'revisit', 'api', 'effort', 'limitations'):
        mapped = (site.get('sections') or {}).get(key)
        if mapped:
            r(isinstance(mapped.get('paragraphs'), list) and mapped['paragraphs'], 'section copy required')
            sections[key] = dict(paragraphs=[copy(value, 'section '+key) for value in mapped['paragraphs']], evidence=evidence(mapped.get('evidence')))
    quality = None
    q = (source.get('site_v2') or {}).get('quality') or {}
    if q.get('claim'):
        scope = v2.get('exact_scope') or {}
        r(str((v2.get('exact') or {}).get('verdict', '')).startswith('PASS'), 'winning exactness verdict required')
        r(gate.re.fullmatch(r'[a-f0-9]{64}', scope.get('exact_result_sha256', '')) and scope['exact_result_sha256'] != '0'*64, 'winning exactness receipt hash required')
        prompts = n(q.get('verdict_bearing_prompts'), 'exactness prompts', count=True)
        r(isinstance(scope.get('verdict_bearing'), list) and len(scope['verdict_bearing']) == int(prompts) and q.get('exact_class') == scope.get('exact_class'), 'winning exactness scope mismatch')
        claim = copy(q['claim'], 'winning exactness claim')
        r(prompts+' test prompts' in claim and 'arx' not in claim.lower(), 'scoped builder claim required')
        quality = dict(claim=claim, source=gate.receipt((v2.get('exact') or {}).get('receipt'), ref))
    checks = []
    panel = v2.get('quality') or {}
    r(v2.get('quality_overall') != 'PASS', 'no overall PASS allowed')
    quality_hash = (review or {}).get('quality_run_sha256')
    if quality_hash:
        r(gate.re.fullmatch(r'[a-f0-9]{64}', quality_hash), 'quality document hash required')
        for key in ('nll','toolcall'):
            r((panel.get(key) or {}).get('status') == 'N/A' and (panel.get(key) or {}).get('reason'), 'logprob checks must be N/A with reasons')
        r((panel.get('agent_tools') or {}).get('status') in ('PASS','FAIL','INVESTIGATE') and (panel.get('agent_tools') or {}).get('observed'), 'agent_tools observed result required')
        r((panel.get('needle') or {}).get('status') in (None,'NOT-RUN','INVESTIGATE'), 'raw needle status required')
        r((panel.get('needle') or {}).get('status') != 'INVESTIGATE' or (panel.get('needle') or {}).get('observed'), 'raw needle observed result required')
        for key, value in panel.items():
            checks.append(dict(id=copy(key, 'check'), status=copy(value.get('status'), 'status'), observed=copy(value['observed'], 'observed') if value.get('observed') else None,
                               reason=copy(value['reason'], 'reason') if value.get('reason') else None, display=None, source=evidence(value.get('evidence'))[0], failed_cases=[]))
    measurements = gate.project_measurements(v2, ref, final=True) if v2.get('latency') else {key: [] for key in ('latency','prefill','decode')}
    drafter = (source.get('site_v2') or {}).get('drafter_source') or {}
    license_info = None
    if drafter.get('card'):
        card = gate.url(drafter['card'], 'drafter terms')
        r(card.startswith('https://huggingface.co/incoai/GLM-5.3-Flash-DFlash2/blob/') and gate.re.search(r'/blob/[a-f0-9]{40}/README\.md$', card) and drafter.get('license') == 'CC BY-NC-ND 4.0', 'pinned drafter terms required')
        license_info = dict(notice='The default DFlash2 drafter is non-commercial (CC BY-NC-ND 4.0).', source=card)
    result_path = site.get('results_path')
    r(fixture or result_path == review.get('results_path'), 'sealed results path mismatch')
    r(result_path is None or gate.re.fullmatch(r'release/results-[A-Za-z0-9_.-]+\.json', result_path), 'public results path required')
    pending = ['Winning '+key+' copy and evidence pending.' for key in ('admission','revisit','api','effort','limitations') if key not in sections]
    if not measurements['latency']: pending.append('Winning High, Max and Low latency/prefill matrices pending.')
    if not quality_hash: pending.append('Updated per-check qualification and evidence pending.')
    if not quality: pending.append('Winning exactness receipt and claim pending.')
    if not license_info: pending.append('Pinned component licence sources pending.')
    if not result_path: pending.append('Public results export pending.')
    if fixture: pending.append('Fixture data: no benchmark was run.')
    return dict(schema='jspark3-site/2', title=gate.TITLE, engine='TensorFold', fixture=fixture, publication_hold=True,
                pending=pending, source_sha256=digest, review_commit=review['commit'] if review else None, published=None,
                rows=rows, comparison=None, comparison_claim=None, **measurements, multistream=[],
                sparkdash=dict(cells=cells, evidence=links, instrument='sparkDash (MiaAI-Lab)', revision=instrument['commit'], max_tokens=budget),
                serving=dict(default_streams=default, opt_out=setting, serial=source['variant']=='W_A'), sections=sections,
                builder_quality=quality, quality=None, checks=checks, panel_note='No overall claim is made. Each check is listed with its own status.' if quality_hash else None,
                quality_notes=[], quality_run_sha256=quality_hash, limitations=[], license=license_info,
                social_image='/jspark3/glm/share/?v='+digest[:12],
                links=dict(release=gate.REPO+'/releases/tag/v2.0.0', source=gate.REPO+'/tree/'+ref, results=gate.REPO+'/blob/'+ref+'/'+result_path if result_path else None))
