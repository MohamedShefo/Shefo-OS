'use client';

import { useState, useTransition, FormEvent } from 'react';
import { removeAvatar, updateProfile, uploadAvatar } from '../actions';
import type { Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Avatar } from './avatar';

interface ProfileEditorProps {
  profile: Profile | null;
  email: string | null;
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20';

export function ProfileEditor({ profile, email }: ProfileEditorProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty =
    displayName !== (profile?.display_name ?? '') || username !== (profile?.username ?? '');

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!dirty || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await updateProfile({ display_name: displayName, username });
      if (res.success) {
        setSavedAt(new Date().toLocaleTimeString());
      } else {
        setError(res.error || 'Failed to save profile');
      }
    });
  };

  const handleFile = (file: File | undefined) => {
    if (!file || isPending) return;
    setError(null);
    const formData = new FormData();
    formData.append('avatar', file);
    startTransition(async () => {
      const res = await uploadAvatar(formData);
      if (!res.success) setError(res.error || 'Upload failed');
    });
  };

  const handleRemove = () => {
    if (isPending) return;
    startTransition(async () => {
      const res = await removeAvatar();
      if (!res.success) setError(res.error || 'Could not remove avatar');
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Avatar</h2>
        <div className="flex items-center gap-4">
          <Avatar src={profile?.avatar_url} name={profile?.display_name} email={email} size="lg" />
          <div className="space-y-2">
            <label className="block">
              <span className="sr-only">Upload avatar image</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={isPending}
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="block w-full max-w-[220px] text-xs text-muted-foreground file:me-2 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted"
              />
            </label>
            <p className="text-[11px] text-muted-foreground">PNG, JPEG, WebP or GIF · max 2 MB.</p>
            {profile?.avatar_url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={isPending}
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
              >
                Remove avatar
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <form onSubmit={handleSave} className="space-y-4">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Account</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
                disabled={isPending}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. shefo_dev"
                disabled={isPending}
                className={inputClass}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              value={email ?? ''}
              disabled
              className={`${inputClass} opacity-60`}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center justify-between border-t border-border/50 pt-3">
            <p className="text-[11px] text-muted-foreground">
              {savedAt ? `✓ Saved at ${savedAt}` : dirty ? 'Unsaved changes' : ' '}
            </p>
            <Button type="submit" size="sm" disabled={!dirty || isPending}>
              {isPending ? 'Saving…' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
