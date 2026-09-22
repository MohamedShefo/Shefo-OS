'use client';

import { useState, useTransition } from 'react';
import { getExportBundle } from '../actions';
import {
  bundleToJSON,
  bundleToMarkdown,
  downloadFile,
  toCSV,
  type ExportBundle,
} from '../format';
import { Button } from '@/components/ui/button';

export function ExportPanel() {
  const [bundle, setBundle] = useState<ExportBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = () => {
    setError(null);
    startTransition(async () => {
      const res = await getExportBundle();
      if (!res) {
        setError('Could not build the export. Check your connection and try again.');
        return;
      }
      setBundle(res);
    });
  };

  const stamp = () => new Date().toISOString().slice(0, 10);

  const downloadJSON = () => {
    if (!bundle) return;
    downloadFile(`shefo-os-backup-${stamp()}.json`, bundleToJSON(bundle), 'application/json');
  };

  const downloadMarkdown = () => {
    if (!bundle) return;
    downloadFile(`shefo-os-notes-${stamp()}.md`, bundleToMarkdown(bundle), 'text/markdown');
  };

  const downloadCSV = (kind: 'projects' | 'tasks' | 'habits' | 'journal') => {
    if (!bundle) return;
    if (kind === 'projects') {
      downloadFile(
        `shefo-os-projects-${stamp()}.csv`,
        toCSV(bundle.projects, ['id', 'name', 'description', 'status', 'created_at', 'updated_at']),
        'text/csv'
      );
    } else if (kind === 'tasks') {
      downloadFile(
        `shefo-os-tasks-${stamp()}.csv`,
        toCSV(bundle.tasks, ['id', 'title', 'description', 'status', 'priority', 'due_date', 'project_id', 'note_id', 'created_at']),
        'text/csv'
      );
    } else if (kind === 'habits') {
      downloadFile(
        `shefo-os-habits-${stamp()}.csv`,
        toCSV(
          bundle.habits.map((h) => ({ ...h, completions: h.completions.join(';') })),
          ['id', 'name', 'description', 'frequency', 'is_active', 'completions', 'created_at']
        ),
        'text/csv'
      );
    } else {
      downloadFile(
        `shefo-os-journal-${stamp()}.csv`,
        toCSV(bundle.journal, ['id', 'entry_date', 'title', 'content', 'created_at']),
        'text/csv'
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">1 · Load your data</h2>
        <p className="text-xs text-muted-foreground">
          Builds an export bundle from everything you own — projects, notes (with blocks and
          links), tasks, captures, work, skills, journal, and habits. Nothing leaves your browser
          except the download itself.
        </p>
        <Button size="sm" onClick={load} disabled={isPending}>
          {isPending ? 'Loading…' : bundle ? 'Reload Data' : 'Load My Data'}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {bundle && (
          <p className="text-[11px] text-muted-foreground">
            Ready: {bundle.projects.length} projects · {bundle.notes.length} notes ·{' '}
            {bundle.tasks.length} tasks · {bundle.captures.length} captures · {bundle.work.length}{' '}
            workplaces · {bundle.skills.length} skills · {bundle.journal.length} journal entries ·{' '}
            {bundle.habits.length} habits.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">2 · Download</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={downloadJSON} disabled={!bundle} className="justify-start">
            📦 Full backup (JSON)
          </Button>
          <Button size="sm" variant="outline" onClick={downloadMarkdown} disabled={!bundle} className="justify-start">
            📝 Notes bundle (Markdown)
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadCSV('projects')} disabled={!bundle} className="justify-start">
            📁 Projects (CSV)
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadCSV('tasks')} disabled={!bundle} className="justify-start">
            ✅ Tasks (CSV)
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadCSV('habits')} disabled={!bundle} className="justify-start">
            🔁 Habits (CSV)
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadCSV('journal')} disabled={!bundle} className="justify-start">
            📔 Journal (CSV)
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Markdown notes carry stable ids, YAML frontmatter, and [[wikilinks]] — ready for Obsidian
          or Notion import. CSVs open directly in any spreadsheet.
        </p>
      </div>
    </div>
  );
}
