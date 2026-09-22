'use client';

import { useState, useTransition } from 'react';
import { revokeDevice, trustCurrentDevice } from '../actions';
import type { TrustedDevice } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DevicesManagerProps {
  devices: TrustedDevice[];
  currentHashKnown: boolean;
}

export function DevicesManager({ devices, currentHashKnown }: DevicesManagerProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [trustedNow, setTrustedNow] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleTrust = () => {
    if (!password || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await trustCurrentDevice(password);
      if (res.success) {
        setTrustedNow(true);
        setPassword('');
      } else {
        setError(res.error || 'Could not trust this device');
      }
    });
  };

  const handleRevoke = (id: string) => {
    startTransition(async () => {
      await revokeDevice(id);
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">Trusted Devices</h2>
      <p className="text-xs text-muted-foreground">
        New browsers start untrusted. Confirm your password once to trust this device. Trust is
        based on a per-device secret — never on IP address.
      </p>

      {!currentHashKnown && !trustedNow ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 space-y-2">
          <p className="text-xs font-medium text-foreground">
            This browser is not trusted yet — some sensitive actions may ask for verification.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={isPending}
              autoComplete="current-password"
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/20"
            />
            <Button size="sm" onClick={handleTrust} disabled={!password || isPending}>
              {isPending ? 'Verifying…' : 'Trust Device'}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          ✓ This browser is trusted.{trustedNow ? ' Just now confirmed.' : ''}
        </p>
      )}

      <div className="space-y-2">
        {devices.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No devices recorded yet.</p>
        )}
        {devices.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-3 text-xs"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{d.device_label || 'Unknown device'}</p>
              <p className="text-[11px] text-muted-foreground">
                Last seen {new Date(d.last_seen_at).toLocaleString()}
              </p>
            </div>
            <span className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary">{d.trusted ? 'Trusted' : 'Untrusted'}</Badge>
              <button
                onClick={() => handleRevoke(d.id)}
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive"
              >
                Revoke
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
