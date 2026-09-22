'use client';

import { useState, useTransition, FormEvent } from 'react';
import { createTransaction, deleteTransaction } from '../actions';
import type { FinanceTransaction, FinanceType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { SearchField } from '@/components/common/search-field';
import { matchesQuery } from '@/lib/search';
import { formatMoney } from '@/lib/format';
import { todayISO } from '@/lib/date';

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20';

interface FinanceTrackerProps {
  initialTransactions: FinanceTransaction[];
  categories: string[];
  defaultMonth: string;
}

export function FinanceTracker({ initialTransactions, categories, defaultMonth }: FinanceTrackerProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | FinanceType>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState(defaultMonth);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [entryType, setEntryType] = useState<FinanceType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = initialTransactions.filter((t) => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && (t.category ?? '') !== categoryFilter) return false;
    if (monthFilter && !t.transaction_date.startsWith(monthFilter)) return false;
    return matchesQuery([t.description, t.category, t.payment_method], search);
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await createTransaction({
        type: entryType,
        amount: Number(amount),
        transaction_date: date,
        category,
        description,
        payment_method: paymentMethod,
      });
      if (res.success) {
        setAmount('');
        setCategory('');
        setDescription('');
        setPaymentMethod('');
        setDate(todayISO());
        setIsOpen(false);
      } else {
        setError(res.error || 'Failed to save transaction');
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteTransaction(id);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'expense', 'income'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${
                typeFilter === t
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {t === 'all' ? 'All' : t === 'expense' ? 'Expenses' : 'Income'}
            </button>
          ))}
          <span className="flex-1" />
          <Button size="sm" onClick={() => setIsOpen(true)} className="font-medium">
            + New Entry
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            aria-label="Filter by month"
            className="rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
          />
          {monthFilter && (
            <button
              onClick={() => setMonthFilter('')}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Clear month
            </button>
          )}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <SearchField value={search} onChange={setSearch} placeholder="Search entries…" />
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-semibold tracking-tight">New Entry</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEntryType(t)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                      entryType === t
                        ? t === 'expense'
                          ? 'bg-destructive text-white shadow-xs'
                          : 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Amount *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    disabled={isPending}
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    disabled={isPending}
                    className={`${inputClass} text-xs`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Food"
                    disabled={isPending}
                    list="finance-categories"
                    className={inputClass}
                  />
                  <datalist id="finance-categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
                  <input
                    type="text"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    placeholder="e.g. Cash, Card…"
                    disabled={isPending}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What was this for?"
                  disabled={isPending}
                  className={inputClass}
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || !amount}>
                  {isPending ? 'Saving…' : 'Save Entry'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {initialTransactions.length === 0 ? (
        <EmptyState
          title="No transactions yet."
          description='Click "+ New Entry" to log your first income or expense.'
        />
      ) : visible.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          No entries match the selected filters.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3.5 text-xs shadow-xs"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">
                  {t.description || t.category || (t.type === 'income' ? 'Income' : 'Expense')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t.transaction_date}
                  {t.category ? ` · ${t.category}` : ''}
                  {t.payment_method ? ` · ${t.payment_method}` : ''}
                </p>
              </div>
              <span className="flex items-center gap-2 shrink-0">
                <span
                  className={`font-bold tabular-nums ${
                    t.type === 'income' ? 'text-foreground' : 'text-destructive'
                  }`}
                >
                  {t.type === 'income' ? '+' : '−'}
                  {formatMoney(Number(t.amount))}
                </span>
                <Badge variant="secondary" className="capitalize hidden sm:inline-flex">
                  {t.type}
                </Badge>
                <button
                  onClick={() => handleDelete(t.id)}
                  disabled={isPending}
                  aria-label="Delete entry"
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
