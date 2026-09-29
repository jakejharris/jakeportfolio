"""Independent controls for the TensorFold preview, literal provenance and copy."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

import glm_v2 as gate


def sample():
    """Invented complete input, never a benchmark or a release receipt."""
    source = gate.read((gate.ROOT / 'scripts/fixtures/glm-v2-results.fixture.json').read_text())
    source.pop('_note', None)
    source.update(state='final', fixture=False, frozen_at='2026-09-29T14:00:00Z', release_date='2026-09-29')
    for row in source['tf']['rows'].values():
        row['instrument'] = 'RigMark, single stream, fixed output length'
        row['evidence'] = ['release/receipts/speed.json']
    source['tf']['exact'] = {
        'verdict':'PASS', 'engine':'tensorfold', 'rule':'hard', 'exact_class':'EXACT-ON-CORPUS',
        'prompts':gate.Number('8'), 'tested':gate.Number('8'), 'diverging':gate.Number('0'),
        'scope':"greedy (temperature 0), non-streaming; measured on this serving start's 8-prompt corpus, not a guarantee",
        'off_source':'same-boot switch: "draft": false', 'receipt':'release/receipts/exact.json', 'sha256':'a'*64,
        'prompt_set_note':'The measured prompt set is not published.',
        'drafting_proof':{'counters_rose_on':True,'counters_flat_off':True,'per_reply_agree':True},
    }
    source['tf']['quality'] = {'overall':'INCOMPLETE: further checks were not run.',
                              'smoketest':{'status':'PASS','observed':'Passed its measured cases.'},
                              'nll':{'status':'NOT-RUN','observed':None}}
    source['site_v2'].update(
        exactness_claim='Speculative output was byte-identical to serial decoding on its 8-prompt greedy check at TP=3.',
        comparison_claim='2 of 3 single-stream RigMark rows are above the TP=2 to TP=4 line on every repeat; prose is below.',
        above_line_rows=gate.Number('2'), total_rows=gate.Number('3'),
        limitations=['Installation qualification has a separate receipt and limitations.'],
        results_path='release/results-v2.0.0.json')
    return source


class PublicationTests(unittest.TestCase):
    def paths(self, directory, source):
        source_path, data_path = Path(directory)/'source.json', Path(directory)/'data.json'
        raw = gate.dump(gate.snapshot(source))
        source_path.write_text(raw)
        data_path.write_text(json.dumps(gate.project(gate.read(raw), hashlib.sha256(raw.encode()).hexdigest())))
        return data_path, source_path

    def test_complete_preview_preserves_literal_tokens_and_supplied_claims(self):
        source = sample()
        with tempfile.TemporaryDirectory() as directory:
            paths = self.paths(directory, source)
            data = gate.check(*paths, preview=True, original=paths[1])
        self.assertEqual(data['pending'], [])
        self.assertEqual([row['id'] for row in data['rows']], ['rigmark_code','rigmark_prose','rigmark_structured'])
        self.assertEqual(data['rows'][0]['median_text'], '11.200')
        self.assertEqual(data['rows'][0]['margin_text'], '5.500')
        self.assertEqual(data['rows'][1]['margin_text'], '-2.500')
        self.assertEqual(data['rows'][0]['values_text'], ['11.100','11.200','11.300'])
        self.assertEqual(data['quality']['claim'], source['site_v2']['exactness_claim'])
        self.assertEqual(data['comparison_claim'], source['site_v2']['comparison_claim'])
        self.assertEqual(data['checks'][1]['status'], 'NOT-RUN')

    def test_final_numbers_do_not_lift_publication_hold(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = self.paths(directory, sample())
            with self.assertRaisesRegex(ValueError, 'preview-only hold'):
                gate.check(*paths)

    def test_interim_and_fixture_results_never_reach_consumers(self):
        for changes in ({'state':'pending'}, {'state':'interim'}, {'state':'fixture'},
                        {'fixture':True}, {'frozen_at':None}, {'release_date':None}, {'tag':None}):
            with self.subTest(changes=changes):
                source = sample()
                source.update(changes)
                data = gate.project(source, 'b'*64)
                self.assertEqual(data['rows'], [])
                self.assertIsNone(data['quality'])
                self.assertIsNone(data['comparison_claim'])
                self.assertEqual(data['checks'], [])
                self.assertTrue(data['pending'])

    def test_incomplete_qualification_keeps_all_results_pending(self):
        for field in ['exactness_claim','comparison_claim','limitations','license','results_path','comparison']:
            with self.subTest(field=field):
                source = sample()
                source['site_v2'].pop(field)
                data = gate.project(source, 'b'*64)
                self.assertEqual(data['rows'], [])
                self.assertIsNone(data['quality'])
                self.assertTrue(data['pending'])

    def test_fixture_cannot_be_relabelled_real(self):
        source = gate.read((gate.ROOT/'scripts/fixtures/glm-v2-results.fixture.json').read_text())
        source.update(state='final', fixture=False)
        with self.assertRaisesRegex(ValueError, 'fixture markers'):
            gate.project(source, 'a'*64)

    def test_generation_drift_refused(self):
        for mutation in ['rounding','wrong cell','omitted row','claim rewrite','cleared hold']:
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as directory:
                paths = self.paths(directory, sample())
                data = json.loads(paths[0].read_text())
                if mutation == 'rounding': data['rows'][0]['median_text']='11.2'
                elif mutation == 'wrong cell': data['rows'][0]['median_text']=data['rows'][1]['median_text']
                elif mutation == 'omitted row': data['rows'].pop(1)
                elif mutation == 'claim rewrite': data['quality']['claim']='Always exact'
                else: data['publication_hold']=False
                paths[0].write_text(json.dumps(data))
                with self.assertRaisesRegex(ValueError, 'differs from source'):
                    gate.check(*paths, preview=True)

    def test_wrong_original_hash_refused(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = self.paths(directory, sample())
            paths[1].write_text(paths[1].read_text()+'\n')
            with self.assertRaisesRegex(ValueError, 'hash mismatch'):
                gate.check(*paths, preview=True, original=paths[1])

    def test_contract_refusals(self):
        cases = [
            ('wrong release', lambda s:s.update(tag='v0.2.0'), 'identity'),
            ('wrong engine', lambda s:s['tf']['identity'].update(engine_repo='another/engine'), 'engine identity'),
            ('number string', lambda s:s['tf']['rows']['rigmark_code'].update(median='11.200'), 'literal JSON'),
            ('missing repeat', lambda s:s['tf']['rows']['rigmark_code']['values'].pop(), 'repeat count'),
            ('one repeat under line', lambda s:s['tf']['rows']['rigmark_code'].update(worst=gate.Number('9.500'),values=[gate.Number('9.500'),gate.Number('11.200'),gate.Number('11.300')]), 'every-repeat'),
            ('prose promoted', lambda s:s['tf']['rows']['rigmark_prose'].update(vs_line='above'), 'line verdict'),
            ('intensifier enum', lambda s:s['tf']['rows']['rigmark_code'].update(vs_upstream_tp3='clearly beats'), 'neutral TP3'),
            ('wrong sign', lambda s:s['tf']['rows']['rigmark_prose'].update(vs_line_pct=gate.Number('2.500')), 'margin sign'),
            ('derived own row', lambda s:s['tf']['rows']['rigmark_code'].update(**{'class':'derived'}), 'measured tok/s'),
            ('missing evidence', lambda s:s['tf']['rows']['rigmark_code'].update(evidence=[]), 'row evidence'),
            ('private evidence', lambda s:s['tf']['rows']['rigmark_code'].update(evidence=['/home/operator/result.json']), 'forbidden public text'),
            ('wrong workload', lambda s:s['tf']['rows'].update(decode_c4=s['tf']['rows']['rigmark_code']), 'only single-stream'),
            ('matched conditions', lambda s:s['site_v2']['comparison'].update(same_conditions=True), 'matched conditions'),
            ('lost caveat', lambda s:s['site_v2']['comparison'].update(conditions='Different machines.'), 'fabric caveat'),
            ('lost weights caveat', lambda s:s['site_v2']['comparison'].update(engine_weights='Different machines.'), 'weight differences'),
            ('moving reference', lambda s:s['site_v2']['comparison'].update(source='https://github.com/mmastrac/example/blob/main/README.md'), 'pinned'),
            ('failed exactness', lambda s:s['tf']['exact'].update(verdict='FAIL'), 'passing TensorFold'),
            ('invalid exactness', lambda s:s['tf']['exact'].update(verdict='INVALID'), 'passing TensorFold'),
            ('wrong count', lambda s:s['tf']['exact'].update(prompts=gate.Number('7')), 'corpus mismatch'),
            ('count encoded as string', lambda s:s['tf']['exact'].update(tested='8'), 'literal JSON'),
            ('missing drafting proof', lambda s:s['tf']['exact']['drafting_proof'].update(counters_rose_on=False), 'drafting proof'),
            ('different reference', lambda s:s['tf']['exact'].update(off_source='another serving start'), 'serial reference'),
            ('unscoped exactness', lambda s:s['site_v2'].update(exactness_claim='Speculative output is byte-identical to serial.'), 'unapproved exactness'),
            ('lost corpus scope', lambda s:s['tf']['exact'].update(scope='Measured result.'), 'scope missing'),
            ('missing receipt hash', lambda s:s['tf']['exact'].pop('sha256'), 'receipt hash'),
            ('wrong row count', lambda s:s['site_v2'].update(above_line_rows=gate.Number('3')), 'count mismatch'),
            ('wrong drafter clearance', lambda s:s['site_v2']['license'].update(notice='Commercial use cleared.'), 'drafter qualification'),
        ]
        for name,edit,reason in cases:
            with self.subTest(name=name):
                source=sample();edit(source)
                with self.assertRaisesRegex(ValueError, reason): gate.project(source,'a'*64)

    def test_unsupported_copy_rejected(self):
        for phrase in ['Clearly faster.', 'A speed-win.', 'All rows win.', 'All three rows win.', 'The fastest.',
                       'A massive improvement.', 'A noise floor.', 'vLLM comparison.', 'Commercially cleared.',
                       'Result\u2014scope', '/home/operator/result']:
            with self.subTest(phrase=phrase):
                source=sample();source['site_v2']['limitations']=[phrase]
                with self.assertRaises(ValueError): gate.project(source,'a'*64)

    def test_snapshot_removes_private_identity_and_unused_comparison(self):
        source=sample()
        source['tf']['identity']['boot_identity']='/home/operator/private.json'
        source['tf']['reference']['v2_c1']={'private':'unused'}
        source['site_v2']['comparison']['internal_note']='/home/operator/private.json'
        public=gate.snapshot(source)
        self.assertNotIn('/home/',gate.dump(public))
        self.assertNotIn('v2_c1',gate.dump(public))
        self.assertEqual(gate.project(source,'a'*64),gate.project(public,'a'*64))

    def test_pending_source_cannot_leak_private_receipts(self):
        source=sample()
        source['site_v2']['exactness_claim']=None
        source['tf']['exact']['receipt']='/home/operator/exact.json'
        with self.assertRaisesRegex(ValueError, 'forbidden public text'):
            gate.snapshot(source)

    def test_reviewed_pending_seal_is_visible_without_changing_source_state(self):
        source = sample()
        source.update(state='pending', frozen_at=None, release_date=None)
        review = {'commit':'a'*40, 'source_sha256':'b'*64,
                  'results_path':source['site_v2']['results_path'],
                  'copy_source':{'path':'README.md','sha256':'c'*64},
                  'site_v2':source.pop('site_v2')}
        source['tf']['rows']['rigmark_code']['vs_upstream_tp3'] = 'clearly beats'
        result = gate.project(source, 'b'*64, review)
        self.assertEqual(result['rows'][0]['median_text'], str(source['tf']['rows']['rigmark_code']['median']))
        self.assertTrue(result['publication_hold'])
        self.assertIsNone(result['published'])
        self.assertIn('Final freeze, release identity and date pending.', result['pending'])
        self.assertEqual(source['state'], 'pending')
        self.assertIsNone(source['frozen_at'])
        self.assertIn('/blob/' + 'a'*40 + '/', result['links']['results'])
        self.assertNotIn('clearly', gate.dump(gate.snapshot(source)))
        self.assertEqual(result, gate.project(gate.snapshot(source), 'b'*64, review))
        with self.assertRaisesRegex(ValueError, 'source hash mismatch'):
            gate.project(source, 'd'*64, review)
        source['fixture'] = True
        with self.assertRaisesRegex(ValueError, 'cannot authorize fixture'):
            gate.project(source, 'b'*64, review)

    def test_quality_summary_disagreement_is_visible(self):
        source = sample()
        source['tf']['quality']['overall'] = 'INCOMPLETE: rigmark_gates (NOT-RUN)'
        source['tf']['quality']['rigmark_gates'] = {'status':'PASS','observed':'Recorded gates passed.'}
        result = gate.project(source, 'a'*64)
        self.assertEqual(result['panel_note'], source['tf']['quality']['overall'])
        self.assertTrue(result['quality_notes'])
        self.assertEqual(next(c for c in result['checks'] if c['id']=='rigmark_gates')['status'], 'PASS')

    def test_committed_review_mapping_matches_source_and_preserves_hold(self):
        data = gate.check(preview=True)
        self.assertTrue(data['rows'])
        self.assertTrue(data['publication_hold'])
        self.assertIsNone(data['published'])
        with self.assertRaisesRegex(ValueError, 'publication blocked'):
            gate.check()

    def test_historical_measurements_unchanged(self):
        raw=(gate.ROOT/'app/(site)/jspark3/glm-release.json').read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(),'4b4a90e11362a299965f7359b05cd31c8ed2165d67739ecfa6616c7c81c549ad')

    def test_site_display_regression(self):
        result = subprocess.run(['node', '--import', 'tsx', '--test', 'app/(site)/jspark3/glm-v2.test.ts'],
                                cwd=gate.ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_display_strings_cannot_rewrite_sealed_measurements(self):
        source = gate.read(gate.SOURCE.read_text())
        review = gate.read(gate.REVIEW.read_text())
        for value in ['+4.9%', '4.8%', '+4.80%']:
            with self.subTest(value=value):
                review['site_v2']['display_rows']['rigmark_code']['margin'] = value
                with self.assertRaisesRegex(ValueError, 'display string'):
                    gate.project(source, review['source_sha256'], review)

    def test_real_publication_commands_refuse_preview(self):
        import os
        for command in (['node','scripts/check-glm-release.mjs'],['node','scripts/check-glm-build.mjs']):
            result=subprocess.run(command,cwd=gate.ROOT,env={**os.environ,'VERCEL_ENV':'production'},capture_output=True,text=True)
            self.assertNotEqual(result.returncode,0)
            self.assertIn('publication blocked',result.stderr)


if __name__=='__main__': unittest.main()
