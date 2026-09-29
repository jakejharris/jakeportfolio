import data from './glm-v2-release.json';

export type V2Cell = { lo_text: string; hi_text: string; median_text?: string; samples_text?: string; unit: string; instrument: string };
type V2Set = { id: string; label: string; build: string; mode: string; toggles: string; serving_starts: string; sweeps: string; cells: Record<string, V2Cell>; prefill_omitted_reason: string | null };
type V2Release = {
  title: string; fixture: boolean; pending: string[]; published: string | null; conditions: string;
  sets: V2Set[]; social_image: string;
  comparison: { publisher: string; source: string; same_instruments: boolean; same_conditions: boolean; condition_differences: string[]; cells: Record<string, V2Cell> } | null;
  quality: { claim: string; exact_class: string; verdict_bearing_prompts_text: string; known_issue: string; source: string } | null;
  drafter_source: { url: string; card: string; license: string; license_url: string; without_drafter: string; mtp: string } | null;
  links: { release: string; source: string; results: string; numbers: string };
};

export const GLM_V2 = data as V2Release;
export const V2_RELEASE_SET = GLM_V2.sets.find(set => set.id === 'release_m0');
export const V2_DESCRIPTION = 'GLM-5.3-Flash on three DGX Sparks, based on mmastrac’s NVFP4 TP3 recipe. Measurements, qualification, and license scope.';
export const V2_DRAFTER_NOTICE = "The default DFlash2 drafter is non-commercial (CC BY-NC-ND 4.0). JSpark3 does not distribute it; the licence's terms go with any copy.";
export const V2_NO_DRAFTER_NOTICE = 'SPEC_METHOD=none: booted for this release, speed not measured';
export const V2_MTP_NOTICE = 'SPEC_METHOD=mtp: wired but not booted at TP=3';
export const V2_METRICS: Record<string, string> = {
  prefill: 'Prefill · 32k cold', decode_c1: 'Code · 1 stream', decode_c2: 'Code · 2 streams',
  decode_c4: 'Code · 4 streams', decode_c8: 'Code · 8 streams',
  prefill_128k: 'Prefill · 128k cold', rigmark_code: 'RigMark · code',
  rigmark_prose: 'RigMark · prose', rigmark_structured: 'RigMark · structured',
};

/** Preserve each original token, including its trailing zeroes. */
export function v2Band(cell?: V2Cell) {
  if (!cell) return 'Not measured';
  return cell.lo_text === cell.hi_text ? cell.lo_text : `${cell.lo_text}–${cell.hi_text}`;
}

export const V2_HIGHLIGHTS = ['prefill', 'decode_c1', 'decode_c4'].flatMap(id => {
  const cell = V2_RELEASE_SET?.cells[id];
  return cell ? [{ id, label: V2_METRICS[id], value: GLM_V2.fixture ? 'Pending' : v2Band(cell) }] : [];
});
