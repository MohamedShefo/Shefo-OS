'use client';

import { useState, useTransition, KeyboardEvent } from 'react';
import { createCapture } from '../actions';
import { Project } from '@/types/database';
import { Button } from '@/components/ui/button';

interface CaptureInputProps {
  projects?: Project[];
}

export function CaptureInput({ projects = [] }: CaptureInputProps) {
  const [text, setText] = useState('');
  const [projectId, setProjectId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!text.trim() || isPending) return;
    setError(null);

    const textToSubmit = text;
    const projectToSubmit = projectId;
    setText(''); // Instant optimistic clear

    startTransition(async () => {
      const res = await createCapture(textToSubmit, projectToSubmit || null);
      if (!res.success) {
        setText(textToSubmit); // Restore text on error
        setError(res.error || 'Failed to save capture');
      }
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Press Enter (without Shift) to submit fast capture
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="relative rounded-xl border border-border bg-card p-4 shadow-sm transition-all focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          placeholder="Capture a thought, task, or note... (Press Enter to submit)"
          className="w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground min-h-[90px]"
          rows={3}
          autoFocus
        />

        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Enter ↵</kbd>
            <span>Fast capture</span>
            <span className="text-muted-foreground/60">•</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Shift + Enter</kbd>
            <span>New line</span>
          </span>

          <span className="flex items-center gap-2">
            {projects.length > 0 && (
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={isPending}
                className="rounded bg-muted px-2 py-1 text-[11px] font-medium outline-none cursor-pointer border border-border/50 max-w-[140px]"
              >
                <option value="">No Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    📁 {p.name}
                  </option>
                ))}
              </select>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!text.trim() || isPending}
              size="sm"
              className="h-8 px-4 font-medium transition-all"
            >
              {isPending ? 'Capturing...' : 'Capture'}
            </Button>
          </span>
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive px-1">{error}</p>
      )}
    </div>
  );
}
