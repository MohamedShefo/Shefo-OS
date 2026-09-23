'use client';

import { useState, useTransition } from 'react';
import { importTasks, type TaskImportRow } from '../actions';
import { Button } from '@/components/ui/button';

/** Minimal CSV parser (quoted fields with escapes, header row required). */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const MAX_ROWS = 500;

/**
 * Bounded tasks CSV import: title,description,status,priority,due_date.
 * Client parses + previews; server validates every row and skips invalid ones.
 */
export function ImportTasks() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<TaskImportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFile = async (file: File | undefined) => {
    setError(null);
    setResult(null);
    setRows([]);
    setFileName(null);
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      setError('Only .csv files are accepted');
      return;
    }
    if (file.size > 1024 * 1024) {
      setError('File must be smaller than 1 MB');
      return;
    }
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length < 2) {
      setError('CSV needs a header row plus at least one data row');
      return;
    }
    const header = parsed[0].map((h) => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);
    if (idx('title') === -1) {
      setError('Header must include a "title" column');
      return;
    }
    const mapped: TaskImportRow[] = parsed.slice(1, MAX_ROWS + 1).map((r) => ({
      title: r[idx('title')] ?? '',
      description: idx('description') === -1 ? '' : (r[idx('description')] ?? ''),
      status: idx('status') === -1 ? '' : (r[idx('status')] ?? ''),
      priority: idx('priority') === -1 ? '' : (r[idx('priority')] ?? ''),
      due_date: idx('due_date') === -1 ? '' : (r[idx('due_date')] ?? ''),
    }));
    setRows(mapped);
    setFileName(file.name);
  };

  const handleImport = () => {
    if (rows.length === 0 || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await importTasks(rows);
      if (res.success) {
        setResult(`Imported ${res.imported ?? 0} tasks, skipped ${res.skipped ?? 0}.`);
        setRows([]);
        setFileName(null);
      } else {
        setError(res.error || 'Import failed');
      }
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">Import Tasks (CSV)</h2>
      <p className="text-xs text-muted-foreground">
        Columns: <span className="font-mono">title,description,status,priority,due_date</span>.
        Max {MAX_ROWS} rows · 1 MB. Invalid rows are skipped, never partially saved as bad data —
        every row is validated server-side and filed under your account only.
      </p>
      <label className="block">
        <span className="sr-only">Choose a tasks CSV file</span>
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={isPending}
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
          className="block w-full max-w-xs text-xs text-muted-foreground file:me-2 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted"
        />
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && <p className="text-xs text-muted-foreground">{result}</p>}
      {rows.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            {fileName} · {rows.length} row{rows.length === 1 ? '' : 's'} ready
            {rows.length >= 3 ? ' (showing first 3)' : ''}:
          </p>
          <div className="space-y-1">
            {rows.slice(0, 3).map((r, i) => (
              <p key={i} className="truncate text-xs text-foreground">
                · {r.title || <span className="text-destructive">(missing title — will skip)</span>}
              </p>
            ))}
          </div>
          <Button size="sm" onClick={handleImport} disabled={isPending}>
            {isPending ? 'Importing…' : `Import ${rows.length} rows`}
          </Button>
        </div>
      )}
    </div>
  );
}
