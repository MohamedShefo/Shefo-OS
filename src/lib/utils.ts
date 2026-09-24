export { cn } from "cn"

export function normalizeTags(tags: unknown): string[] {
  const clean = (v: unknown): string | null => {
    const s = String(v).trim();
    return s ? s : null;
  };
  if (Array.isArray(tags)) {
    const out: string[] = [];
    for (const t of tags) {
      const s = clean(t);
      if (s) out.push(s);
    }
    return out;
  }
  if (typeof tags === 'string') {
    const trimmed = tags.trim();
    // JSON-encoded array form (e.g. '["a", "b"]') observed in live rows.
    if (trimmed.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return normalizeTags(parsed);
      } catch {
        // fall through to legacy parsing below
      }
    }
    // Legacy Postgres array-literal form (e.g. '{a,"b c"}').
    return trimmed
      .replace(/^\{|\}$/g, '')
      .split(',')
      .map((t) => t.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);
  }
  return [];
}
