'use client';

import { useState, useTransition } from 'react';
import { updateFinanceBalances } from '../actions';
import type { FinanceBalances } from '@/types/database';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';

export function FinanceBalancesCard({ initial }: { initial: FinanceBalances | null }) {
  const [editing, setEditing] = useState(false);
  const [available, setAvailable] = useState(String(initial?.available ?? 0));
  const [frozen, setFrozen] = useState(String(initial?.frozen ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty =
    available !== String(initial?.available ?? 0) || frozen !== String(initial?.frozen ?? 0);

  const openEdit = () => {
    setAvailable(String(initial?.available ?? 0));
    setFrozen(String(initial?.frozen ?? 0));
    setError(null);
    setEditing(true);
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateFinanceBalances({
        available: Number(available),
        frozen: Number(frozen),
      });
      if (res.success) {
        setEditing(false);
      } else {
        setError(res.error || 'Could not save balances');
      }
    });
  };

  const inputClass =
    'w-28 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring/20 tabular-nums';

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Balances</h2>
        {!editing && (
          <Button size="sm" variant="ghost" onClick={openEdit} className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground">
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="text-muted-foreground">
              Available{' '}
              <input
                type="number"
                min={0}
                step="any"
                value={available}
                onChange={(e) => setAvailable(e.target.value)}
                disabled={isPending}
                className={inputClass}
              />
            </label>
            <label className="text-muted-foreground">
              Frozen{' '}
              <input
                type="number"
                min={0}
                step="any"
                value={frozen}
                onChange={(e) => setFrozen(e.target.value)}
                disabled={isPending}
                className={inputClass}
              />
            </label>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={!dirty || isPending} className="h-7 text-[11px]">
              {isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={isPending}
              className="h-7 px-2 text-[11px] text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Available / Fixed Money</p>
            <p className="text-xl font-bold tabular-nums">{formatMoney(initial?.available ?? 0)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Frozen / Held Money</p>
            <p className="text-xl font-bold tabular-nums">{formatMoney(initial?.frozen ?? 0)}</p>
          </div>
        </div>
      )}
    </section>
  );
}
