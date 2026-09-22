'use client';

import { useState, useTransition, FormEvent } from 'react';
import { createWorkExperience, updateWorkExperience } from '../actions';
import { WorkExperience } from '@/types/database';
import { Button } from '@/components/ui/button';

interface WorkDialogProps {
  work?: WorkExperience | null;
  buttonLabel?: string;
  dialogTitle?: string;
  onSuccess?: () => void;
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20';

export function WorkDialog({
  work = null,
  buttonLabel,
  dialogTitle,
  onSuccess,
}: WorkDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [organization, setOrganization] = useState(work?.organization ?? '');
  const [role, setRole] = useState(work?.role ?? '');
  const [startDate, setStartDate] = useState(work?.start_date ?? '');
  const [endDate, setEndDate] = useState(work?.end_date ?? '');
  const [isCurrent, setIsCurrent] = useState(work?.is_current ?? false);
  const [description, setDescription] = useState(work?.description ?? '');
  const [responsibilities, setResponsibilities] = useState(work?.responsibilities ?? '');
  const [keyPeople, setKeyPeople] = useState(work?.key_people ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!organization.trim() || isPending) return;
    setError(null);

    const payload = {
      organization,
      role: role || null,
      start_date: startDate || null,
      end_date: isCurrent ? null : endDate || null,
      is_current: isCurrent,
      description: description || null,
      responsibilities: responsibilities || null,
      key_people: keyPeople || null,
    };

    startTransition(async () => {
      const res = work
        ? await updateWorkExperience(work.id, payload)
        : await createWorkExperience(payload);
      if (res.success) {
        if (!work) {
          setOrganization('');
          setRole('');
          setStartDate('');
          setEndDate('');
          setIsCurrent(false);
          setDescription('');
          setResponsibilities('');
          setKeyPeople('');
        }
        setIsOpen(false);
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || 'Failed to save workplace');
      }
    });
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="font-medium">
        {buttonLabel ?? '+ New Workplace'}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-lg font-semibold tracking-tight">
            {dialogTitle ?? (work ? 'Edit Workplace' : 'New Workplace')}
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Organization *</label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. Nafea, Acme Corp…"
              required
              disabled={isPending}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Role / Position</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Backend Engineer"
                disabled={isPending}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5 flex items-end pb-2">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                  disabled={isPending}
                  className="h-4 w-4 rounded border-border cursor-pointer"
                />
                Currently working here
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isPending}
                className={`${inputClass} text-xs`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isPending || isCurrent}
                className={`${inputClass} text-xs`}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this workplace about?"
              rows={2}
              disabled={isPending}
              className={`${inputClass} resize-y`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Responsibilities</label>
            <textarea
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              placeholder="What did you own and deliver?"
              rows={3}
              disabled={isPending}
              className={`${inputClass} resize-y`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Key People</label>
            <input
              type="text"
              value={keyPeople}
              onChange={(e) => setKeyPeople(e.target.value)}
              placeholder="People worth remembering…"
              disabled={isPending}
              className={inputClass}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!organization.trim() || isPending}>
              {isPending ? 'Saving…' : work ? 'Save Changes' : 'Add Workplace'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
