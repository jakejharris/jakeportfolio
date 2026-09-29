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
METRICS = ['prefill', 'decode_c1', 'decode_c2', 'decode_c4', 'decode_c8',
           'prefill_128k', 'rigmark_code', 'rigmark_prose', 'rigmark_structured']
ISSUE_FIELDS = {'prompt_tokens', 'first_divergence_output_token', 'output_tokens',
                'rerun_token_gap_nats', 'first_run_token_in_rerun_top5', 'cold_cold_first_divergence_token'}
# Reuse the existing public-text name screen without printing its private vocabulary.
NAME_DIGESTS = set(re.findall(r"'([a-f0-9]{64})'", (ROOT / 'scripts/check-glm-release.mjs').read_text()))
FORBIDDEN = re.compile(
    r'\u2014|/home/|/tmp/|/mnt/|~/|\\Users\\|\b[\w-]+\.local\b|'
    r'\b\d{1,3}(?:\.\d{1,3}){3}\b|boot[\s_-]*\d+|\bA\d+[\s_-]*[A-Z]\d*\b|'
    r'FINAL-|KGATE|\bfa\d+\b|\blane[\s_-]*\d+|%\d+|\bmia\b|flycockpit|byte[ -]exact', re.I)
CLAIMS = re.compile(r'switch|restart|hot[\s_-]*swap|\binstant|seamless|downtime|latency|equivalen|'
                    r'\bidentical|same quality|\bparity|scal(?:ed|ing)|\bfactor|\btax|\d\s*x\b|\bx\s*\d|\u00d7', re.I)


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


def text(value, where, claims=False):
    require(isinstance(value, str) and not isinstance(value, Number) and value.strip(), f'{where}: text required')
    require(not FORBIDDEN.search(value), f'{where}: forbidden public text')
    require(not re.search(r'\b[A-Z]\d+\b', value), f'{where}: internal identifier')
    require(not any(hashlib.sha256(w.lower().encode()).hexdigest() in NAME_DIGESTS
                    for w in re.findall(r'[A-Za-z0-9]+', value)), f'{where}: forbidden name')
    require(claims or not CLAIMS.search(value), f'{where}: unsupported claim')
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
    text(value, where, claims=True)
    parsed = urlparse(value)
    require(parsed.scheme == 'https' and parsed.hostname in ('github.com', 'huggingface.co') and
            not parsed.username and not parsed.password and not parsed.query and not parsed.fragment,
            f'{where}: public HTTPS evidence URL required')
    return value


def band(cell, where):
    result = {key + '_text': number(cell.get(key), where + '.' + key) for key in ('lo', 'hi')}
    require(Decimal(result['lo_text']) <= Decimal(result['hi_text']), f'{where}: inverted band')
    require(cell.get('unit') == 'tok/s', f'{where}: unit must be tok/s')
    result['unit'] = 'tok/s'
    result['instrument'] = text(cell.get('instrument'), where + '.instrument')
    if 'median' in cell:
        result['median_text'] = number(cell['median'], where + '.median')
        require(Decimal(result['lo_text']) <= Decimal(result['median_text']) <= Decimal(result['hi_text']), f'{where}: median outside band')
    if 'samples' in cell:
        result['samples_text'] = number(cell['samples'], where + '.samples', count=True)
    return result


def quality_claim(value, exact_class, prompts):
    """Validate the approved forms, then copy the supplied sentence unchanged."""
    claim = text(value, 'quality.claim', claims=True)
    forms = {
        'EXACT-ON-CORPUS': ("With the DFlash2 drafter, output was byte-identical to the no-drafter reference on the "
                            f"{prompts} test prompts whose no-drafter cold reruns were themselves identical "
                            "(greedy, temperature 0, this build)."),
        'NONEXACT-NEARTIE': ("Output stayed within the gate's predeclared tolerance: at the first divergence, the token "
                             "is in the reference's top 5 and at most 0.5 nat below it."),
    }
    require(exact_class in forms and claim == forms[exact_class], 'quality claim wording or prompt-count mismatch')
    return claim


def project(source, source_sha256):
    require(source.get('schema') == 'jspark3-results/1', 'unsupported results schema')
    require(source.get('tag') == 'v2.0.0' and source.get('version') == 'v2.0', 'expected GLM v2.0.0 tag and version')
    require(source.get('state') in ('fixture', 'pending', 'interim', 'final'), 'invalid freeze state')
    require(source.get('fixture') in (None, False, True), 'fixture must be a boolean')
    fixture = source.get('fixture') is True or source['state'] == 'fixture'
    conditions = text(source.get('conditions'), 'conditions')
    require(fixture or not re.search(r'fixture|synthetic|invented|placeholder', string_values(source), re.I), 'fixture markers in real source')
    require(source.get('decode_kind') == 'code', 'decode_kind must be code; other workloads need explicit mapping')
    if source.get('release_date'):
        date.fromisoformat(source['release_date'])
    if source.get('frozen_at'):
        require(datetime.fromisoformat(source['frozen_at'].replace('Z', '+00:00')).tzinfo is not None, 'freeze requires timezone')
    sets = source.get('sets')
    require(isinstance(sets, dict), 'sets must be keyed objects')
    rows, evidence_modes = [], {}
    for sid, serving in sets.items():
        require(re.fullmatch(r'release_m0|base_m0_[a-z0-9]+|opt_in_m1(?:_[a-z0-9]+)?|v1_1', sid), 'unknown serving set')
        if serving is None:
            require(sid == 'release_m0', 'only the headline set may be null')
            continue
        require(isinstance(serving, dict), 'invalid serving set')
        mode = number(serving.get('mode'), 'mode')
        require(mode == ('1' if sid.startswith('opt_in_m1') else '0'), 'set mode mismatch')
        build = serving.get('build')
        require(isinstance(build, str) and re.fullmatch(r'v\d+\.\d+(?:\.\d+)?', build), 'invalid set build')
        label = text(serving.get('label'), 'set label')
        require(len(label) <= 60, 'set label exceeds 60 characters')
        toggles = text(serving.get('toggles'), 'set toggles')
        starts = number(serving.get('serving_starts'), 'serving_starts', count=True)
        sweeps = number(serving.get('sweeps'), 'sweeps', count=True)
        if serving.get('prefill_omitted_reason') is not None:
            text(serving['prefill_omitted_reason'], 'prefill_omitted_reason')
        if sid == 'release_m0':
            require(build == source['tag'] and starts == '1', 'headline must be one start of the release build')
        cells = serving.get('cells')
        require(isinstance(cells, dict), 'cells must be keyed objects')
        shown = {}
        for cid, cell in cells.items():
            if not isinstance(cell, dict):
                continue
            for key in ('mode', 'build', 'toggles'):
                require(cell.get(key) == serving.get(key), f'{sid}.{cid}: {key} mismatch')
            require(cell.get('class') == ('historical' if sid == 'v1_1' else 'measured'), f'{sid}.{cid}: unmeasured or derived cell')
            hashes = re.findall(r'sha256:([0-9a-f]{64})', str(cell.get('evidence', '')))
            require(hashes, f'{sid}.{cid}: evidence hash required')
            require(fixture or '0' * 64 not in hashes, 'fixture evidence cannot qualify a release')
            for digest in hashes:
                require(digest not in evidence_modes or evidence_modes[digest] == mode, 'evidence reused across weight modes')
                evidence_modes[digest] = mode
            if cid in METRICS:
                shown[cid] = band(cell, f'{sid}.{cid}')
                if sid == 'v1_1':
                    require(cell['lo'] == cell['hi'], 'historical cell must be a single figure')
        if sid == 'release_m0':
            require(all(cid in shown for cid in METRICS[1:5]), 'headline is missing a required decode cell')
            if 'prefill' not in shown:
                text(serving.get('prefill_omitted_reason'), 'prefill_omitted_reason')
        require(shown, 'serving set has no displayable cells')
        rows.append(dict(id=sid, label=label, build=build, mode=mode, toggles=toggles,
                         serving_starts=starts, sweeps=sweeps, cells=shown,
                         prefill_omitted_reason=serving.get('prefill_omitted_reason')))
    release = next((row for row in rows if row['id'] == 'release_m0'), None)
    ext = source.get('site_v2') or {}
    require(isinstance(ext, dict), 'site_v2 must be an object')
    comparison = ext.get('comparison')
    if comparison is not None:
        require(comparison.get('publisher') == 'mmastrac' and comparison.get('tensor_parallel') == Number('3'), 'comparison must be mmastrac published TP3')
        ref = url(comparison.get('source'), 'comparison source')
        require(ref.startswith('https://github.com/mmastrac/') and re.search(r'/blob/[0-9a-f]{40}/', ref), 'comparison needs a pinned publication revision')
        require(comparison.get('same_instruments') is True, 'comparison requires matched instruments')
        require(comparison.get('same_conditions') is False, 'comparison must disclose different conditions')
        differences = comparison.get('condition_differences')
        require(isinstance(differences, list) and differences, 'comparison condition differences required')
        differences = [text(item, 'condition difference', claims=True) for item in differences]
        topology = ' '.join(differences)
        require('200G switch' in topology and 'cabled as a triangle' in topology, 'comparison topology differences required')
        ref_cells = comparison.get('cells')
        require(isinstance(ref_cells, dict) and ref_cells, 'comparison cells required')
        converted = {}
        for cid, cell in ref_cells.items():
            require(cell.get('class') == 'author-reported', 'reference must be author-reported')
            if release is None:
                continue  # Reference metadata alone never supplies measured headline figures.
            require(cid in release['cells'], 'comparison row absent from release')
            converted[cid] = band(cell, 'reference cell')
            require(converted[cid]['instrument'] == release['cells'][cid]['instrument'], 'comparison instrument mismatch')
        comparison = dict(publisher='mmastrac', source=ref, same_instruments=True,
                          same_conditions=False, condition_differences=differences, cells=converted)
    quality = ext.get('quality')
    if quality is not None:
        require(not (set(quality) - {'claim', 'exact_class', 'verdict_bearing_prompts', 'known_issue', 'known_issue_fields', 'source'}),
                'quality contains withdrawn or unsupported fields')
    if quality is not None and quality.get('claim') is None:
        quality = None
    if quality is not None:
        verdict = ((source.get('v2') or {}).get('exact') or {}).get('verdict')
        require(isinstance(verdict, str) and verdict.startswith('PASS'), 'quality requires a passing exactness verdict')
        prompts = number(quality.get('verdict_bearing_prompts'), 'quality.verdict_bearing_prompts', count=True)
        exact_class = quality.get('exact_class')
        known = text(quality.get('known_issue'), 'quality.known_issue', claims=True)
        require(not re.search(r'\bfloor\b', known, re.I), 'quality.known_issue: withdrawn wording')
        fields = quality.get('known_issue_fields')
        require(isinstance(fields, list) and fields, 'known-issue structured fields required')
        for item in fields:
            require(not (set(item) - ISSUE_FIELDS - {'prompt'}), 'unknown known-issue field')
            for key in ('prompt_tokens', 'first_divergence_output_token', 'output_tokens', 'rerun_token_gap_nats'):
                number(item.get(key), 'known_issue.' + key, count=key != 'rerun_token_gap_nats')
            require(type(item.get('first_run_token_in_rerun_top5')) is bool, 'known-issue token rank must be a boolean')
            if item.get('cold_cold_first_divergence_token') is not None:
                number(item['cold_cold_first_divergence_token'], 'known_issue.cold_cold_first_divergence_token', count=True)
            require(item['rerun_token_gap_nats'] + ' nat' in known, 'known-issue gap token mismatch')
        quality = dict(claim=quality_claim(quality.get('claim'), exact_class, prompts), exact_class=exact_class,
                       verdict_bearing_prompts_text=prompts, known_issue=known,
                       source=url(quality.get('source'), 'quality source'))
    if fixture or source['state'] != 'final' or not source.get('frozen_at') or not source.get('release_date'):
        quality = None
    drafter = ext.get('drafter_source')
    if drafter is not None:
        require(isinstance(drafter, dict), 'drafter_source must hold the pinned links and path qualifications')
        require(set(drafter) == {'url', 'card', 'license', 'license_url', 'without_drafter', 'mtp'}, 'unexpected drafter_source fields')
        require(drafter['license'] == 'CC BY-NC-ND 4.0' and
                drafter['license_url'] == 'https://creativecommons.org/licenses/by-nc-nd/4.0/', 'drafter license mismatch')
        require(drafter['without_drafter'] == 'SPEC_METHOD=none: booted for this release, speed not measured', 'no-drafter qualification mismatch')
        require(drafter['mtp'] == 'SPEC_METHOD=mtp: wired but not booted at TP=3', 'MTP qualification mismatch')
        for key, kind, suffix in [('url', 'tree', ''), ('card', 'blob', '/README.md')]:
            value = url(drafter[key], 'drafter ' + key)
            require(value == 'https://huggingface.co/incoai/GLM-5.3-Flash-DFlash2/' + kind +
                    '/bf582e4eacc1810f76656d1811693ff6c6737d2a' + suffix, 'drafter pinned revision mismatch')
    pending = []
    if fixture:
        pending.append('Fixture data: no benchmark was run.')
    if source['state'] != 'final' or not source.get('frozen_at') or not source.get('release_date'):
        pending.append('Final freeze and release date pending.')
    if release is None:
        pending.append('The release build has no measured serving start.')
    if comparison is None:
        pending.append('Published TP3 comparison and matched instruments pending.')
    if quality is None:
        pending.append('Quality verdict and verdict-bearing prompt scope pending.')
    if drafter is None:
        pending.append('DFlash2 upstream license and download link pending.')
    return dict(schema='jspark3-site/2', title=TITLE, fixture=fixture, pending=pending,
                source_sha256=source_sha256, frozen_at=source.get('frozen_at'),
                published=source.get('release_date'), conditions=conditions, sets=rows,
                comparison=comparison, quality=quality, drafter_source=drafter,
                social_image='/jspark3/glm/share/?v=' + source_sha256[:12],
                links=dict(release=REPO + '/releases/tag/v2.0.0', source=REPO + '/tree/v2.0.0',
                           results=REPO + '/blob/v2.0.0/release/results-v2.0.0.json',
                           numbers=REPO + '/blob/v2.0.0/release/RELEASE-NUMBERS.md'))


def snapshot(source):
    """Only the supported contract, with evidence hashes instead of local evidence paths."""
    kept = {key: source.get(key) for key in ('schema', 'state', 'fixture', 'frozen_at', 'tag', 'version',
            'release_date', 'decode_kind', 'conditions')}
    ext = source.get('site_v2')
    if ext:
        require(not (set(ext) - {'comparison', 'quality', 'drafter_source', 'publication', 'instruments'}),
                'unknown site_v2 fields; resolve the contract before filling')
    # Publication receipts and instrument-build metadata remain in the original file.
    kept['site_v2'] = {key: ext[key] for key in ('comparison', 'quality', 'drafter_source') if key in ext} if ext else None
    if (ext or {}).get('quality') is not None:
        quality = ext['quality']
        kept['site_v2']['quality'] = {**quality, 'known_issue_fields': [
            {key: value for key, value in item.items() if key in ISSUE_FIELDS}
            for item in quality.get('known_issue_fields', [])]}
    if source.get('v2'):
        kept['v2'] = {'exact': {'verdict': (source['v2'].get('exact') or {}).get('verdict')}}
    kept['sets'] = {}
    for sid, serving in source['sets'].items():
        if serving is None:
            kept['sets'][sid] = None
            continue
        row = {key: serving[key] for key in ('label', 'build', 'mode', 'toggles', 'serving_starts', 'sweeps')}
        if 'prefill_omitted_reason' in serving:
            row['prefill_omitted_reason'] = serving['prefill_omitted_reason']
        row['cells'] = {}
        for cid, cell in serving['cells'].items():
            if cid not in METRICS:
                continue
            row['cells'][cid] = {key: cell[key] for key in ('lo', 'hi', 'median', 'samples', 'unit', 'class', 'instrument', 'mode', 'build', 'toggles') if key in cell}
            row['cells'][cid]['evidence'] = ', '.join(re.findall(r'sha256:[0-9a-f]{64}', cell['evidence']))
        kept['sets'][sid] = row
    if kept['site_v2']:
        allowed = {'comparison', 'quality', 'drafter_source'}
        require(not (set(kept['site_v2']) - allowed), 'unknown site_v2 fields; resolve the contract before filling')
        for key, keys in [('comparison', {'publisher', 'tensor_parallel', 'source', 'same_conditions', 'same_instruments', 'condition_differences', 'cells'}),
                          ('quality', {'claim', 'exact_class', 'verdict_bearing_prompts', 'known_issue', 'known_issue_fields', 'source'})]:
            value = kept['site_v2'].get(key)
            if value:
                require(not (set(value) - keys), 'unknown public evidence field')
                if key == 'comparison':
                    for cell in value['cells'].values():
                        require(not (set(cell) - {'lo', 'hi', 'median', 'samples', 'unit', 'class', 'instrument'}), 'unknown reference cell field')
    return kept


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
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fill', type=Path, help='frozen numbers file; fill both the page and share card')
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--preview', action='store_true', help='validate structure while permitting visible pending evidence')
    parser.add_argument('--fixture', action='store_true', help='explicitly allow fake preview input')
    parser.add_argument('--original', type=Path, help='verify the exact original frozen source bytes')
    args = parser.parse_args()
    if args.fill:
        raw = args.fill.read_bytes()
        source = read(raw)
        digest = hashlib.sha256(raw).hexdigest()
        data = project(source, digest)
        require(args.fixture or not data['fixture'], 'fixture requires --fixture and cannot pass publication')
        public_source = snapshot(source)
        require(data == project(public_source, digest), 'public snapshot would drop visible data')
        if SOURCE.exists():
            previous = read(SOURCE.read_text())
            if not previous.get('fixture'):
                require(not data['fixture'], 'refusing to replace measured data with a fixture')
                prior = {sid for sid in previous['sets'] if sid.startswith('base_m0_')}
                require(prior <= set(source['sets']), 'cannot drop a previously recorded base start')
        SOURCE.write_text(dump(public_source) + '\n')
        DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
        print('Filled page and share card data. ' + ('Publication remains blocked: ' + '; '.join(data['pending']) if data['pending'] else 'Publication data checks pass.'))
    else:
        data = check(preview=args.preview, original=args.original)
        print('PASS: ' + ('preview structure; publication pending' if data['pending'] else 'publication data'))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, TypeError, OSError) as error:
        print('REFUSED: ' + str(error), file=sys.stderr)
        sys.exit(1)
