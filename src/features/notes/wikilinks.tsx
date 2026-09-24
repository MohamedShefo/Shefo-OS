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
