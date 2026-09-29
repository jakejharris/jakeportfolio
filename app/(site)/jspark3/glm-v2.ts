import data from './glm-v2-release.json';

type V2Row = { id: string; median_text: string; worst_text: string; samples_text: string; values_text: string[]; instrument: string; vs_line: string; margin_text: string; line_text: string; upstream_tp3_set1_text: string; upstream_tp3_set2_text: string; evidence: string[]; display?: Partial<Record<'median' | 'worst' | 'line' | 'upstream_tp3_set1' | 'upstream_tp3_set2' | 'margin', string>> };
type V2Release = {
  title: string; engine: string; fixture: boolean; pending: string[]; published: string | null;
  rows: V2Row[]; social_image: string;
  comparison: { source: string; line_source: string; conditions: string; engine_weights: string; same_conditions: boolean } | null;
  comparison_claim: string | null;
  quality: { claim: string; scope: string; source: string; prompt_set_note: string } | null;
  checks: { id: string; status: string; observed: string | null; failed_cases: string[] }[]; panel_note: string | null; quality_notes: string[]; limitations: string[];
  license: { notice: string; source: string } | null;
  links: { release: string; source: string; results: string | null };
};

export const GLM_V2 = data as V2Release;
export const V2_DESCRIPTION = 'JSpark3 v2.0.0: TensorFold serving GLM-5.3-Flash on three DGX Sparks. Scoped exactness, single-stream RigMark results and release qualifications.';
export const V2_DRAFTER_NOTICE = 'The default DFlash2 drafter is non-commercial (CC BY-NC-ND 4.0). No mode is cleared for commercial use.';
export const V2_METRICS: Record<string, string> = {
  rigmark_code: 'RigMark · code', rigmark_prose: 'RigMark · prose', rigmark_structured: 'RigMark · structured',
};

// Display only: keep the sealed tokens intact for provenance and comparison checks.
export function v2Throughput(value?: string, display?: string) {
  return display ?? (value === undefined ? 'Pending' : Number(value).toFixed(1));
}

export function v2Percent(value: string, display?: string) {
  if (display !== undefined) return display;
  const rounded = Number(value).toFixed(1);
  return `${rounded.startsWith('-') ? '' : '+'}${rounded}%`;
}

export const V2_HIGHLIGHTS = Object.entries(V2_METRICS).map(([id, label]) => {
  const row = GLM_V2.rows.find(item => item.id === id);
  return { id, label, value: v2Throughput(row?.median_text, row?.display?.median) };
});
