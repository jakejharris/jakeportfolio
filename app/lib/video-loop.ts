// Pure helpers for the looping video block: asset urls from Sanity
// references (the post query does not dereference assets) and the frame's
// size, so the page reserves the clip's shape before anything loads.

import { safeHref, type Check } from './post-figures';

export interface SanityProject {
  projectId: string;
  dataset: string;
}

interface AssetField {
  asset?: { _ref?: unknown; _id?: unknown; url?: unknown } | null;
}

const FILE_REF = /^file-([A-Za-z0-9]+)-([a-z0-9]+)$/;
const IMAGE_REF = /^image-([A-Za-z0-9]+)-(\d+)x(\d+)-([a-z0-9]+)$/;
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

const refOf = (field: unknown) => {
  const asset = (field as AssetField | null | undefined)?.asset;
  const ref = asset?._ref ?? asset?._id;
  return typeof ref === 'string' ? ref : '';
};
const urlOf = (field: unknown) => safeHref((field as AssetField | null | undefined)?.asset?.url);
const projectOk = (p: SanityProject) => SAFE_ID.test(p.projectId || '') && SAFE_ID.test(p.dataset || '');

/** The file's extension from its reference ("mp4"), or from its url. */
export function fileExtension(field: unknown): string {
  const match = FILE_REF.exec(refOf(field));
  if (match) return match[2];
  const url = urlOf(field);
  return url ? (/\.([a-z0-9]+)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase() ?? '') : '';
}

/** A playable url for a Sanity file field: its resolved url, or one built from its reference. */
export function sanityFileUrl(field: unknown, project: SanityProject): string | undefined {
  const url = urlOf(field);
  if (url) return url;
  const match = FILE_REF.exec(refOf(field));
  if (!match || !projectOk(project)) return undefined;
  return `https://cdn.sanity.io/files/${project.projectId}/${project.dataset}/${match[1]}.${match[2]}`;
}

export interface PosterInfo {
  url: string;
  /** Pixel size from the reference; zero when only a url is known. */
  width: number;
  height: number;
}

/** The poster's url at a display width (never upscaled) and its pixel size. */
export function sanityPoster(field: unknown, project: SanityProject, displayWidth = 1280): PosterInfo | undefined {
  const match = IMAGE_REF.exec(refOf(field));
  if (match && projectOk(project)) {
    const [, id, w, h, ext] = match;
    const width = Number(w);
    const height = Number(h);
    const base = `https://cdn.sanity.io/images/${project.projectId}/${project.dataset}/${id}-${w}x${h}.${ext}`;
    const query = width > displayWidth ? `?w=${displayWidth}&auto=format&q=80` : '?auto=format&q=80';
    return { url: base + query, width, height };
  }
  const url = urlOf(field);
  return url ? { url, width: 0, height: 0 } : undefined;
}

const size = (value: unknown) => (typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 8000 ? value : 0);

/**
 * The frame's width and height: the block's own when both are set, else the
 * poster's, else 16 by 9. Only their ratio matters on the page.
 */
export function videoBox(value: { width?: unknown; height?: unknown } | null | undefined, poster?: PosterInfo) {
  const width = size(value?.width);
  const height = size(value?.height);
  if (width && height) return { width, height };
  if (poster && poster.width > 0 && poster.height > 0) return { width: poster.width, height: poster.height };
  return { width: 16, height: 9 };
}

/** Width and height go together; Studio refuses one without the other. */
export function checkVideoLoop(value: { width?: unknown; height?: unknown } | null | undefined): Check {
  if (!value) return true;
  const hasW = value.width != null;
  const hasH = value.height != null;
  if (hasW !== hasH) return 'Set both width and height, or leave both empty to use the poster size.';
  if (hasW && (!size(value.width) || !size(value.height))) return 'Width and height are whole pixels from 1 to 8000.';
  return true;
}
