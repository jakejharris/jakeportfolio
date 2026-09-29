"""Positive and negative controls for literal provenance and the publication gate."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

import glm_v2 as gate


def sample():
    """Synthetic values in a complete contract, used only inside these tests."""
    source = gate.read((gate.ROOT / 'scripts/fixtures/glm-v2-results.fixture.json').read_text())
    source.update(state='final', fixture=False, release_date='2026-09-29', frozen_at='2026-09-29T12:00:00Z',
                  conditions='Code decode, simultaneous requests, fixed output length, cold cache.')
    serving = source['sets']['release_m0']
    serving['label'] = 'Stock weights, default recipe'
    for cell in serving['cells'].values():
        cell['instrument'] = 'Stream-span decode'
        cell['evidence'] = 'sha256:' + 'b' * 64
    serving['cells']['decode_c1']['lo'] = gate.Number('11.100')
    reference = {k: v for k, v in serving['cells']['decode_c1'].items() if k in ('lo', 'hi', 'unit', 'instrument')}
    reference['class'] = 'author-reported'
    source['site_v2'] = {
        'comparison': {'publisher': 'mmastrac', 'tensor_parallel': gate.Number('3'),
                       'source': 'https://github.com/mmastrac/example/blob/' + 'a' * 40 + '/README.md',
                       'same_conditions': True, 'cells': {'decode_c1': reference}},
        'quality': {'claim': gate.CLAIM, 'floor': gate.Number('0.0400'), 'unit': '%',
                    'metric': 'Repeat-run token disagreement', 'source': gate.REPO + '/blob/v2.0.0/release/QUALITY.md'},
        'drafter_source': 'https://huggingface.co/example/drafter',
    }
    return source


class PublicationTests(unittest.TestCase):
    def write_case(self, directory, source):
        source_path, data_path = Path(directory) / 'source.json', Path(directory) / 'data.json'
        public = gate.snapshot(source)
        raw = gate.dump(public)
        digest = hashlib.sha256(raw.encode()).hexdigest()
        data = gate.project(public, digest)
        source_path.write_text(raw)
        data_path.write_text(json.dumps(data))
        return data_path, source_path

    def test_complete_contract_and_literal_tokens(self):
        with tempfile.TemporaryDirectory() as directory:
            data_path, source_path = self.write_case(directory, sample())
            data = gate.check(data_path, source_path, original=source_path)
            self.assertEqual(data['sets'][0]['cells']['decode_c1']['lo_text'], '11.100')
            self.assertEqual(data['quality']['floor_text'], '0.0400')
            self.assertEqual(data['pending'], [])

    def test_fixture_refused_even_when_marker_is_cleared(self):
        source = gate.read((gate.ROOT / 'scripts/fixtures/glm-v2-results.fixture.json').read_text())
        with tempfile.TemporaryDirectory() as directory:
            paths = self.write_case(directory, source)
            gate.check(*paths, preview=True)
            with self.assertRaisesRegex(ValueError, 'publication blocked'):
                gate.check(*paths)
        source.update(state='final', fixture=False)
        with self.assertRaisesRegex(ValueError, 'fixture markers'):
            gate.project(source, '0' * 64)

    def test_generation_drift_and_wrong_original_refused(self):
        for mutation in ('rounded', 'wrong cell', 'deleted start', 'hidden pending', 'wrong original'):
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as directory:
                source = sample()
                source['sets']['base_m0_sample'] = copy.deepcopy(source['sets']['release_m0'])
                data_path, source_path = self.write_case(directory, source)
                data = json.loads(data_path.read_text())
                if mutation == 'rounded':
                    data['sets'][0]['cells']['decode_c1']['lo_text'] = '11.1'
                elif mutation == 'wrong cell':
                    data['sets'][0]['cells']['decode_c2'] = data['sets'][0]['cells']['decode_c4']
                elif mutation == 'deleted start':
                    data['sets'].pop()
                elif mutation == 'hidden pending':
                    data['fixture'] = True
                else:
                    source_path.write_text(source_path.read_text() + '\n')
                data_path.write_text(json.dumps(data))
                with self.assertRaisesRegex(ValueError, 'differs from source|hash mismatch'):
                    gate.check(data_path, source_path, original=source_path)

    def test_contract_refusals(self):
        cases = [
            ('wrong release', lambda s: s.update(tag='v2.0.3'), 'expected GLM'),
            ('wrong build', lambda s: s['sets']['release_m0'].update(build='v1.8.4'), 'headline must'),
            ('multiple starts', lambda s: s['sets']['release_m0'].update(serving_starts=gate.Number('2')), 'headline must'),
            ('wrong mode', lambda s: s['sets']['release_m0']['cells']['decode_c1'].update(mode=gate.Number('1')), 'mode mismatch'),
            ('wrong toggles', lambda s: s['sets']['release_m0']['cells']['decode_c1'].update(toggles='other'), 'toggles mismatch'),
            ('derived cell', lambda s: s['sets']['release_m0']['cells']['decode_c1'].update(**{'class': 'derived'}), 'derived cell'),
            ('missing decode', lambda s: s['sets']['release_m0']['cells'].pop('decode_c2'), 'required decode'),
            ('missing evidence', lambda s: s['sets']['release_m0']['cells']['decode_c1'].pop('evidence'), 'evidence hash'),
            ('number string', lambda s: s['sets']['release_m0']['cells']['decode_c1'].update(lo='11.100'), 'literal JSON number'),
            ('inverted band', lambda s: s['sets']['release_m0']['cells']['decode_c1'].update(lo=gate.Number('999')), 'inverted band'),
            ('wrong baseline', lambda s: s['site_v2']['comparison'].update(publisher='another publication'), 'published TP3'),
            ('wrong TP', lambda s: s['site_v2']['comparison'].update(tensor_parallel=gate.Number('2')), 'published TP3'),
            ('moving reference', lambda s: s['site_v2']['comparison'].update(source='https://github.com/mmastrac/example/blob/main/README.md'), 'pinned publication'),
            ('unmatched conditions', lambda s: s['site_v2']['comparison'].update(same_conditions=False), 'matched conditions'),
            ('wrong instrument', lambda s: s['site_v2']['comparison']['cells']['decode_c1'].update(instrument='A different instrument'), 'instrument mismatch'),
            ('wrong reference class', lambda s: s['site_v2']['comparison']['cells']['decode_c1'].update(**{'class': 'measured'}), 'author-reported'),
            ('unapproved exactness', lambda s: s['site_v2']['quality'].update(claim='Unqualified exactness'), 'claim wording'),
            ('floor string', lambda s: s['site_v2']['quality'].update(floor='0.0400'), 'literal JSON number'),
            ('internal name', lambda s: s.update(conditions='lane 42 results'), 'forbidden public text'),
            ('em dash', lambda s: s.update(conditions='Code\u2014decode'), 'forbidden public text'),
            ('unsupported claim', lambda s: s.update(conditions='Same quality, scaled throughput'), 'unsupported claim'),
        ]
        for name, edit, reason in cases:
            with self.subTest(name=name):
                source = sample()
                edit(source)
                with self.assertRaisesRegex(ValueError, reason):
                    gate.project(source, '0' * 64)

    def test_missing_evidence_blocks_publication_but_allows_preview(self):
        for field in ('comparison', 'quality', 'drafter_source'):
            with self.subTest(field=field), tempfile.TemporaryDirectory() as directory:
                source = sample()
                source['site_v2'].pop(field)
                paths = self.write_case(directory, source)
                gate.check(*paths, preview=True)
                with self.assertRaisesRegex(ValueError, 'publication blocked'):
                    gate.check(*paths)

    def test_evidence_must_not_cross_modes(self):
        source = sample()
        opt = copy.deepcopy(source['sets']['release_m0'])
        source['sets']['opt_in_m1'] = opt
        opt['mode'] = gate.Number('1')
        for cell in opt['cells'].values():
            cell['mode'] = gate.Number('1')
        with self.assertRaisesRegex(ValueError, 'evidence reused'):
            gate.project(source, '0' * 64)

    def test_sanitized_projection_preserves_tokens_and_removes_evidence_paths(self):
        source = sample()
        source['sets']['release_m0']['cells']['decode_c1']['evidence'] = 'private-evidence-file, sha256:' + 'b' * 64
        output = gate.dump(gate.snapshot(source))
        self.assertNotIn('private-evidence-file', output)
        self.assertIn('11.100', output)
        self.assertEqual(gate.project(source, '0' * 64), gate.project(gate.read(output), '0' * 64))

    def test_missing_release_never_promotes_base(self):
        source = sample()
        source['sets']['base_m0_sample'] = source['sets'].pop('release_m0')
        source['sets']['release_m0'] = None
        source['site_v2'].pop('comparison')
        data = gate.project(source, '0' * 64)
        self.assertTrue(any('no measured' in p for p in data['pending']))
        self.assertFalse(any(s['id'] == 'release_m0' for s in data['sets']))

    def test_historical_measurements_unchanged(self):
        raw = (gate.ROOT / 'app/(site)/jspark3/glm-release.json').read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(), '4b4a90e11362a299965f7359b05cd31c8ed2165d67739ecfa6616c7c81c549ad')
        c2 = next(row for row in json.loads(raw)['headline']['rows'] if row['id'] == 'decode_c2')
        self.assertIsNotNone(c2['median_text'])

    def test_real_checker_and_production_build_refuse_committed_fixture(self):
        import os
        pending = bool(json.loads(gate.DATA.read_text())['pending'])
        for command in (['node', 'scripts/check-glm-release.mjs'], ['node', 'scripts/check-glm-build.mjs']):
            result = subprocess.run(command, cwd=gate.ROOT, env={**os.environ, 'VERCEL_ENV': 'production'}, capture_output=True, text=True)
            if pending:
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('publication blocked', result.stderr)
            else:
                self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    unittest.main()
