"""Protocol controls using invented private rehearsal values, never a release."""
import copy
import hashlib
import unittest
import glm_v2 as gate


def fixture(variant='W_C'):
    N = gate.Number
    rows = {key: dict(median=N('901.2'), worst=N('901.1'), values=[N('901.1'),N('901.2'),N('901.3')], n=N('3'),
                      display=dict(median='901.2',worst='901.1',values=['901.1','901.2','901.3']),
                      instrument='RigMark, single stream, invented protocol values', evidence=[dict(receipt='release/receipts/rehearsal.json',sha256='f'*64)]) for key in gate.METRICS}
    sd = dict(status='RECORDED', instrument=dict(repo='github.com/MiaAI-Lab/sparkDash',commit='a'*40,max_tokens=N('400')),
              evidence=[dict(receipt='release/receipts/rehearsal.json',sha256='f'*64)], display={})
    for workload, keys in [('code',['c1','c2','c3','c4','c8']),('prose',['c1','c2','c3','c4']),('prefill',['8k','16k','32k','64k','128k'])]:
        sd[workload] = {key:N('9001' if workload=='prefill' else '902.10') for key in keys}
        sd['display'][workload] = {key:'9,001' if workload=='prefill' else '902.1' for key in keys}
    return dict(schema='jspark3-results/2',state='fixture',fixture=True,variant=variant,tag='v2.0.0',version='v2.0',release_date='2026-09-29',frozen_at='2026-09-29T20:00:00Z',
                v2=dict(rows=rows,quality={},quality_overall='N/A'),site_v2=dict(quality={}),sparkdash=sd,
                concurrency=dict(default_streams=N('1' if variant=='W_A' else '4'),opt_out=dict(setting='MAX_STREAMS=1'),gates={key:'PASS' for key in ('C-4','C-6','C-7','C-8','C-9','C-11')}))


def project(source):
    return gate.project(source, hashlib.sha256(gate.dump(source).encode()).hexdigest(), rehearsal=True)


class Schema2Tests(unittest.TestCase):
    def test_both_variants_keep_display_and_distinct_instruments(self):
        for variant in ('W_C','W_A'):
            source=fixture(variant); data=project(source)
            self.assertEqual(data['rows'][0]['display']['median'],'901.2')
            self.assertEqual(data['sparkdash']['cells'][0]['display'],'902.1')
            self.assertEqual(data['sparkdash']['cells'][0]['per_stream'],None)
            self.assertEqual(data['serving']['serial'],variant=='W_A')
            self.assertTrue(data['publication_hold'])
            self.assertIsNone(data['comparison'])
            self.assertEqual(data,gate.project(gate.snapshot(source),data['source_sha256'],rehearsal=True))
            self.assertEqual(source['sparkdash']['code']['c1'],gate.Number('902.10'))
    def test_sample_pending_and_real_rehearsal_refuse(self):
        for state in ('sample-fake-values','pending','final'):
            source=fixture();source['state']=state
            with self.assertRaises(ValueError):project(source)
        source=fixture();source['FAKE_VALUES']='sample'
        with self.assertRaises(ValueError):project(source)
    def test_missing_display_and_receipt_refuse(self):
        source=fixture(); del source['sparkdash']['display']['code']['c2']
        with self.assertRaises(ValueError):project(source)
        source=fixture(); source['sparkdash']['evidence'][0]['receipt']='/home/private.json'
        with self.assertRaises(ValueError):project(source)
        source=fixture(); source['sparkdash']['evidence'][0]['sha256']='0'*64
        with self.assertRaises(ValueError):project(source)
    def test_inconsistent_rigmark_and_default_refuse(self):
        source=fixture();source['v2']['rows']['rigmark_code']['median']=gate.Number('900')
        with self.assertRaises(ValueError):project(source)
        source=fixture('W_A');source['concurrency']['default_streams']=gate.Number('4')
        with self.assertRaises(ValueError):project(source)
    def test_no_reference_or_private_wrapper_in_snapshot(self):
        source=fixture();source['v2']['reference']={'private':'/home/local'};source['sparkdash']['instrument']['wrapper']='/home/local'
        clean=gate.snapshot(source)
        self.assertNotIn('reference',clean['v2'])
        self.assertNotIn('wrapper',clean['sparkdash']['instrument'])
    def test_final_effort_matrices_are_distinct(self):
        from test_glm_v2 import measurement_fixture
        matrix=measurement_fixture()
        for family in ('latency','prefill'):
            supplied=matrix[family]
            for key in list(supplied):
                if key.endswith('_think_off') or key=='prefill_128k':continue
                old=supplied.pop(key)
                for suffix,label,mode,default in (('_high','High (default)','high',True),('_max','Max','max',False)):
                    row=copy.deepcopy(old);row['conditions'].update(effort_label=label,rendered_effort=mode,serving_default=default)
                    supplied[key+suffix]=row
        source=fixture();source['v2'].update(matrix)
        data=project(source)
        self.assertEqual(len(data['latency']),27)
        self.assertEqual(set(row['effort'] for row in data['latency']),{'High (default)','Max','Low'})
        bad=copy.deepcopy(source);bad['v2']['latency']['ttft_short_cold_max']['conditions']['serving_default']=True
        with self.assertRaises(ValueError):project(bad)
    def test_final_projection_stays_bound_to_original_hash(self):
        source=fixture();source.update(fixture=False,state='final')
        for row in source['v2']['rows'].values():row['instrument']='RigMark, single stream, low effort'
        source['site_v2']['publication']=dict(repo='jakejharris/jspark3',tag='v2.0.0',commit='a'*40)
        review=dict(source_sha256='b'*64,commit='a'*40,copy_source=dict(path='README.md',sha256='c'*64),results_path='release/results-v2.0.0.json',site_v2=dict(results_path='release/results-v2.0.0.json'))
        data=gate.project(source,'b'*64,review)
        self.assertFalse(data['fixture']);self.assertTrue(data['publication_hold'])
        self.assertEqual(data,gate.project(gate.snapshot(source),'b'*64,review))
        bad=copy.deepcopy(source);bad['site_v2']['publication']['commit']='d'*40
        with self.assertRaises(ValueError):gate.project(bad,'b'*64,review)
    def test_missing_final_review_and_hash_mismatch_refuse(self):
        source=fixture();source.update(fixture=False,state='final')
        for review in (None, {'source_sha256':'0'*64}):
            with self.assertRaises(ValueError):gate.project(source,'a'*64,review=review)
    def test_overall_pass_and_unbound_claim_refuse(self):
        source=fixture();source['v2']['quality_overall']='PASS'
        with self.assertRaises(ValueError):project(source)
        source=fixture();source['site_v2']['quality']['claim']='On the 9 test prompts.'
        with self.assertRaises(ValueError):project(source)

if __name__=='__main__':unittest.main()
