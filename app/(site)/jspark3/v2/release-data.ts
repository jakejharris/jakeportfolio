import release from './release.generated.json';

export { release };
export const releasePublished = release.publication_status === 'published';
export function metric(id: string) {
  const row = release.selected_metrics.find(item => item.id === id);
  if (!row) throw new Error(`Missing Tempo metric: ${id}`);
  if (typeof row.value !== 'number') throw new Error(`Tempo chart requires a scalar metric: ${id}`);
  return { ...row, value: row.value };
}

export function metricRange(id: string) {
  const row = release.selected_metrics.find(item => item.id === id);
  if (!row || !Array.isArray(row.value) || row.value.length !== 2) throw new Error(`Tempo range requires two endpoints: ${id}`);
  return { ...row, value: row.value };
}
