export const VIEW_TTL_MS = 24 * 60 * 60 * 1000;

type Snapshot = { count: number; expiresAt: number };
// Keep same-tab navigation working even when browser storage is unavailable.
const snapshots = new Map<string, Snapshot>();

export function rememberViewCount(
  slug: string,
  count: number | null,
  expiresAt: number,
  now = Date.now()
): number | null {
  const valid = (value: unknown): value is Snapshot => {
    if (!value || typeof value !== 'object') return false;
    const snapshot = value as Snapshot;
    return Number.isFinite(snapshot.count) && snapshot.count >= 0 &&
      Number.isFinite(snapshot.expiresAt) && snapshot.expiresAt > now &&
      snapshot.expiresAt <= now + VIEW_TTL_MS;
  };
  const key = `view-count:${encodeURIComponent(slug)}`;
  let previous = snapshots.get(slug);
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) || 'null');
    if (valid(stored) && (!valid(previous) || stored.count > previous.count)) previous = stored;
  } catch {
    // Storage is best-effort; malformed records do not hide the server count.
  }
  if (count === null && !valid(previous)) return null;
  const snapshot = {
    count: Math.max(count ?? 0, valid(previous) ? previous.count : 0),
    // Revisits and API responses never extend an existing maximum's lifetime.
    expiresAt: valid(previous) ? Math.min(expiresAt, previous.expiresAt) : expiresAt,
  };
  snapshots.set(slug, snapshot);
  try {
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // The in-memory snapshot still protects navigation in this tab.
  }
  return snapshot.count;
}
