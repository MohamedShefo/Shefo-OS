/**
 * Shared text-matching helper for list-level filters.
 * Lists already fetch their own scoped rows server-side; this only
 * narrows the already-loaded rows on the client (no extra fetching).
 */
export function matchesQuery(haystack: Array<string | null | undefined>, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack.some((field) => (field ?? '').toLowerCase().includes(q));
}
