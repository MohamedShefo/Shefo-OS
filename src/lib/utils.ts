export { cn } from "cn"

export function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === 'string') {
    return tags
      .replace(/^\{|\}$/g, '')
      .split(',')
      .map((t) => t.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);
  }
  return [];
}
