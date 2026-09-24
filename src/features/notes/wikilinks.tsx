import Link from 'next/link';

/**
 * Obsidian-style `[[Title]]` references.
 * Resolves against notes the user can already see (exact title match first,
 * then case-insensitive). Unmatched references render as plain text —
 * nothing is auto-created and no AI is involved.
 */
export function renderWikilinks(text: string, titleToId: Map<string, string>): React.ReactNode {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  if (parts.length === 1) return text;
  const lower = new Map<string, string>();
  for (const [title, id] of titleToId) {
    const key = title.toLowerCase();
    if (!lower.has(key)) lower.set(key, id);
  }
  return parts.map((part, i) => {
    const match = /^\[\[([^\]]+)\]\]$/.exec(part);
    if (!match) return <span key={i}>{part}</span>;
    const raw = match[1].trim();
    const id = titleToId.get(raw) ?? lower.get(raw.toLowerCase());
    if (!id) return <span key={i}>{part}</span>;
    return (
      <Link
        key={i}
        href={`/notes/${id}`}
        className="text-primary hover:underline font-medium"
        title={`Open note: ${raw}`}
      >
        {raw}
      </Link>
    );
  });
}

export function buildTitleMap(notes: Array<{ id: string; title: string }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const n of notes) {
    if (!map.has(n.title)) map.set(n.title, n.id);
  }
  return map;
}

/** Raw `[[Title]]` reference targets found in a text, in order. */
export function extractWikilinks(text: string | null | undefined): string[] {
  if (!text) return [];
  const out: string[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1].trim();
    if (raw) out.push(raw);
  }
  return out;
}

function resolveTitle(
  raw: string,
  titleToId: Map<string, string>,
  lower: Map<string, string>
): string | null {
  return titleToId.get(raw) ?? lower.get(raw.toLowerCase()) ?? null;
}

/**
 * Notes (other than the target) whose content or blocks reference the target
 * title via `[[Title]]`. Deterministic, no new queries — callers pass notes
 * they already loaded. Excludes notes already manually linked when their ids
 * are provided, so backlink lists never duplicate the manual-link lists.
 */
export function findWikilinkBacklinks(
  targetId: string,
  targetTitle: string,
  notes: Array<{ id: string; title: string; content: string | null }>,
  blocksByNote?: Map<string, string[]>,
  excludeIds: Set<string> = new Set()
): Array<{ id: string; title: string }> {
  const wanted = targetTitle.trim().toLowerCase();
  if (!wanted) return [];
  const out: Array<{ id: string; title: string }> = [];
  for (const n of notes) {
    if (n.id === targetId || excludeIds.has(n.id)) continue;
    const haystacks = [n.content ?? '', ...(blocksByNote?.get(n.id) ?? [])];
    const found = haystacks.some((text) =>
      extractWikilinks(text).some((ref) => ref.toLowerCase() === wanted)
    );
    if (found) out.push({ id: n.id, title: n.title });
  }
  return out;
}

/** Outgoing `[[Title]]` references from one note's texts, resolved to ids. */
export function findWikilinkOutgoing(
  ownId: string,
  texts: Array<string | null | undefined>,
  titleToId: Map<string, string>
): Array<{ id: string; title: string }> {
  const lower = new Map<string, string>();
  for (const [title, id] of titleToId) {
    const key = title.toLowerCase();
    if (!lower.has(key)) lower.set(key, id);
  }
  const seen = new Set<string>();
  const out: Array<{ id: string; title: string }> = [];
  for (const text of texts) {
    for (const ref of extractWikilinks(text)) {
      const id = resolveTitle(ref, titleToId, lower);
      if (id && id !== ownId && !seen.has(id)) {
        seen.add(id);
        out.push({ id, title: ref });
      }
    }
  }
  return out;
}
