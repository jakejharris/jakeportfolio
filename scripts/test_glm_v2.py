"""Independent controls for the TensorFold preview, literal provenance and copy."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

import glm_v2 as gate


def measurement_fixture():
    """Synthetic protocol matrix; never a benchmark receipt."""
    N = gate.Number
    def stats(values, precision, better='lower'):
        return dict(median=N(str(values[1])), worst=N(str(min(values) if better == 'higher' else max(values))),
                    values=[N(str(v)) for v in values], n=N('3'),
                    display=dict(median=f'{values[1]:.{precision}f}',
                                 worst=f'{(min(values) if better == "higher" else max(values)):.{precision}f}',
                                 values=[f'{v:.{precision}f}' for v in values]),
                    trace=[dict(receipt='release/receipts/probe.json', pointer=f'/requests/{i}/value') for i in range(3)])
    def row(prompt, case, low):
        return dict(unit='s', better='lower', **{'class':'measured'},
                    conditions=dict(prompt=prompt, case=case, thinking=False if low else None,
                                    rendered_effort='low' if low else 'max', effort_label='Low' if low else 'Max (default)',
                                    serving_default=not low, stream=True, streams=N('1'), temperature=N('0'),
                                    planned_n=N('3'), max_tokens=N('100'),
                                    prompt_tokens=[N('100')]*3, cached_tokens=[N('0')]*3),
                    instrument=dict(name='TTFT probe', version=N('3'), sha256='a'*64), evidence=['release/receipts/probe.json'])
    latency, prefill, decode = {}, {}, {}
    for suffix in ('', '_think_off'):
        for prompt in ('short', '5k', '32k'):
            for case in ('cold', 'warm', 'turn'):
                r = row(prompt, case, bool(suffix))
                r.update(first_token=dict(stats([0.9,1.0,1.1],2),unit='s',better='lower'),
                         first_content=dict(stats([1.9,2.0,2.1],2),unit='s',better='lower',missing=N('0'),conditional=False,censored_trace=[]),
                         reasoning_tokens=stats([1,2,3],0))
                latency[f'ttft_{prompt}_{case}{suffix}']=r
            if prompt != 'short':
                r=row(prompt,'cold',bool(suffix))
                r.update(stats([10,20,30],1,'higher'),unit='tok/s',better='higher')
                r['conditions'].update(rate='usage.prompt_tokens / client ttft_any',measurement='client-effective prefill; includes client overhead')
                prefill[f'prefill_{prompt}{suffix}']=r
    empty=dict(median=None,worst=None,values=[],n=N('0'),unit='tok/s',better='higher',
               **{'class':'not-measured'},reason='No measured receipt.',instrument=None,evidence=[],display=None)
    prefill['prefill_128k']=copy.deepcopy(empty)
    for streams in ('2','4','8'):
        r=copy.deepcopy(empty)
        r.update(**{'class':'not-supported'},label=streams+' streams',instrument='Queue check',
                 evidence=['release/receipts/queue.json'],source_read=dict(status='VERIFIED',engine_commit='a'*7,
                 citations=['server.py:1'],finding='Requests wait for the active request.'))
        decode['code_c'+streams]=r
    for prompt in ('5k','32k','128k'):
        decode['decode_after_'+prompt]=copy.deepcopy(empty)
    return dict(latency=latency,prefill=prefill,decode=decode)


def sample():
    """Invented complete input, never a benchmark or a release receipt."""
    source = gate.read((gate.ROOT / 'scripts/fixtures/glm-v2-results.fixture.json').read_text())
    source.pop('_note', None)
    source.update(state='final', fixture=False, frozen_at='2026-09-29T14:00:00Z', release_date='2026-09-29')
    for row in source['tf']['rows'].values():
        row['instrument'] = 'RigMark, single stream, fixed output length'
        row['evidence'] = ['release/receipts/speed.json']
    source['tf'].update(measurement_fixture())
    source['tf']['exact'] = {
        'verdict':'PASS', 'engine':'tensorfold', 'rule':'hard', 'exact_class':'EXACT-ON-CORPUS',
        'prompts':gate.Number('8'), 'tested':gate.Number('8'), 'diverging':gate.Number('0'),
        'scope':"greedy (temperature 0), non-streaming; measured on this serving start's 8-prompt corpus, not a guarantee",
        'off_source':'same-boot switch: "draft": false', 'receipt':'release/receipts/exact.json', 'sha256':'a'*64,
        'prompt_set_note':'The measured prompt set is not published.',
        'long_prompt_tokens':gate.Number('1000'), 'generated_tokens':gate.Number('100'),
        'display':{'prompts':'8','tested':'8','long_prompt_tokens':'1,000','generated_tokens':'100'},
        'drafting_proof':{'counters_rose_on':True,'counters_flat_off':True,'per_reply_agree':True,
                         'tokens_after_first_on':gate.Number('90'),'verify_cycles_on':gate.Number('30'),
                         'tokens_per_cycle':gate.Number('3.00'),'serial_rounds_off':gate.Number('90'),
                         'display':{'tokens_after_first_on':'90','verify_cycles_on':'30','tokens_per_cycle':'3.00','serial_rounds_off':'90'}},
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
            ('lost caveat', lambda s:s['tf']['reference']['line'].update(conditions='Different machines.'), 'fabric caveat'),
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
        for value in ['+4.9%', '4.8%', '+4.80%']:
            with self.subTest(value=value):
                source = gate.read(gate.SOURCE.read_text())
                review = gate.read(gate.REVIEW.read_text())
                source['tf']['rows']['rigmark_code']['display']['vs_line_pct'] = value
                with self.assertRaisesRegex(ValueError, 'display string'):
                    gate.project(source, review['source_sha256'], review)

    def test_checkpoint_shape_and_source_display_provenance(self):
        source = gate.read(gate.SOURCE.read_text())
        data = gate.check(preview=True)
        self.assertEqual(source['state'], 'final')
        self.assertEqual([len(data[k]) for k in ('latency','prefill','decode')], [18,5,6])
        self.assertEqual(data['comparison']['conditions'], {k:v['conditions'] for k,v in source['tf']['reference'].items()})
        for family in ('latency','prefill'):
            for row in data[family]:
                original = source['tf'][family][row['id']]
                for key in ('first_token','first_content','reasoning_tokens') if family == 'latency' else ():
                    self.assertEqual(row[key]['display'], original[key]['display'])
                if family == 'prefill' and row['status'] == 'measured':
                    self.assertEqual(row['display'], original['display'])
        self.assertEqual(data['rows'][2]['display']['margin_tps'], '+0.5')
        self.assertTrue(data['publication_hold'])
        self.assertIsNone(data['published'])

    def test_new_matrix_refuses_unqualified_or_mislabelled_values(self):
        cases = [
            ('omitted latency', lambda s:s['tf']['latency'].pop('ttft_short_cold'), 'complete checkpoint matrix'),
            ('new unknown row', lambda s:s['tf']['decode'].update(other={}), 'complete checkpoint matrix'),
            ('latency display missing', lambda s:s['tf']['latency']['ttft_short_cold']['first_token'].pop('display'), 'source display'),
            ('false Low label', lambda s:s['tf']['latency']['ttft_short_cold']['conditions'].update(effort_label='Low'), 'effort label'),
            ('wrong prompt', lambda s:s['tf']['latency']['ttft_short_cold']['conditions'].update(prompt='32k'), 'prompt/case'),
            ('wrong unit', lambda s:s['tf']['prefill']['prefill_5k'].update(unit='s'), 'unit/direction'),
            ('wrong worst', lambda s:s['tf']['latency']['ttft_short_cold']['first_token'].update(worst=gate.Number('0.9')), 'median or worst'),
            ('missing trace', lambda s:s['tf']['latency']['ttft_short_cold']['first_token']['trace'].pop(), 'trace count'),
            ('uncounted missing', lambda s:s['tf']['latency']['ttft_short_cold']['first_content'].update(missing=gate.Number('1')), 'accounting'),
            ('zero disguised as missing', lambda s:s['tf']['decode']['decode_after_5k'].update(median=gate.Number('0')), 'must not contain'),
            ('unverified unsupported', lambda s:s['tf']['decode']['code_c2']['source_read'].update(status='PENDING'), 'verified source'),
            ('private source read', lambda s:s['tf']['decode']['code_c2']['source_read'].update(finding='/home/operator/file'), 'forbidden public text'),
        ]
        for name, edit, message in cases:
            with self.subTest(name=name):
                source=sample();edit(source)
                with self.assertRaisesRegex(ValueError,message): gate.project(source,'a'*64)

    def test_conditional_and_fully_censored_answer_stats_are_preserved(self):
        source=sample()
        content=source['tf']['latency']['ttft_short_cold']['first_content']
        content.update(n=gate.Number('1'),values=[gate.Number('2.0')],median=gate.Number('2.0'),worst=gate.Number('2.0'),
                       display=dict(median='2.00',worst='2.00',values=['2.00']),missing=gate.Number('2'),conditional=True,
                       censored_trace=content['trace'][1:],trace=content['trace'][:1])
        data=gate.project(source,'a'*64)
        cell=data['latency'][0]['first_content']
        self.assertTrue(cell['conditional']);self.assertEqual(len(cell['censored_trace']),2)
        self.assertEqual(cell['display']['median'],'2.00')
        content.update(n=gate.Number('0'),values=[],median=None,worst=None,display=None,missing=gate.Number('3'),
                       censored_trace=content['censored_trace']+content['trace'],trace=[])
        cell=gate.project(source,'a'*64)['latency'][0]['first_content']
        self.assertIsNone(cell['display']);self.assertEqual(len(cell['censored_trace']),3)

    def test_display_only_strings_are_not_invented_in_companion(self):
        source=sample()
        source['site_v2']['display_rows']={}
        with self.assertRaisesRegex(ValueError,'unknown site fields'): gate.project(source,'a'*64)

    def test_real_publication_commands_refuse_preview(self):
        import os
        for command in (['node','scripts/check-glm-release.mjs'],['node','scripts/check-glm-build.mjs']):
            result=subprocess.run(command,cwd=gate.ROOT,env={**os.environ,'VERCEL_ENV':'production'},capture_output=True,text=True)
            self.assertNotEqual(result.returncode,0)
            self.assertIn('publication blocked',result.stderr)


if __name__=='__main__': unittest.main()
