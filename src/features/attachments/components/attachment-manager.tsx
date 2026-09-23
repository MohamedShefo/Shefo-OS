'use client';

import { useState, useTransition } from 'react';
import {
  deleteAttachment,
  getAttachmentDownloadUrl,
  uploadAttachment,
} from '../actions';
import type { Attachment, AttachmentEntity } from '@/types/database';
import { Badge } from '@/components/ui/badge';

interface AttachmentManagerProps {
  entityType: AttachmentEntity;
  entityId: string;
  initialAttachments: Attachment[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentManager({ entityType, entityId, initialAttachments }: AttachmentManagerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFile = (file: File | undefined) => {
    if (!file || isPending) return;
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    startTransition(async () => {
      const res = await uploadAttachment(entityType, entityId, formData);
      if (!res.success) setError(res.error || 'Upload failed');
    });
  };

  const handleDownload = (id: string, fileName: string) => {
    startTransition(async () => {
      const res = await getAttachmentDownloadUrl(id);
      if (res.success && res.url) {
        const a = document.createElement('a');
        a.href = res.url;
        a.download = fileName;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        setError(res.error || 'Could not prepare download');
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteAttachment(id);
      if (!res.success) setError(res.error || 'Could not delete file');
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        Attachments
        <Badge variant="secondary">{initialAttachments.length}</Badge>
      </h3>

      <label className="block">
        <span className="sr-only">Attach a file (max 5 MB, no executables)</span>
        <input
          type="file"
          disabled={isPending}
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
          className="block w-full max-w-xs text-xs text-muted-foreground file:me-2 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted"
        />
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {initialAttachments.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No files attached yet.</p>
      ) : (
        <div className="space-y-1.5">
          {initialAttachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-2.5 text-xs"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">📎 {a.file_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatSize(a.size_bytes)}
                  {a.mime_type ? ` · ${a.mime_type}` : ''} ·{' '}
                  {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownload(a.id, a.file_name)}
                  disabled={isPending}
                  className="text-primary hover:underline"
                >
                  Download
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={isPending}
                  aria-label={`Delete ${a.file_name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  ✕
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
