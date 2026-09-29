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

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'app/(site)/jspark3/glm-v2-release.json'
SOURCE = ROOT / 'docs/jspark-v2/glm-v2-source.json'
TITLE = 'JSpark3 v2.0.0 (GLM-5.3-Flash, TP3)'
REPO = 'https://github.com/jakejharris/jspark3'
METRICS = ['rigmark_code', 'rigmark_prose', 'rigmark_structured']
# Reuse the existing public-text name screen without printing its private vocabulary.
NAME_DIGESTS = set(re.findall(r"'([a-f0-9]{64})'", (ROOT / 'scripts/check-glm-release.mjs').read_text()))
FORBIDDEN = re.compile(
    r'\u2014|/home/|/tmp/|/mnt/|~/|\\Users\\|\b[\w-]+\.local\b|'
    r'\b\d{1,3}(?:\.\d{1,3}){3}\b|boot[\s_-]*\d+|\bA\d+[\s_-]*[A-Z]\d*\b|'
    r'FINAL-|KGATE|\bfa\d+\b|\blane[\s_-]*\d+|%\d+|\bmia\b|flycockpit|byte[ -]exact', re.I)



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
                          r'commercial(?:ly)?[ -](?:clean|cleared|safe|ready)', value, re.I),
            f'{where}: unsupported release wording')
    return value


def receipt(value):
    require(isinstance(value, str) and re.fullmatch(r'release/receipts/[A-Za-z0-9_.-]+\.json', value),
            'public release receipt path required')
    return REPO + '/blob/v2.0.0/' + value


def pinned(value):
    value = url(value, 'reference source')
    require(value.startswith('https://github.com/mmastrac/') and re.search(r'/blob/[0-9a-f]{40}/', value),
            'pinned mmastrac source required')
    return value


def project(source, source_sha256):
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
    site = source.get('site_v2') or {}
    comparison = site.get('comparison')
    if comparison is not None:
        require(comparison.get('same_conditions') is False, 'comparison must not claim matched conditions')
        comparison = dict(source=pinned(comparison.get('source')), line_source=pinned(comparison.get('line_source')),
                          conditions=public_copy(comparison.get('conditions'), 'comparison conditions'),
                          engine_weights=public_copy(comparison.get('engine_weights'), 'comparison engine/weights'),
                          same_conditions=False)
        require('switched 200G fabric' in comparison['conditions'] and
                'not a matched-conditions comparison' in comparison['conditions'] and
                'cabled as a triangle' in comparison['conditions'], 'comparison fabric caveat required')
        require('TensorFold' in comparison['engine_weights'] and 'MLX' in comparison['engine_weights'] and
                'NVFP4' in comparison['engine_weights'], 'engine and weight differences required')
    rows = []
    references = tf.get('reference') or {}
    supplied = tf.get('rows') or {}
    require(not (set(supplied) - set(METRICS)), 'unsupported workload; only single-stream RigMark is in scope')
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
        reference_values = {}
        for key, expected_class in [('line', 'derived-midpoint'), ('upstream_tp3_set1', 'author-reported'), ('upstream_tp3_set2', 'author-reported')]:
            ref = references.get(key) or {}
            require(ref.get('class') == expected_class, 'reference provenance mismatch')
            reference_values[key + '_text'] = number(ref.get(cid), 'reference.' + key + '.' + cid)
        verdict = row.get('vs_line')
        expected_verdict = 'below' if cid == 'rigmark_prose' else 'above'
        require(verdict == expected_verdict, 'line verdict differs from approved release scope')
        line = Decimal(reference_values['line_text'])
        require(all(Decimal(v) > line for v in values) if verdict == 'above' else all(Decimal(v) < line for v in values),
                'every-repeat line claim unsupported')
        require(all(Decimal(v) > Decimal(reference_values[key + '_text']) for v in values for key in ('upstream_tp3_set1', 'upstream_tp3_set2')),
                'published TP3 comparison unsupported')
        require(row.get('vs_upstream_tp3') == 'above', 'neutral TP3 verdict required')
        margin = row.get('vs_line_pct')
        require(isinstance(margin, Number) and re.fullmatch(r'-?\d+(?:\.\d+)?', margin), 'literal margin token required')
        require((Decimal(margin) < 0) == (verdict == 'below'), 'margin sign disagrees with verdict')
        evidence = row.get('evidence')
        require(isinstance(evidence, list) and evidence, 'row evidence required')
        rows.append(dict(id=cid, median_text=median, worst_text=worst, samples_text=samples,
                         values_text=values, instrument=instrument, vs_line=verdict, margin_text=str(margin),
                         evidence=[receipt(path) for path in evidence], **reference_values))
    exact = tf.get('exact') or {}
    quality = None
    claim = site.get('exactness_claim')
    if claim is not None:
        claim = public_copy(claim, 'exactness claim')
        prompts = number(exact.get('prompts'), 'exact.prompts', count=True)
        require(prompts == '8' and number(exact.get('tested'), 'exact.tested', count=True) == prompts and
                number(exact.get('diverging'), 'exact.diverging') == '0', 'exactness corpus mismatch')
        require(exact.get('verdict') == 'PASS' and exact.get('exact_class') == 'EXACT-ON-CORPUS' and
                exact.get('engine') == 'tensorfold' and exact.get('rule') == 'hard', 'passing TensorFold exactness required')
        require(claim == f'Speculative output was byte-identical to serial decoding on its {prompts}-prompt greedy check at TP=3.',
                'unapproved exactness wording')
        scope = public_copy(exact.get('scope'), 'exactness scope')
        require('temperature 0' in scope and 'non-streaming' in scope and 'serving start' in scope and
                prompts + '-prompt' in scope and 'not a guarantee' in scope, 'exactness scope missing')
        proof = exact.get('drafting_proof') or {}
        require(all(proof.get(k) is True for k in ('counters_rose_on', 'counters_flat_off', 'per_reply_agree')), 'drafting proof required')
        require(exact.get('off_source') == 'same-boot switch: "draft": false', 'serial reference mismatch')
        require(re.fullmatch(r'[a-f0-9]{64}', exact.get('sha256', '')), 'exactness receipt hash required')
        quality = dict(claim=claim, scope=scope, source=receipt(exact.get('receipt')),
                       prompt_set_note=public_copy(exact.get('prompt_set_note'), 'prompt-set note'))
    summary = site.get('comparison_claim')
    if summary is not None:
        above = number(site.get('above_line_rows'), 'above_line_rows', count=True)
        total = number(site.get('total_rows'), 'total_rows', count=True)
        require(above == '2' and total == '3' and len(rows) == int(total), 'comparison count mismatch')
        require(summary == f'{above} of {total} single-stream RigMark rows are above the TP=2 to TP=4 line on every repeat; prose is below.',
                'unapproved comparison wording')
        public_copy(summary, 'comparison claim')
    limitations = site.get('limitations')
    require(limitations is None or isinstance(limitations, list), 'limitations must be a list')
    limitations = [public_copy(v, 'limitation') for v in limitations or []]
    checks = []
    panel = tf.get('quality') or {}
    for key, result in panel.items():
        if isinstance(result, dict) and result.get('status'):
            checks.append(dict(id=public_copy(key, 'check name'), status=public_copy(result['status'], 'check status'),
                               observed=public_copy(result['observed'], 'check result') if result.get('observed') else None,
                               failed_cases=[public_copy(case, 'failed case') for case in result.get('failed_cases', [])]))
    panel_note = public_copy(panel['overall'], 'quality scope') if panel.get('overall') else None
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
    if len(rows) != len(METRICS) or comparison is None or summary is None:
        pending.append('RigMark results and comparison qualification pending.')
    if quality is None:
        pending.append('Scoped exactness claim and evidence pending.')
    if not limitations or not panel_note:
        pending.append('Quality and release limitations pending.')
    if license_info is None or result_file is None:
        pending.append('Release links and license qualification pending.')
    # No measurement or result claim from a fixture/interim file reaches a consumer.
    visible = final and not pending
    return dict(schema='jspark3-site/2', title=TITLE, engine='TensorFold', fixture=fixture, publication_hold=True,
                pending=pending, source_sha256=source_sha256, published=source.get('release_date') if final else None,
                rows=rows if visible else [], comparison=comparison,
                comparison_claim=summary if visible else None, quality=quality if visible else None,
                checks=checks if visible else [], panel_note=panel_note if visible else None,
                limitations=limitations if visible else [], license=license_info,
                social_image='/jspark3/glm/share/?v=' + source_sha256[:12],
                links=dict(release=REPO + '/releases/tag/v2.0.0', source=REPO + '/tree/v2.0.0',
                           results=REPO + '/blob/v2.0.0/' + result_file if result_file else None))


def snapshot(source):
    """Keep only consumed fields; private boot metadata never enters the public repo."""
    def keep(value, keys):
        return {k: value[k] for k in keys if k in value}
    out = keep(source, ['schema', 'state', 'fixture', 'frozen_at', 'tag', 'version', 'release_date'])
    tf = source.get('tf') or {}
    out['tf'] = dict(identity=keep(tf.get('identity') or {}, ['engine_repo', 'weights', 'drafter']),
                     exact=keep(tf.get('exact') or {}, ['verdict', 'engine', 'rule', 'exact_class', 'scope', 'prompts',
                                                      'tested', 'diverging', 'drafting_proof', 'off_source', 'receipt', 'sha256', 'prompt_set_note']),
                     rows={key: keep(value, ['median', 'worst', 'values', 'n', 'unit', 'class', 'instrument', 'vs_line', 'vs_line_pct',
                                            'vs_upstream_tp3', 'evidence']) for key, value in (tf.get('rows') or {}).items()},
                     reference={key: keep(value, ['class'] + METRICS) for key, value in (tf.get('reference') or {}).items()
                                if key in ('line', 'upstream_tp3_set1', 'upstream_tp3_set2')},
                     quality={key: keep(value, ['status', 'observed', 'failed_cases']) if isinstance(value, dict) else value
                              for key, value in (tf.get('quality') or {}).items() if isinstance(value, dict) or key == 'overall'})
    if out['tf']['exact'].get('drafting_proof'):
        out['tf']['exact']['drafting_proof'] = keep(out['tf']['exact']['drafting_proof'], ['counters_rose_on', 'counters_flat_off', 'per_reply_agree'])
    site = source.get('site_v2') or {}
    out['site_v2'] = dict(site)
    require(not (set(out['site_v2']) - {'comparison', 'comparison_claim', 'above_line_rows', 'total_rows', 'exactness_claim',
                                       'limitations', 'license', 'results_path'}), 'unknown site fields; confirm final mapping')
    if site.get('comparison') is not None:
        out['site_v2']['comparison'] = keep(site['comparison'], ['source', 'line_source', 'conditions', 'engine_weights', 'same_conditions'])
    if site.get('license') is not None:
        out['site_v2']['license'] = keep(site['license'], ['notice', 'source'])
    text(string_values(out), 'public source')
    return out


def check(data_path=DATA, source_path=SOURCE, preview=False, original=None):
    data = json.loads(data_path.read_text())
    source = read(source_path.read_text())
    require(re.fullmatch(r'[0-9a-f]{64}', data.get('source_sha256', '')), 'original source hash required')
    require(data == project(source, data['source_sha256']), 'generated data differs from source tokens; run the fill')
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
    parser.add_argument('--preview', action='store_true')
    parser.add_argument('--fixture', action='store_true')
    parser.add_argument('--original', type=Path)
    args = parser.parse_args()
    if args.fill:
        raw = args.fill.read_bytes()
        source = read(raw)
        digest = hashlib.sha256(raw).hexdigest()
        data = project(source, digest)
        require(args.fixture or not data['fixture'], 'fixture requires --fixture')
        public_source = snapshot(source)
        require(data == project(public_source, digest), 'snapshot would drop visible data')
        if SOURCE.exists():
            previous = read(SOURCE.read_text())
            require(previous.get('fixture') or not data['fixture'], 'refusing to replace real source with fixture')
        SOURCE.write_text(dump(public_source) + '\n')
        DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
        print('Filled preview data. ' + ('Publication remains blocked: ' + '; '.join(data['pending']) if data['pending'] else 'Publication data checks pass.'))
    else:
        data = check(preview=args.preview, original=args.original)
        print('PASS: ' + ('preview structure; publication pending' if data['pending'] else 'publication data'))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, TypeError) as error:
        print('REFUSED: ' + str(error), file=sys.stderr)
        sys.exit(1)
