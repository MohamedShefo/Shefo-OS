'use client';

import { useState, useTransition, FormEvent } from 'react';
import { changePassword } from '@/features/security/account';
import { Button } from '@/components/ui/button';

export function PasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setError(null);
    setDone(false);
    startTransition(async () => {
      const res = await changePassword(password);
      if (res.success) {
        setPassword('');
        setConfirm('');
        setDone(true);
      } else {
        setError(res.error || 'Could not change password');
      }
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">Change Password</h2>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (min 8 characters)"
          autoComplete="new-password"
          disabled={isPending}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat new password"
          autoComplete="new-password"
          disabled={isPending}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        {done && <p className="text-xs text-muted-foreground">✓ Password changed.</p>}
        <Button type="submit" size="sm" disabled={isPending || !password}>
          {isPending ? 'Saving…' : 'Change Password'}
        </Button>
      </form>
    </div>
  );
}
