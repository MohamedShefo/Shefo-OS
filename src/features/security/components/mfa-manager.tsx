'use client';

import { useEffect, useState, useTransition } from 'react';
import { createClient } from '@/utils/supabase/client';
import { logSecurityEvent } from '@/features/security/events';
import { Button } from '@/components/ui/button';

interface TotpFactor {
  id: string;
  friendly_name?: string;
  status: string;
}

type EnrollState = {
  factorId: string;
  secret: string;
  uri: string;
  challengeId: string;
} | null;

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20';

/**
 * Native Supabase TOTP MFA management (enroll / verify / unenroll).
 * MFA is opt-in; nothing here forces step-up on login, so no lockout risk.
 */
export function MfaManager() {
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [aal, setAal] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<EnrollState>(null);
  const [code, setCode] = useState('');
  const [friendlyName, setFriendlyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = async () => {
    const supabase = createClient();
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      setFactors(((data?.totp as TotpFactor[]) ?? []).filter((f) => f.status === 'verified'));
      const level = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setAal(level.data?.currentLevel ?? null);
    } catch {
      // MFA unavailable (e.g. no session) — page still renders the rest
    }
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa
      .listFactors()
      .then(({ data }) => {
        setFactors(((data?.totp as TotpFactor[]) ?? []).filter((f) => f.status === 'verified'));
      })
      .catch(() => {
        // MFA unavailable (e.g. no session) — page still renders the rest
      });
    supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .then((level) => {
        setAal(level.data?.currentLevel ?? null);
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const handleEnroll = () => {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: friendlyName.trim() || undefined,
      });
      if (error || !data) {
        setError(error?.message || 'Could not start enrollment');
        return;
      }
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: data.id,
      });
      if (challengeError || !challenge) {
        setError(challengeError?.message || 'Could not create challenge');
        return;
      }
      setEnroll({
        factorId: data.id,
        secret: data.totp.secret,
        uri: data.totp.uri,
        challengeId: challenge.id,
      });
    });
  };

  const handleVerify = () => {
    if (!enroll || !code.trim()) return;
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.verify({
        factorId: enroll.factorId,
        challengeId: enroll.challengeId,
        code: code.trim(),
      });
      if (error) {
        setError(error.message);
        return;
      }
      setEnroll(null);
      setCode('');
      setFriendlyName('');
      await logSecurityEvent('security.mfa_enrolled', {});
      await refresh();
    });
  };

  const handleUnenroll = (factorId: string) => {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        setError(error.message);
        return;
      }
      await logSecurityEvent('security.mfa_removed', {});
      await refresh();
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Two-Factor Authentication
        </h2>
        {aal && (
          <span className="text-[11px] text-muted-foreground">
            Assurance: <span className="font-medium text-foreground">{aal}</span>
          </span>
        )}
      </div>

      {factors.length === 0 && !enroll && (
        <p className="text-xs text-muted-foreground">
          No authenticator enrolled. Add one to protect sensitive actions — it stays optional for
          sign-in.
        </p>
      )}

      {factors.map((f) => (
        <div
          key={f.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-3 text-xs"
        >
          <span className="font-medium text-foreground truncate">
            🔐 {f.friendly_name || 'Authenticator app'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleUnenroll(f.id)}
            disabled={isPending}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive shrink-0"
          >
            Remove
          </Button>
        </div>
      ))}

      {!enroll ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={friendlyName}
            onChange={(e) => setFriendlyName(e.target.value)}
            placeholder="Device name (optional)"
            disabled={isPending}
            className={`${inputClass} text-xs`}
          />
          <Button size="sm" variant="outline" onClick={handleEnroll} disabled={isPending} className="shrink-0">
            {isPending ? 'Starting…' : 'Enroll'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-border/60 p-3">
          <p className="text-xs text-muted-foreground">
            Scan this into your authenticator app (or enter the secret manually), then verify with
            a 6-digit code.
          </p>
          <p className="break-all rounded-md bg-muted p-2 font-mono text-[11px]">{enroll.secret}</p>
          <p className="break-all text-[10px] text-muted-foreground">{enroll.uri}</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              disabled={isPending}
              className={`${inputClass} text-xs max-w-[140px]`}
            />
            <Button size="sm" onClick={handleVerify} disabled={!code.trim() || isPending}>
              {isPending ? 'Verifying…' : 'Verify & Enable'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEnroll(null);
                setCode('');
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
