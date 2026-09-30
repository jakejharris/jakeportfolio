import data from './glm-v2-release.json';

type DisplayStats = { median: string; worst: string; values: string[] };
export type V2Trace = { source: string; pointer?: string; numerator?: string; denominator?: string };
export type V2Stats = { display: DisplayStats | null; trace: V2Trace[] };
type V2Row = { id: string; median_text: string; worst_text: string; values_text: string[]; instrument: string; evidence: string[]; display: DisplayStats };
export type V2Multistream = {
  id: string; streams: string; workload_label: string | null; status: 'pending' | 'measured'; aggregate: V2Stats | null;
  instrument: string | null; workload: string | null; timing: string | null; cache: string | null;
  samples: string | null; evidence: string[];
};
export type V2Latency = {
  id: string; unit: 's'; better: 'lower'; status: 'measured'; prompt: string; case: string;
  effort: 'High (default)' | 'Max' | 'Max (default)' | 'Low'; instrument: string; evidence: string[];
  first_token: V2Stats; first_content: V2Stats & { conditional: boolean; censored_trace: V2Trace[] };
  reasoning_tokens: V2Stats;
};
export type V2Unmeasured = {
  id: string; unit: 'tok/s'; better: 'higher'; status: 'not-measured' | 'not-supported';
  label: string; reason: string; evidence: string[]; instrument?: string;
  source_read?: { status: string; engine_commit: string; citations: string[]; finding: string };
};
export type V2Prefill = V2Unmeasured | (V2Stats & {
  id: string; unit: 'tok/s'; better: 'higher'; status: 'measured'; prompt: string; case: string;
  effort: 'High (default)' | 'Max' | 'Max (default)' | 'Low'; instrument: string; evidence: string[];
});
export type V2Release = {
  title: string; engine: string; fixture: boolean; publication_hold: boolean; pending: string[]; published: string | null;
  rows: V2Row[]; multistream: V2Multistream[]; latency: V2Latency[]; prefill: V2Prefill[]; decode: V2Unmeasured[]; social_image: string;
  sparkdash?: { cells: { id: string; workload: string; label: string; display: string; per_stream: string | null; extension: boolean }[]; evidence: string[]; instrument: string; revision: string; max_tokens: string };
  serving?: { default_streams: string; opt_out: string | null; serial: boolean };
  sections?: Record<string, { paragraphs: string[]; evidence: string[] }>;
  builder_quality?: { claim: string; source: string } | null;
  comparison: null;
  comparison_claim: null;
  quality: { claim: string; scope: string; source: string; prompt_set_note: string;
    display: Record<'prompts' | 'tested' | 'long_prompt_tokens' | 'generated_tokens', string>;
    proof_display: Record<'tokens_after_first_on' | 'verify_cycles_on' | 'tokens_per_cycle' | 'serial_rounds_off', string> } | null;
  checks: { id: string; status: string; display: Partial<Record<'passed' | 'total' | 'percentage' | 'corrupt', string>> | null; source: string | null; observed: string | null; reason: string | null; failed_cases: string[] }[];
  panel_note: string | null; quality_notes: string[]; limitations: string[];
  license: { notice: string; source: string } | null;
  links: { release: string; source: string; results: string | null };
};

export const GLM_V2 = data as V2Release;
export const V2_DESCRIPTION = 'JSpark3 v2.0.0: TensorFold serving GLM-5.3-Flash on three DGX Sparks. Single-stream RigMark results, multi-stream serving results and release qualifications.';
export const V2_DRAFTER_NOTICE = 'The default DFlash2 drafter is non-commercial (CC BY-NC-ND 4.0). Recipe code, engine, base weights, quantized weights and dependencies retain their own terms. This is not legal advice.';
export const V2_METRICS: Record<string, string> = {
  rigmark_code: 'RigMark · code', rigmark_prose: 'RigMark · prose', rigmark_structured: 'RigMark · structured',
};

// Display strings are required by the importer. No numeric formatting belongs here.
export const v2Highlights = (release: V2Release) => Object.entries(V2_METRICS).map(([id, label]) => {
  const row = release.rows.find(item => item.id === id);
  return { id, label, value: row?.display.median ?? 'Pending' };
});

export const V2_HIGHLIGHTS = v2Highlights(GLM_V2);
