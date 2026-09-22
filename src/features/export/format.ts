import type {
  Capture,
  Habit,
  HabitCompletion,
  JournalEntry,
  Note,
  NoteBlock,
  Project,
  Skill,
  Task,
  WorkExperience,
} from '@/types/database';

/**
 * Export formatters (pure functions — no I/O, no framework).
 *
 * - CSV: spreadsheet-compatible (RFC 4180 quoting).
 * - Markdown: one document per note with YAML frontmatter
 *   (stable id, type, tags, links) — Obsidian/Notion import friendly.
 * - JSON: full-fidelity backup with stable identifiers and relations.
 */

export interface ExportBundle {
  exportedAt: string;
  projects: Project[];
  notes: Array<Note & { blocks: NoteBlock[]; linkedTitles: string[] }>;
  tasks: Task[];
  captures: Capture[];
  work: WorkExperience[];
  skills: Skill[];
  journal: JournalEntry[];
  habits: Array<Habit & { completions: string[] }>;
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV<T extends object>(rows: T[], columns: Array<keyof T & string>): string {
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => csvCell((row as Record<string, unknown>)[c])).join(','));
  }
  return lines.join('\n');
}

function yamlScalar(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  const s = String(value);
  return /[:#\n"-]/.test(s) ? JSON.stringify(s) : s;
}

export function noteToMarkdown(note: Note & { blocks: NoteBlock[]; linkedTitles: string[] }): string {
  const lines: string[] = ['---'];
  lines.push(`id: ${note.id}`);
  lines.push(`title: ${yamlScalar(note.title)}`);
  lines.push(`type: ${yamlScalar(note.note_type ?? 'note')}`);
  lines.push(`tags: [${(note.tags ?? []).map((t) => JSON.stringify(t)).join(', ')}]`);
  lines.push(`created: ${note.created_at}`);
  lines.push(`updated: ${note.updated_at}`);
  lines.push('---', '');
  lines.push(`# ${note.title}`, '');

  const blocks = [...note.blocks].sort((a, b) => a.position - b.position);
  if (blocks.length > 0) {
    for (const b of blocks) {
      const text = b.content ?? '';
      if (b.block_type === 'heading') lines.push(`## ${text}`, '');
      else if (b.block_type === 'list')
        for (const line of text.split('\n')) lines.push(`- ${line.replace(/^•\s?/, '')}`);
      else lines.push(text, '');
      if (b.block_type === 'list') lines.push('');
    }
  } else if (note.content) {
    lines.push(note.content, '');
  }

  if (note.linkedTitles.length > 0) {
    lines.push('## Links', '');
    for (const t of note.linkedTitles) lines.push(`- [[${t}]]`);
    lines.push('');
  }
  return lines.join('\n');
}

export function bundleToMarkdown(bundle: ExportBundle): string {
  const parts = [`# Shefo OS Export`, '', `Exported: ${bundle.exportedAt}`, ''];
  for (const note of bundle.notes) {
    parts.push(noteToMarkdown(note));
    parts.push('', '---', '');
  }
  return parts.join('\n');
}

export function bundleToJSON(bundle: ExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function habitCompletionsOf(all: HabitCompletion[], habitId: string): string[] {
  return all.filter((c) => c.habit_id === habitId).map((c) => c.completion_date);
}
