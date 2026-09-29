import data from './glm-v2-release.json';

type DisplayStats = { median: string; worst: string; values: string[] };
export type V2Trace = { source: string; pointer?: string; numerator?: string; denominator?: string };
export type V2Stats = { display: DisplayStats | null; trace: V2Trace[] };
type V2Row = { id: string; median_text: string; worst_text: string; values_text: string[]; instrument: string; vs_line: string; margin_text: string; evidence: string[]; display: DisplayStats & { line: string; upstream_tp3_set1: string; upstream_tp3_set2: string; margin: string; margin_tps?: string } };
export type V2Latency = {
  id: string; unit: 's'; better: 'lower'; status: 'measured'; prompt: string; case: string;
  effort: 'Max (default)' | 'Low'; instrument: string; evidence: string[];
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
  effort: 'Max (default)' | 'Low'; instrument: string; evidence: string[];
});
type V2Release = {
  title: string; engine: string; fixture: boolean; publication_hold: boolean; pending: string[]; published: string | null;
  rows: V2Row[]; latency: V2Latency[]; prefill: V2Prefill[]; decode: V2Unmeasured[]; social_image: string;
  comparison: { source: string; line_source: string; conditions: Record<'line' | 'upstream_tp3_set1' | 'upstream_tp3_set2', string>; topology: string; engine_weights: string; same_conditions: boolean } | null;
  comparison_claim: string | null;
  quality: { claim: string; scope: string; source: string; prompt_set_note: string;
    display: Record<'prompts' | 'tested' | 'long_prompt_tokens' | 'generated_tokens', string>;
    proof_display: Record<'tokens_after_first_on' | 'verify_cycles_on' | 'tokens_per_cycle' | 'serial_rounds_off', string> } | null;
  checks: { id: string; status: string; display: Partial<Record<'passed' | 'total' | 'percentage' | 'corrupt', string>> | null; source: string | null; failed_cases: string[] }[];
  panel_note: string | null; quality_notes: string[]; limitations: string[];
  license: { notice: string; source: string } | null;
  links: { release: string; source: string; results: string | null };
};

export const GLM_V2 = data as V2Release;
export const V2_DESCRIPTION = 'JSpark3 v2.0.0: TensorFold serving GLM-5.3-Flash on three DGX Sparks. Scoped exactness, single-stream RigMark results and release qualifications.';
export const V2_DRAFTER_NOTICE = 'The default DFlash2 drafter is non-commercial (CC BY-NC-ND 4.0). No mode is cleared for commercial use.';
export const V2_METRICS: Record<string, string> = {
  rigmark_code: 'RigMark · code', rigmark_prose: 'RigMark · prose', rigmark_structured: 'RigMark · structured',
};

// Display strings are required by the importer. No numeric formatting belongs here.
export const V2_HIGHLIGHTS = Object.entries(V2_METRICS).map(([id, label]) => {
  const row = GLM_V2.rows.find(item => item.id === id);
  return { id, label, value: row?.display.median ?? 'Pending' };
});
