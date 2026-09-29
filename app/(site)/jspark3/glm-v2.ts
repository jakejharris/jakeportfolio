import data from './glm-v2-release.json';

type V2Row = { id: string; median_text: string; worst_text: string; samples_text: string; values_text: string[]; instrument: string; vs_line: string; margin_text: string; line_text: string; upstream_tp3_set1_text: string; upstream_tp3_set2_text: string; evidence: string[] };
type V2Release = {
  title: string; engine: string; fixture: boolean; pending: string[]; published: string | null;
  rows: V2Row[]; social_image: string;
  comparison: { source: string; line_source: string; conditions: string; engine_weights: string; same_conditions: boolean } | null;
  comparison_claim: string | null;
  quality: { claim: string; scope: string; source: string; prompt_set_note: string } | null;
  checks: { id: string; status: string; observed: string | null; failed_cases: string[] }[]; panel_note: string | null; limitations: string[];
  license: { notice: string; source: string } | null;
  links: { release: string; source: string; results: string | null };
};

export const GLM_V2 = data as V2Release;
export const V2_DESCRIPTION = 'JSpark3 v2.0.0: TensorFold serving GLM-5.3-Flash on three DGX Sparks. Scoped exactness, single-stream RigMark results and release qualifications.';
export const V2_DRAFTER_NOTICE = 'The default DFlash2 drafter is non-commercial (CC BY-NC-ND 4.0). No mode is cleared for commercial use.';
export const V2_METRICS: Record<string, string> = {
  rigmark_code: 'RigMark · code', rigmark_prose: 'RigMark · prose', rigmark_structured: 'RigMark · structured',
};
export const V2_HIGHLIGHTS = Object.entries(V2_METRICS).map(([id, label]) => ({
  id, label, value: GLM_V2.rows.find(row => row.id === id)?.median_text ?? 'Pending',
}));
