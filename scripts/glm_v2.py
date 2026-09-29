"""Literal-token fill and publication gate for the GLM TP3 release page."""
import argparse
from datetime import date, datetime
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlparse

import glm_v2_multistream as multistream

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'app/(site)/jspark3/glm-v2-release.json'
SOURCE = ROOT / 'docs/jspark-v2/glm-v2-source.json'
REVIEW = ROOT / 'docs/jspark-v2/glm-v2-review.json'
TITLE = 'JSpark3 v2.0.0 (GLM-5.3-Flash, TP3)'
REPO = 'https://github.com/jakejharris/jspark3'
METRICS = ['rigmark_code', 'rigmark_prose', 'rigmark_structured']
# Reuse the existing public-text name screen without printing its private vocabulary.
NAME_DIGESTS = set(re.findall(r"'([a-f0-9]{64})'", (ROOT / 'scripts/check-glm-release.mjs').read_text()))
FORBIDDEN = re.compile(
    r'\u2014|/home/|/tmp/|/mnt/|~/|\\Users\\|\b[\w-]+\.local\b|'
    r'\b\d{1,3}(?:\.\d{1,3}){3}\b|boot[\s_-]*\d+|\bA\d+[\s_-]*[A-Z]\d*\b|'
    r'\bW_[A-Z]\b|\b(?:codex|astra|sol|luna|terra|claude|sonnet|chatgpt)\b|FINAL-|KGATE|\bfa\d+\b|\blane[\s_-]*\d+|%\d+|\bmia\b|flycockpit|byte[ -]exact', re.I)



class Number(str):
    """An original JSON number token, including trailing zeroes."""


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read(raw):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, 'duplicate JSON key')
            result[key] = value
        return result
    return json.loads(raw, parse_int=Number, parse_float=Number,
                      parse_constant=lambda _: (_ for _ in ()).throw(ValueError('non-finite number')),
                      object_pairs_hook=unique)


def dump(value, level=0):
    """Serialize without converting any source number through a float."""
    if isinstance(value, Number):
        return str(value)
    if isinstance(value, dict):
        parts = [json.dumps(k) + ': ' + dump(v, level + 1) for k, v in value.items()]
        braces = ('{', '}')
    elif isinstance(value, list):
        parts = [dump(v, level + 1) for v in value]
        braces = ('[', ']')
    else:
        return json.dumps(value, ensure_ascii=False)
    if not parts:
        return ''.join(braces)
    return braces[0] + '\n' + ',\n'.join('  ' * (level + 1) + p for p in parts) + '\n' + '  ' * level + braces[1]


def text(value, where):
    require(isinstance(value, str) and not isinstance(value, Number) and value.strip(), f'{where}: text required')
    require(not FORBIDDEN.search(value), f'{where}: forbidden public text')
    require(not re.search(r'\b[A-Z]\d+\b', value), f'{where}: internal identifier')
    require(not any(hashlib.sha256(w.lower().encode()).hexdigest() in NAME_DIGESTS
                    for w in re.findall(r'[A-Za-z0-9]+', value)), f'{where}: forbidden name')
    return value


def number(value, where, count=False):
    require(isinstance(value, Number) and re.fullmatch(r'\d+(?:\.\d+)?', value), f'{where}: literal JSON number required')
    if count:
        require(re.fullmatch(r'[1-9]\d*', value), f'{where}: positive integer required')
    return str(value)


def string_values(value):
    if isinstance(value, dict):
        return ' '.join(string_values(v) for v in value.values())
    if isinstance(value, list):
        return ' '.join(string_values(v) for v in value)
    return value if isinstance(value, str) else ''


def url(value, where):
    text(value, where)
    parsed = urlparse(value)
    require(parsed.scheme == 'https' and parsed.hostname in ('github.com', 'huggingface.co') and
            not parsed.username and not parsed.password and not parsed.query and not parsed.fragment,
            f'{where}: public HTTPS evidence URL required')
    return value


def public_copy(value, where):
    value = text(value, where)
    require(not re.search(r'\bclearly\b|\bbeats\b|\bfastest\b|\bblazing\b|\bdramatic\w*\b|'
                          r'\bsignificantly\b|\bmassive\w*\b|\bunprecedented\b|always (?:exact|identical)|provably exact|speed[ -]win|'
                          r'\ball[ -](?:rows|three|3)\b|\bfloor\b|\bvLLM\b|'
                          r'commercial(?:ly)?[ -](?:clean|cleared|safe|ready)|\barx collectives\b', value, re.I),
            f'{where}: unsupported release wording')
    return value


def receipt(value, ref='v2.0.0'):
    require(isinstance(value, str) and re.fullmatch(r'release/receipts/[A-Za-z0-9_.-]+\.json', value),
            'public release receipt path required')
    return REPO + '/blob/' + ref + '/' + value


def pinned(value):
    value = url(value, 'reference source')
    require(value.startswith('https://github.com/mmastrac/') and re.search(r'/blob/[0-9a-f]{40}/', value),
            'pinned mmastrac source required')
    return value


def display_token(value, raw, precision, signed=False, percent=False, grouped=False):
    """Validate a supplied display token; never synthesize or round one."""
    digits = r'(?:\d{1,3}(?:,\d{3})+|\d+)' if grouped else r'\d+'
    pattern = ('[+-]' if signed else '') + digits
    pattern += (r'\.\d{' + str(precision) + '}') if precision else ''
    pattern += '%' if percent else ''
    require(isinstance(value, str) and not isinstance(value, Number) and re.fullmatch(pattern, value),
            'literal display string required')
    if raw is not None:
        require(isinstance(raw, Number), 'display requires a raw numeric token')
        # Check precision tolerance, leaving tie-breaking and spelling to the producer.
        require(abs(Decimal(value.rstrip('%').replace(',', '')) - Decimal(raw)) <= Decimal(10) ** -precision / 2,
                'display string disagrees with sealed value')
    return value


def stats_display(stats, precision):
    display = stats.get('display')
    require(isinstance(display, dict), 'statistics require source display strings')
    require(isinstance(display.get('values'), list) and len(display['values']) == len(stats['values']),
            'display repeat count mismatch')
    return dict(median=display_token(display.get('median'), stats['median'], precision),
                worst=display_token(display.get('worst'), stats['worst'], precision),
                values=[display_token(d, v, precision) for d, v in zip(display['values'], stats['values'])])


def quality_display(display):
    if display is None:
        return None
    require(isinstance(display, dict) and not (set(display) - {'passed', 'total', 'corrupt', 'percentage'}),
            'unsupported quality display fields')
    return {key: display_token(value, None, 1 if key == 'percentage' else 0, percent=key == 'percentage')
            for key, value in display.items()}


def traces(items, ref):
    require(isinstance(items, list), 'trace list required')
    result = []
    for item in items:
        if item.get('sha256') is not None:
            require(re.fullmatch(r'[a-f0-9]{64}', item['sha256']), 'trace hash required')
        pointers = {key: text(value, 'trace pointer') for key, value in item.items()
                    if key in ('pointer', 'numerator', 'denominator')}
        require(pointers and all(value.startswith(('/requests/', '/phases/')) for value in pointers.values()), 'request or phase trace required')
        result.append(dict(source=receipt(item.get('receipt'), ref), **pointers))
    return result


def measured_stats(stats, precision, better, ref, empty=False):
    n = number(stats.get('n'), 'stats.n')
    require(n.isdigit() and isinstance(stats.get('values'), list) and int(n) == len(stats['values']), 'stats repeat count mismatch')
    require(len(stats.get('trace', [])) == int(n), 'stats trace count mismatch')
    trace = traces(stats.get('trace'), ref)
    if n == '0':
        require(empty and stats.get('median') is None and stats.get('worst') is None and stats.get('display') is None,
                'empty statistics must be null, never zero')
        return dict(display=None, trace=trace)
    values = [Decimal(number(v, 'stats.values')) for v in stats['values']]
    median = Decimal(number(stats.get('median'), 'stats.median'))
    worst = Decimal(number(stats.get('worst'), 'stats.worst'))
    ordered = sorted(values)
    middle = len(values) // 2
    expected_median = ordered[middle] if len(values) % 2 else (ordered[middle - 1] + ordered[middle]) / 2
    require(abs(median - expected_median) <= Decimal('0.000000000001') and
            worst == (min(values) if better == 'higher' else max(values)), 'stats median or worst inconsistent')
    return dict(display=stats_display(stats, precision), trace=trace)


def measurement_conditions(row, cid):
    c = row.get('conditions') or {}
    low = cid.endswith('_think_off')
    high = cid.endswith('_high')
    explicit_max = cid.endswith('_max')
    require(c.get('effort_label') == ('Low' if low else 'High (default)' if high else 'Max' if explicit_max else 'Max (default)') and
            c.get('rendered_effort') == ('low' if low else 'high' if high else 'max') and
            c.get('serving_default') is (high or (not low and not explicit_max)) and c.get('thinking') is (False if low else None),
            'effort label and rendered mode mismatch')
    require(c.get('prompt') in ('short', '5k', '32k') and c.get('case') in ('cold', 'warm', 'turn') and
            cid.removesuffix('_think_off').removesuffix('_high').removesuffix('_max') == ('ttft_' + c['prompt'] + '_' + c['case'] if cid.startswith('ttft_') else 'prefill_' + c['prompt']),
            'prompt/case mapping mismatch')
    planned = int(number(c.get('planned_n'), 'conditions.planned_n', count=True))
    for key in ('prompt_tokens', 'cached_tokens'):
        require(isinstance(c.get(key), list) and len(c[key]) == planned, 'condition repeat count mismatch')
        for value in c[key]:
            require(number(value, key).isdigit(), 'token count must be an integer')
    require(all(Decimal(cached) <= Decimal(prompt) for cached, prompt in zip(c['cached_tokens'], c['prompt_tokens'])),
            'cached tokens exceed prompt tokens')
    require(c.get('stream') is True and c.get('streams') == '1' and c.get('temperature') == '0', 'streamed single-request greedy measurement required')
    number(c.get('max_tokens'), 'conditions.max_tokens', count=True)
    instrument = row.get('instrument') or {}
    require(instrument.get('name') == 'TTFT probe' and re.fullmatch(r'[a-f0-9]{64}', instrument.get('sha256', '')), 'probe identity required')
    number(instrument.get('version'), 'instrument.version', count=True)
    return dict(prompt=c['prompt'], case=c['case'], effort=c['effort_label'], instrument=instrument['name'])


def project_measurements(tf, ref, final=False):
    suffixes = ('_high', '_max', '_think_off') if final else ('', '_think_off')
    latency_ids = [f'ttft_{prompt}_{case}{suffix}' for suffix in suffixes
                   for prompt in ('short', '5k', '32k') for case in ('cold', 'warm', 'turn')]
    prefill_ids = [f'prefill_{prompt}{suffix}' for prompt in ('5k', '32k') for suffix in suffixes] + ['prefill_128k']
    decode_ids = ['decode_after_5k', 'decode_after_32k', 'decode_after_128k']
    result = {}
    for family, ids in [('latency', latency_ids), ('prefill', prefill_ids), ('decode', decode_ids)]:
        supplied = tf.get(family) or {}
        require(set(supplied) - ({'code_c2', 'code_c4', 'code_c8'} if family == 'decode' else set()) == set(ids), family + ': complete checkpoint matrix required')
        rows = []
        for cid in ids:
            row = supplied[cid]
            unit, better = ('s', 'lower') if family == 'latency' else ('tok/s', 'higher')
            require(row.get('unit') == unit and row.get('better') == better, 'measurement unit/direction mismatch')
            require(isinstance(row.get('evidence'), list), 'measurement evidence required')
            item = dict(id=cid, unit=unit, better=better, status=row.get('class'),
                        evidence=[receipt(path, ref) for path in row['evidence']])
            if row.get('class') in ('not-measured', 'not-supported'):
                require(family != 'latency', 'latency measurements required')
                require(row.get('median') is None and row.get('worst') is None and row.get('values') == [] and
                        row.get('n') == '0' and row.get('display') is None, 'status rows must not contain figures')
                item.update(reason=public_copy(row.get('reason'), 'measurement status reason'))
                if row['class'] == 'not-supported':
                    require(cid in ('code_c2', 'code_c4', 'code_c8'), 'unsupported status scope')
                    source_read = row.get('source_read') or {}
                    require(source_read.get('status') == 'VERIFIED' and row['evidence'], 'unsupported claim requires verified source and receipt')
                    require(row.get('label') == cid[-1] + ' streams', 'plain stream label required')
                    item.update(label=public_copy(row['label'], 'stream label'),
                                instrument=public_copy(row.get('instrument'), 'queue instrument'),
                                source_read={key: source_read[key] for key in ('status', 'engine_commit', 'citations', 'finding')})
                    public_copy(string_values(item['source_read']), 'source read')
                else:
                    require(cid == 'prefill_128k' or cid.startswith('decode_after_'), 'missing status scope')
                    require(row.get('instrument') is None and row['evidence'] == [], 'unmeasured row cannot imply a measurement')
                    item['label'] = cid.removeprefix('prefill_') if family == 'prefill' else 'After ' + cid.removeprefix('decode_after_')
            else:
                require(row.get('class') == 'measured' and family != 'decode' and cid != 'prefill_128k', 'unexpected measured class')
                require(row['evidence'], 'measurement receipt required')
                item.update(measurement_conditions(row, cid))
                if family == 'latency':
                    for key in ('first_token', 'first_content'):
                        stats = row.get(key) or {}
                        require(stats.get('unit') == unit and stats.get('better') == better, 'nested unit/direction mismatch')
                        item[key] = measured_stats(stats, 2, better, ref, empty=key == 'first_content')
                    content = row['first_content']
                    missing = number(content.get('missing'), 'first_content.missing')
                    require(missing.isdigit() and int(content['n']) + int(missing) == int(row['first_token']['n']) and
                            content.get('conditional') is (int(missing) > 0), 'conditional first-content accounting mismatch')
                    require(row['first_token']['n'] == row['conditions']['planned_n'], 'first-token repeat count mismatch')
                    censored = traces(content.get('censored_trace'), ref)
                    require(len(censored) == int(missing), 'censored trace count mismatch')
                    item['first_content'].update(conditional=content['conditional'], censored_trace=censored)
                    item['reasoning_tokens'] = measured_stats(row.get('reasoning_tokens') or {}, 0, 'lower', ref)
                    require(row['reasoning_tokens']['n'] == row['first_token']['n'], 'reasoning repeat count mismatch')
                else:
                    require(row['conditions'].get('case') == 'cold' and
                            row['conditions'].get('rate') == 'usage.prompt_tokens / client ttft_any' and
                            row['conditions'].get('measurement') == 'client-effective prefill; includes client overhead',
                            'client-effective prefill definition required')
                    item.update(measured_stats(row, 1, better, ref))
                    require(row['n'] == row['conditions']['planned_n'], 'prefill repeat count mismatch')
            rows.append(item)
        result[family] = rows
    return result


def project(source, source_sha256, review=None, rehearsal=False):
    if source.get('schema') == 'jspark3-results/2':
        return multistream.project_v2(source, source_sha256, review, rehearsal, sys.modules[__name__])
    source = multistream.adapt_source(source)
    require(source.get('schema') == 'jspark3-results/1', 'unsupported results schema')
    require(source.get('tag') in (None, 'v2.0.0') and source.get('version') in (None, 'v2.0', 'v2.0.0'),
            'expected JSpark3 v2.0.0 identity')
    require(source.get('state') in ('fixture', 'pending', 'interim', 'final'), 'invalid freeze state')
    require(source.get('fixture') is None or type(source['fixture']) is bool, 'fixture must be boolean')
    fixture = source.get('fixture') is True or source['state'] == 'fixture'
    if source.get('release_date'):
        date.fromisoformat(source['release_date'])
    if source.get('frozen_at'):
        require(source['frozen_at'].endswith('Z'), 'UTC freeze timestamp required')
        datetime.fromisoformat(source['frozen_at'].replace('Z', '+00:00'))
    final = (not fixture and source['state'] == 'final' and source.get('tag') == 'v2.0.0'
             and bool(source.get('frozen_at')) and bool(source.get('release_date')))
    tf = source.get('tf')
    require(isinstance(tf, dict), 'TensorFold results required')
    identity = tf.get('identity') or {}
    require(identity.get('engine_repo') == 'taussoe/TensorFold', 'TensorFold engine identity required')
    require(str(identity.get('weights', '')).startswith('Vontra/GLM-5.3-Flash-MLX-4bit-MTP@'), 'weights identity mismatch')
    require(str(identity.get('drafter', '')).startswith('incoai/GLM-5.3-Flash-DFlash2@'), 'drafter identity mismatch')
    for field in ('weights', 'drafter'):
        require(re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+@[a-f0-9]{40}', identity[field]), 'pinned weights/drafter revision required')
    require(fixture or not re.search(r'fixture|invented|synthetic|placeholder', string_values(snapshot(source)), re.I), 'fixture markers in real source')
    if review is not None:
        require(not fixture, 'sealed preview cannot authorize fixture data')
        require(review.get('source_sha256') == source_sha256, 'sealed preview source hash mismatch')
        require(re.fullmatch(r'[a-f0-9]{40}', review.get('commit', '')), 'sealed commit required')
        require((review.get('copy_source') or {}).get('path') == 'README.md' and
                re.fullmatch(r'[a-f0-9]{64}', review['copy_source'].get('sha256', '')), 'sealed copy source required')
        require(review.get('results_path') == (review.get('site_v2') or {}).get('results_path'), 'sealed results path mismatch')
    site = review['site_v2'] if review is not None else source.get('site_v2') or {}
    release_ref = review['commit'] if review is not None else 'v2.0.0'
    # The public TP2 comparison remains unproven. Legacy comparison facts stay
    # in the source snapshot, but no comparative values or claims reach the view.
    comparison = None
    rows = []
    supplied = tf.get('rows') or {}
    require(not (set(supplied) - set(METRICS)), 'unsupported workload; only single-stream RigMark is in scope')
    require('display_rows' not in site, 'display strings must come from the numbers file')
    for cid in METRICS:
        row = supplied.get(cid)
        if row is None:
            continue
        require(row.get('class') == 'measured' and row.get('unit') == 'tok/s', 'measured tok/s row required')
        instrument = public_copy(row.get('instrument'), 'instrument')
        require('RigMark' in instrument and 'single stream' in instrument, 'single-stream RigMark instrument required')
        median = number(row.get('median'), cid + '.median')
        worst = number(row.get('worst'), cid + '.worst')
        samples = number(row.get('n'), cid + '.n', count=True)
        values = row.get('values')
        require(isinstance(values, list) and len(values) == int(samples), 'repeat count mismatch')
        values = [number(value, cid + '.values') for value in values]
        require(min(map(Decimal, values)) == Decimal(worst) and min(map(Decimal, values)) <= Decimal(median) <= max(map(Decimal, values)),
                'median or slowest inconsistent with repeats')
        evidence = row.get('evidence')
        require(isinstance(evidence, list) and evidence, 'row evidence required')
        rows.append(dict(id=cid, median_text=median, worst_text=worst, samples_text=samples,
                         values_text=values, instrument=instrument,
                         evidence=[receipt(path, release_ref) for path in evidence]))
        rows[-1]['display'] = stats_display(row, 1)
    measurements = ({key: [] for key in ('latency', 'prefill', 'decode')} if fixture and not rehearsal else project_measurements(tf, release_ref))
    concurrent = multistream.project(source, release_ref, require=require, number=number, public_copy=public_copy,
                                     receipt=receipt, measured_stats=measured_stats)
    exact = tf.get('exact') or {}
    quality = None
    claim = site.get('exactness_claim')
    if claim is not None:
        claim = public_copy(claim, 'exactness claim')
        prompts = number(exact.get('prompts'), 'exact.prompts', count=True)
        require(prompts == '8' and number(exact.get('tested'), 'exact.tested', count=True) == prompts and
                number(exact.get('diverging'), 'exact.diverging') == '0', 'exactness corpus mismatch')
        for key in ('long_prompt_tokens', 'generated_tokens'):
            number(exact.get(key), 'exact.' + key, count=True)
        for key in ('tokens_after_first_on', 'verify_cycles_on', 'tokens_per_cycle', 'serial_rounds_off'):
            number((exact.get('drafting_proof') or {}).get(key), 'drafting_proof.' + key)
        exact_display = {key: display_token((exact.get('display') or {}).get(key), exact.get(key), 0, grouped=True)
                         for key in ('prompts', 'tested', 'long_prompt_tokens', 'generated_tokens')}
        proof_display = {key: display_token((exact.get('drafting_proof', {}).get('display') or {}).get(key),
                                           exact.get('drafting_proof', {}).get(key), precision, grouped=True)
                         for key, precision in [('tokens_after_first_on', 0), ('verify_cycles_on', 0),
                                                ('tokens_per_cycle', 2), ('serial_rounds_off', 0)]}
        require(exact.get('verdict') == 'PASS' and exact.get('exact_class') == 'EXACT-ON-CORPUS' and
                exact.get('engine') == 'tensorfold' and exact.get('rule') == 'hard', 'passing TensorFold exactness required')
        require(claim in (f'Speculative output was byte-identical to serial decoding on its {prompts}-prompt greedy check at TP=3.',
                          f'Output byte-identical to serial decoding at TP=3 on its own {prompts}-prompt greedy check, with speculative decoding on'),
                'unapproved exactness wording')
        scope = public_copy(exact.get('scope'), 'exactness scope')
        require('temperature 0' in scope and 'non-streaming' in scope and 'serving start' in scope and
                prompts + '-prompt' in scope and 'not a guarantee' in scope, 'exactness scope missing')
        proof = exact.get('drafting_proof') or {}
        require(all(proof.get(k) is True for k in ('counters_rose_on', 'counters_flat_off', 'per_reply_agree')), 'drafting proof required')
        require(exact.get('off_source') == 'same-boot switch: "draft": false', 'serial reference mismatch')
        require(re.fullmatch(r'[a-f0-9]{64}', exact.get('sha256', '')), 'exactness receipt hash required')
        quality = dict(claim=claim, scope=scope, display=exact_display, proof_display=proof_display,
                       source=receipt(exact.get('receipt'), release_ref),
                       prompt_set_note=public_copy(exact.get('prompt_set_note'), 'prompt-set note'))
    limitations = site.get('limitations')
    require(limitations is None or isinstance(limitations, list), 'limitations must be a list')
    limitations = [public_copy(v, 'limitation') for v in limitations or []]
    # A quality document must have been read and hashed by the fill command.
    # The old checkpoint does not contain the updated per-check panel.
    quality_hash = (review or {}).get('quality_run_sha256')
    require(quality_hash is None or re.fullmatch(r'[a-f0-9]{64}', quality_hash), 'quality document hash required')
    panel = tf.get('quality') or {}
    panel_ready = quality_hash is not None
    checks = []
    if panel_ready:
        require(all((panel.get(key) or {}).get('evidence') for key in ('agent_tools', 'needle', 'nll', 'toolcall')),
                'per-check qualification receipts required')
        for key in ('nll', 'toolcall'):
            require((panel.get(key) or {}).get('status') == 'N/A', 'TensorFold logprob checks must be N/A')
        require((panel.get('agent_tools') or {}).get('status') in ('PASS', 'FAIL', 'INVESTIGATE'),
                'agent_tools result required')
        require((panel.get('needle') or {}).get('status') in ('PASS', 'FAIL', 'INVESTIGATE'), 'raw needle result required')
        for key, result in panel.items():
            if isinstance(result, dict) and result.get('status'):
                require(not re.search(r'CONTENDERS[ _-]*ONLY', string_values(result), re.I), 'raw needle result required')
                checks.append(dict(id=public_copy(key, 'check name'), status=public_copy(result['status'], 'check status'),
                                   display=quality_display(result.get('display')),
                                   observed=public_copy(result['observed'], 'check result') if result.get('observed') else None,
                                   reason=public_copy(result['reason'], 'check reason') if result.get('reason') else None,
                                   source=receipt(result['evidence'], release_ref) if result.get('evidence') else None,
                                   failed_cases=[public_copy(case, 'failed case') for case in result.get('failed_cases', [])]))
        require((panel['agent_tools'].get('observed') or panel['agent_tools'].get('display')) and
                (panel['needle'].get('observed') or panel['needle'].get('display')), 'per-check results required')
        require(not re.search(r'\bPASS(?:ED)?\b', panel.get('overall', ''), re.I), 'no overall PASS allowed')
    panel_note = 'No overall claim is made. Each check is listed with its own status.' if panel_ready else None
    license_info = site.get('license')
    if license_info is not None:
        require(license_info.get('notice') == 'The default DFlash2 drafter is non-commercial (CC BY-NC-ND 4.0). No mode is cleared for commercial use.',
                'non-commercial drafter qualification required')
        license_info = dict(notice=license_info['notice'], source=url(license_info.get('source'), 'drafter license'))
    result_file = site.get('results_path')
    require(result_file is None or re.fullmatch(r'release/results-[A-Za-z0-9_.-]+\.json', result_file), 'results path required')
    pending = []
    if fixture:
        pending.append('Fixture data: no benchmark was run.')
    if not final:
        pending.append('Final freeze, release identity and date pending.')
    if len(rows) != len(METRICS):
        pending.append('Single-stream RigMark results pending.')
    if any(row['status'] != 'measured' for row in concurrent):
        pending.append('Sealed multi-stream results and source mapping pending.')
    if not panel_ready:
        pending.append('Updated per-check qualification and evidence pending.')
    if license_info is None or result_file is None:
        pending.append('Release links and license qualification pending.')
    visible = (not fixture and (final or review is not None)) or rehearsal
    require(not rehearsal or fixture, 'rehearsal requires fixture data')
    return dict(schema='jspark3-site/2', title=TITLE, engine='TensorFold', fixture=fixture, publication_hold=True,
                pending=pending, source_sha256=source_sha256, review_commit=review['commit'] if review else None, published=None,
                rows=rows if visible else [], comparison=comparison,
                **{key: value if visible else [] for key, value in measurements.items()},
                multistream=concurrent if visible else multistream.pending(),
                comparison_claim=None, quality=quality if visible and panel_ready else None,
                checks=checks if visible and panel_ready else [], panel_note=panel_note if visible else None,
                quality_notes=[], quality_run_sha256=quality_hash,
                limitations=limitations if visible else [], license=license_info,
                social_image='/jspark3/glm/share/?v=' + source_sha256[:12],
                links=dict(release=REPO + '/releases/tag/v2.0.0', source=REPO + '/tree/' + release_ref,
                           results=REPO + '/blob/' + release_ref + '/' + result_file if result_file else None))


def snapshot(source):
    """Keep only consumed fields; private boot metadata never enters the public repo."""
    if source.get('schema') == 'jspark3-results/2':
        out = multistream.snapshot_v2(source)
        # Internal variant and gate keys stay in the source projection only.
        public = dict(out); public.pop('variant', None); public.pop('concurrency', None)
        text(string_values(public), 'public source')
        return out
    source = multistream.adapt_source(source)
    def keep(value, keys):
        return {k: value[k] for k in keys if k in value}
    out = keep(source, ['schema', 'state', 'fixture', 'frozen_at', 'tag', 'version', 'release_date'])
    tf = source.get('tf') or {}
    out['tf'] = dict(identity=keep(tf.get('identity') or {}, ['engine_repo', 'weights', 'drafter']),
                     exact=keep(tf.get('exact') or {}, ['verdict', 'engine', 'rule', 'exact_class', 'scope', 'prompts',
                                                      'tested', 'diverging', 'long_prompt_tokens', 'generated_tokens', 'display',
                                                      'drafting_proof', 'off_source', 'receipt', 'sha256', 'prompt_set_note']),
                     rows={key: keep(value, ['median', 'worst', 'values', 'n', 'unit', 'class', 'instrument', 'vs_line', 'vs_line_pct',
                                            'vs_upstream_tp3', 'evidence', 'display']) for key, value in (tf.get('rows') or {}).items()},
                     reference={key: keep(value, ['class', 'conditions', 'display'] + METRICS) for key, value in (tf.get('reference') or {}).items()
                                if key in ('line', 'upstream_tp3_set1', 'upstream_tp3_set2')},
                     quality={key: keep(value, ['status', 'observed', 'reason', 'failed_cases', 'display', 'evidence']) if isinstance(value, dict) else value
                              for key, value in (tf.get('quality') or {}).items() if isinstance(value, dict) or key == 'overall'})
    if out['tf']['exact'].get('drafting_proof'):
        out['tf']['exact']['drafting_proof'] = keep(out['tf']['exact']['drafting_proof'],
            ['counters_rose_on', 'counters_flat_off', 'per_reply_agree', 'display', 'tokens_after_first_on',
             'verify_cycles_on', 'tokens_per_cycle', 'serial_rounds_off'])
    for family in ('latency', 'prefill', 'decode'):
        out['tf'][family] = {}
        for key, row in (tf.get(family) or {}).items():
            clean = keep(row, ['unit', 'better', 'class', 'conditions', 'instrument', 'evidence', 'first_token',
                              'first_content', 'reasoning_tokens', 'median', 'worst', 'values', 'n', 'display',
                              'reason', 'label', 'trace'])
            if row.get('source_read'):
                clean['source_read'] = keep(row['source_read'], ['status', 'engine_commit', 'citations', 'finding'])
            out['tf'][family][key] = clean
    site = source.get('site_v2') or {}
    out['site_v2'] = dict(site)
    require(not (set(out['site_v2']) - {'comparison', 'comparison_claim', 'above_line_rows', 'total_rows', 'exactness_claim',
                                       'limitations', 'license', 'results_path'}), 'unknown site fields; confirm final mapping')
    if site.get('comparison') is not None:
        out['site_v2']['comparison'] = keep(site['comparison'], ['source', 'line_source', 'topology', 'engine_weights', 'same_conditions'])
    if site.get('license') is not None:
        out['site_v2']['license'] = keep(site['license'], ['notice', 'source'])
    out.update(multistream.snapshot(source, require))
    text(string_values(out), 'public source')
    return out


def check(data_path=DATA, source_path=SOURCE, preview=False, original=None, review_path=None):
    data = json.loads(data_path.read_text())
    source = read(source_path.read_text())
    require(re.fullmatch(r'[0-9a-f]{64}', data.get('source_sha256', '')), 'original source hash required')
    if review_path is None and data_path == DATA and REVIEW.exists():
        review_path = REVIEW
    review = read(review_path.read_text()) if review_path else None
    require(data == project(source, data['source_sha256'], review), 'generated data differs from source tokens; run the fill')
    if original:
        raw = original.read_bytes()
        require(hashlib.sha256(raw).hexdigest() == data['source_sha256'], 'frozen source hash mismatch')
        require(dump(snapshot(read(raw))) == dump(source), 'frozen source projection mismatch')
    if not preview:
        require(not data['pending'], 'publication blocked: ' + '; '.join(data['pending']))
        require(not data['publication_hold'], 'publication blocked: preview-only hold; a separate publication decision is required')
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fill', type=Path)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--rehearsal', type=Path, help='write fixture projection outside the repository only')
    parser.add_argument('--quality-run', type=Path, help='read the completed quality document before admitting its sealed per-check results')
    parser.add_argument('--preview', action='store_true')
    parser.add_argument('--fixture', action='store_true')
    parser.add_argument('--original', type=Path)
    parser.add_argument('--review', type=Path, help='explicit sealed-preview mapping bound to the exact source hash')
    args = parser.parse_args()
    if args.fill:
        raw = args.fill.read_bytes()
        source = read(raw)
        digest = hashlib.sha256(raw).hexdigest()
        review = read(args.review.read_text()) if args.review else None
        if args.quality_run:
            require(review is not None, 'quality document requires a hash-bound review mapping')
            quality_doc = args.quality_run.read_bytes()
            require(b'PUBLIC-WORDS-BEGIN' in quality_doc and b'agent_tools' in quality_doc, 'completed quality document required')
            review['quality_run_sha256'] = hashlib.sha256(quality_doc).hexdigest()
        data = project(source, digest, review, rehearsal=args.rehearsal is not None)
        if args.rehearsal:
            require(data['fixture'], 'rehearsal requires fixture data')
            destination = args.rehearsal.resolve()
            require(not destination.is_relative_to(ROOT), 'rehearsal output must stay outside the public repository')
            destination.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
            print('Wrote private fixture rehearsal. Publication remains blocked.')
            return
        require(args.fixture or not data['fixture'], 'fixture requires --fixture')
        public_source = snapshot(source)
        require(data == project(public_source, digest, review), 'snapshot would drop visible data')
        if SOURCE.exists():
            previous = read(SOURCE.read_text())
            require(previous.get('fixture') or not data['fixture'], 'refusing to replace real source with fixture')
        if review is not None:
            REVIEW.write_text(dump(review) + '\n')
        else:
            require(not REVIEW.exists(), 'explicit review mapping required while a sealed preview is configured')
        SOURCE.write_text(dump(public_source) + '\n')
        DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
        print('Filled preview data. ' + ('Publication remains blocked: ' + '; '.join(data['pending']) if data['pending'] else 'Data qualified; publication hold remains.'))
    else:
        data = check(preview=args.preview, original=args.original, review_path=args.review)
        print('PASS: ' + ('preview structure; publication pending' if data['pending'] else 'qualified data; publication hold remains'))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, TypeError) as error:
        print('REFUSED: ' + str(error), file=sys.stderr)
        sys.exit(1)
